import * as fcl from "@onflow/fcl";

const wait = async (period = 1000) =>
  new Promise((resolve) => setTimeout(resolve, period));

const isTriggerSend = async (id) => {
  const resp = await fetch(
    `/api/${id}/confirmation`).then((r) => r.json());
  return resp?.triggered || false
}
export const authzManyKeyResolver = (account, proposerKeyId, keys, dispatch) => {
  const keysWeight = keys.reduce((p, k) => ({ ...p, [k.index]: k.weight }), {});
  return {
    ...account,
    addr: fcl.sansPrefix(account.address),
    address: fcl.sansPrefix(account.address),
    resolve: (account) => {
      return keys.map(({ index, publicKey }) => ({
        ...account,
        addr: fcl.sansPrefix(account.address),
        address: fcl.sansPrefix(account.address),
        tempId: `${account.address}-${index}`,
        keyId: index,
        signingFunction: async (signable) => {
          dispatch({
            type: "in-flight",
            data: {
              inFlight: true
            },
          });
          // set public key to be sent to backend
          signable.publicKey = publicKey;
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
              const weights = data.reduce((p, d) => d.sig ? p + parseInt(keysWeight[d.keyId]) : p, 0);
              // has proposer signed
              const proposerSigned = data.find(d => d.keyId === proposerKeyId);
              const doSend = await isTriggerSend(id)
              console.log('doSend single tx', id.slice(0,5), 'keyId', sigKey.keyId, doSend)

              if (weights >= 1000 && proposerSigned.sig && doSend) {
                const sigKey = data.find(d => d.keyId === index);
                const sig = {
                  addr: fcl.withPrefix(sigKey.address),
                  keyId: sigKey.keyId,
                  signature: sigKey.sig,
                };
                return sig;
              }
            }
          }
        },
        resolve: null,
      }))
    }
  }

}

export const buildSinglaAuthz = ({ address, index }, proposerKeyId, keys, dispatch) => {
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

        // save public key to backend
        const publicKey = keys.find(k => k.index === signable.keyId)?.publicKey
        console.log('publickey', publicKey, keys, signable.keyId)
        signable.publicKey = publicKey;
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
            const weights = data.reduce((p, d) => (d.sig ? p + parseInt(keysWeight[d.keyId]) : p), 0);
            if (weights >= 1000) {
              const sigKey = data.find(d => d.keyId === index);
              // has proposer signed
              const proposerSigned = data.find(d => d.keyId === proposerKeyId);
              const doSend = await isTriggerSend(id)
              console.log('doSend single tx', id.slice(0,5), "proposer keyId", proposerKeyId, doSend)

              if (sigKey && proposerSigned.sig && doSend) {
                return ({
                  addr: fcl.withPrefix(sigKey.address),
                  keyId: sigKey.keyId,
                  signature: sigKey.sig,
                })
              }
            }
          }
        }
      },
    };
  };
};
