import * as fcl from "@onflow/fcl";

const wait = async (period = 3000) =>
  new Promise((resolve) => setTimeout(resolve, period));

export const authzResolver = (account, keys, dispatch) => {
  const keysWeight = keys.reduce((p, k) => ({ ...p, [k.index]: k.weight }), {});
  return {
    ...account,
    addr: fcl.sansPrefix(account.address),
    address: fcl.sansPrefix(account.address),
    resolve: (account) => {
      console.log('trying to resolve ...', keys)
      return keys.map(({ index }) => ({
        ...account,
        addr: fcl.sansPrefix(account.address),
        address: fcl.sansPrefix(account.address),
        tempId: `${account.address}-${index}`,
        signingFunction: async (signable) => {
          dispatch({
            type: "in-flight",
            data: {
              inFlight: true
            },
          });
          console.log('signable addr keyId', signable.addr, signable.keyId)
          const { id } = await fetch(
            `/api/signatures/${signable.addr}/${signable.keyId}`,
            {
              method: "post",
              body: JSON.stringify(signable),
              headers: {
                "Content-Type": "application/json",
              },
            }
          ).then((r) => r.json());
  
          // Check status and update UI with status here.
          while (true) {
            await wait();
            const { data } = await fetch(
              `/api/${id}`
            ).then((r) => r.json());
  
            console.log('from server ', data)
            data.forEach(d => {
              dispatch({
                type: "update-composite-key",
                data: {
                  address: signable.addr,
                  sig: d.sig,
                  keyId: d.keyId,
                  weight: keysWeight[d.keyId],
                  signatureRequestId: id,
                },
              });  
            })
            if (data?.length > 0) {
              const weights = data.reduce((p, d) => (d.sig ? p + parseInt(keysWeight[d.keyId]) : 0), 0);
              console.log('have sig weight', weights);
              if (weights >= 1000) {
                const sigs = data.map(d => ({
                  addr: fcl.withPrefix(d.address),
                  keyId: d.keyId,
                  signature: d.sig,
                }))
                console.log('more signatures ', sigs)
                return sigs;
              }
            }
          }
        },
        resolve: null,
      }))
    }
  }

}

export const buildAuthz = ({ address, index }, keys, dispatch) => {
  console.log('return authz for:', address, index);
  return async function authz(account) {
    const keysWeight = keys.reduce((p, k) => ({ ...p, [k.index]: k.weight }), {});
    return {
      ...account,
      addr: fcl.sansPrefix(address),
      keyId: Number(index),
      signingFunction: async (signable) => {
        dispatch({
          type: "in-flight",
          data: {
            inFlight: true
          },
        });
        console.log('signable addr keyId', signable.addr, signable.keyId)
        const { id } = await fetch(
          `/api/signatures/${signable.addr}/${signable.keyId}`,
          {
            method: "post",
            body: JSON.stringify(signable),
            headers: {
              "Content-Type": "application/json",
            },
          }
        ).then((r) => r.json());

        // Check status and update UI with status here.
        while (true) {
          await wait();
          const { data } = await fetch(
            `/api/${id}`
          ).then((r) => r.json());

          console.log('from server ', data)
          data.forEach(d => {
            dispatch({
              type: "update-composite-key",
              data: {
                address: signable.addr,
                sig: d.sig,
                keyId: d.keyId,
                signatureRequestId: id,
                weight: keysWeight[d.keyId]
              },
            });  
          })
          if (data?.length > 0) {
            const weights = data.reduce((p, d) => (d.sig ? p + parseInt(keysWeight[d.keyId]) : 0), 0);
            console.log('have sig weight', weights);
            if (weights >= 1000) {
              console.log('use first signature')
              const sigOne = data[0];
              return ({
                addr: fcl.withPrefix(sigOne.address),
                keyId: sigOne.keyId,
                signature: sigOne.sig,
              })
            }
          }
        }
      },
    };
  };
};
