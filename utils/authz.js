import * as fcl from "@onflow/fcl";

const wait = async (period = 1000) =>
  new Promise((resolve) => setTimeout(resolve, period));

const isTriggerSend = async (id) => {
  try {
    const resp = await fetch(`/api/${id}/confirmation`).then((r) => r.json());
    return resp?.triggered || false;
  } catch (error) {
    console.error('[isTriggerSend] Failed to check trigger status:', error);
    return false;
  }
};

// Fetch signature status with error handling
const fetchSignatureStatus = async (id) => {
  try {
    const result = await fetch(`/api/${id}`).then((r) => r.json());
    return result?.data || [];
  } catch (error) {
    console.error('[fetchSignatureStatus] Failed to fetch status:', error);
    return [];
  }
};

// Global registration state to prevent duplicate registrations across resolvers
const globalRegistrationState = {
  inProgress: {},  // address -> Promise
  completed: {},   // address -> signatureRequestId
};

/**
 * Clear the global registration state.
 * Call this when starting a new transaction or clicking "Start Over".
 */
export const clearRegistrationState = () => {
  console.log('[clearRegistrationState] Clearing global registration state');
  globalRegistrationState.inProgress = {};
  globalRegistrationState.completed = {};
};

// Fetch with timeout to prevent silent hangs
const fetchWithTimeout = async (url, options, timeoutMs = 120000) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs / 1000} seconds`);
    }
    throw error;
  }
};

/**
 * Register all keys using the batch API.
 * Uses global state to prevent duplicate registrations.
 * Returns the signatureRequestId.
 */
const registerAllKeysBatch = async (address, keys, signable) => {
  const normalizedAddress = fcl.sansPrefix(address);
  
  // Check if registration already completed for this address
  if (globalRegistrationState.completed[normalizedAddress]) {
    console.log(`[registerAllKeysBatch] Using cached signatureRequestId for ${normalizedAddress}`);
    return globalRegistrationState.completed[normalizedAddress];
  }
  
  // Check if registration is already in progress
  if (globalRegistrationState.inProgress[normalizedAddress]) {
    console.log(`[registerAllKeysBatch] Waiting for in-progress registration for ${normalizedAddress}`);
    return globalRegistrationState.inProgress[normalizedAddress];
  }
  
  console.log(`[registerAllKeysBatch] Registering ${keys.length} keys for address ${normalizedAddress}`);
  
  const keysData = keys.map(k => ({
    keyId: k.index,
    publicKey: k.publicKey,
  }));

  // Create the registration promise and store it
  const registrationPromise = (async () => {
    const response = await fetchWithTimeout('/api/signatures/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        signable,
        keys: keysData,
        address: normalizedAddress,
      }),
    }, 60000); // 60 second timeout (compression makes this much faster)

    const result = await response.json();
    
    // Handle partial success (207) - some keys may have failed but we can continue
    if (response.status === 207) {
      console.warn(`[registerAllKeysBatch] Partial success: ${result.warning}`);
      // Continue with the signatureRequestId even if some keys failed
    } else if (!response.ok) {
      // Clear in-progress state on failure so retry is possible
      delete globalRegistrationState.inProgress[normalizedAddress];
      throw new Error(result.error || `Failed to register keys: HTTP ${response.status}`);
    }

    console.log(`[registerAllKeysBatch] Successfully registered ${result.keysRegistered} keys, signatureRequestId: ${result.signatureRequestId?.slice(0, 8)}...`);
    
    // Cache the result
    globalRegistrationState.completed[normalizedAddress] = result.signatureRequestId;
    delete globalRegistrationState.inProgress[normalizedAddress];
    
    return result.signatureRequestId;
  })();
  
  globalRegistrationState.inProgress[normalizedAddress] = registrationPromise;
  
  return registrationPromise;
};

/**
 * Creates authorization resolver for multiple keys.
 * The first signing function to be called will register ALL keys.
 * Other signing functions will wait for registration and then poll.
 */
export const authzManyKeyResolver = (account, proposerKeyId, keys, dispatch) => {
  console.log(`[authzManyKeyResolver] Setting up resolver for ${keys.length} keys:`, keys.map(k => k.index));
  
  const keysWeight = keys.reduce((p, k) => ({ ...p, [k.index]: k.weight }), {});
  
  // Shared state for all signing functions
  const sharedState = {
    signatureRequestId: null,
    registrationPromise: null,
    registrationStarted: false,
  };
  
  return {
    ...account,
    addr: fcl.sansPrefix(account.address),
    address: fcl.sansPrefix(account.address),
    resolve: (account) => {
      console.log(`[authzManyKeyResolver] resolve() called - creating ${keys.length} signing accounts`);
      
      return keys.map(({ index, publicKey }) => ({
        ...account,
        addr: fcl.sansPrefix(account.address),
        address: fcl.sansPrefix(account.address),
        tempId: `${account.address}-${index}`,
        keyId: index,
        signingFunction: async (signable) => {
          console.log(`[signingFunction] Key ${index} called`);
          
          dispatch({
            type: "in-flight",
            data: { inFlight: true },
          });

          // First signing function registers ALL keys
          if (!sharedState.registrationStarted) {
            sharedState.registrationStarted = true;
            console.log(`[signingFunction] Key ${index} is FIRST - registering all ${keys.length} keys`);
            
            // Add public key to signable for this key
            signable.publicKey = publicKey;
            
            sharedState.registrationPromise = registerAllKeysBatch(
              signable.addr,
              keys,
              signable
            ).then(id => {
              sharedState.signatureRequestId = id;
              return id;
            });
          }
          
          // Wait for registration to complete
          try {
            await sharedState.registrationPromise;
          } catch (error) {
            console.error(`[signingFunction] Key ${index} - registration failed:`, error);
            throw error;
          }

          const signatureRequestId = sharedState.signatureRequestId;
          if (!signatureRequestId) {
            throw new Error(`No signatureRequestId available for key ${index}`);
          }

          console.log(`[signingFunction] Key ${index} polling with signatureRequestId: ${signatureRequestId?.slice(0, 8)}...`);

          // Update UI with all keys
          keys.forEach(k => {
            dispatch({
              type: "update-composite-key",
              data: {
                address: signable.addr,
                sig: null,
                keyId: k.index,
                weight: keysWeight[k.index],
                signatureRequestId,
              },
            });
          });

          // Poll for signatures
          let pollAttempts = 0;
          const maxPollAttempts = 600;
          
          while (pollAttempts < maxPollAttempts) {
            await wait();
            pollAttempts++;
            
            const data = await fetchSignatureStatus(signatureRequestId);

            if (data && data.length > 0) {
              data.forEach(d => {
                dispatch({
                  type: "update-composite-key",
                  data: {
                    address: signable.addr,
                    sig: d.sig,
                    keyId: d.keyId,
                    weight: keysWeight[d.keyId],
                    signatureRequestId,
                  },
                });
              });
              
              const weights = data.reduce((p, d) => d.sig ? p + parseInt(keysWeight[d.keyId]) : p, 0);
              const proposerSigned = data.find(d => d.keyId === proposerKeyId);
              const doSend = await isTriggerSend(signatureRequestId);
              
              if (weights >= 1000 && proposerSigned?.sig && doSend) {
                const sigKey = data.find(d => d.keyId === index);
                if (sigKey) {
                  console.log(`[signingFunction] Key ${index} returning signature`);
                  return {
                    addr: fcl.withPrefix(sigKey.address),
                    keyId: sigKey.keyId,
                    signature: sigKey.sig,
                  };
                }
              }
            }
          }
          
          throw new Error(`Polling timeout for key ${index} after ${maxPollAttempts} attempts`);
        },
        resolve: null,
      }));
    }
  };
};

/**
 * Creates authorization for the proposer key.
 * Uses the same shared state pattern as authzManyKeyResolver.
 */
export const buildSinglaAuthz = ({ address, index }, proposerKeyId, keys, dispatch, sharedStateFromResolver) => {
  console.log(`[buildSinglaAuthz] Setting up proposer authz for key ${index}`);
  
  const keysWeight = keys.reduce((p, k) => ({ ...p, [k.index]: k.weight }), {});
  
  return async function authz(account) {
    console.log(`[buildSinglaAuthz] authz() called for proposer key ${index}`);
    
    return {
      ...account,
      addr: fcl.sansPrefix(address),
      keyId: Number(index),
      signingFunction: async (signable) => {
        console.log(`[buildSinglaAuthz] Proposer key ${index} signing function called`);
        
        dispatch({
          type: "in-flight",
          data: { inFlight: true },
        });

        // If sharedState is provided, use it (registration already handled by resolver)
        // Otherwise, we need to register here
        let signatureRequestId;
        
        if (sharedStateFromResolver?.signatureRequestId) {
          signatureRequestId = sharedStateFromResolver.signatureRequestId;
          console.log(`[buildSinglaAuthz] Using existing signatureRequestId: ${signatureRequestId?.slice(0, 8)}...`);
        } else if (sharedStateFromResolver?.registrationPromise) {
          // Wait for registration to complete
          await sharedStateFromResolver.registrationPromise;
          signatureRequestId = sharedStateFromResolver.signatureRequestId;
        } else {
          // No shared state - register all keys here
          console.log(`[buildSinglaAuthz] Proposer registering all ${keys.length} keys`);
          const publicKey = keys.find(k => k.index === signable.keyId)?.publicKey;
          signable.publicKey = publicKey;
          signatureRequestId = await registerAllKeysBatch(signable.addr, keys, signable);
        }

        if (!signatureRequestId) {
          throw new Error(`No signatureRequestId available for proposer key ${index}`);
        }

        // Update UI with all keys
        keys.forEach(k => {
          dispatch({
            type: "update-composite-key",
            data: {
              address: signable.addr,
              sig: null,
              keyId: k.index,
              weight: keysWeight[k.index],
              signatureRequestId,
            },
          });
        });

        // Poll for signatures
        let pollAttempts = 0;
        const maxPollAttempts = 600;
        
        while (pollAttempts < maxPollAttempts) {
          await wait();
          pollAttempts++;
          
          const data = await fetchSignatureStatus(signatureRequestId);

          if (data && data.length > 0) {
            data.forEach(d => {
              dispatch({
                type: "update-composite-key",
                data: {
                  address: signable.addr,
                  sig: d.sig,
                  keyId: d.keyId,
                  weight: keysWeight[d.keyId],
                  signatureRequestId,
                },
              });
            });
            
            const weights = data.reduce((p, d) => d.sig ? p + parseInt(keysWeight[d.keyId]) : p, 0);
            if (weights >= 1000) {
              const sigKey = data.find(d => d.keyId === index);
              const proposerSigned = data.find(d => d.keyId === proposerKeyId);
              const doSend = await isTriggerSend(signatureRequestId);
              
              if (sigKey && proposerSigned?.sig && doSend) {
                console.log(`[buildSinglaAuthz] Proposer key ${index} returning signature`);
                return {
                  addr: fcl.withPrefix(sigKey.address),
                  keyId: sigKey.keyId,
                  signature: sigKey.sig,
                };
              }
            }
          }
        }
        
        throw new Error(`Polling timeout for proposer key ${index} after ${maxPollAttempts} attempts`);
      },
    };
  };
};
