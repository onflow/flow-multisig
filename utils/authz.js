import * as fcl from "@onflow/fcl";

const wait = async (period = 3000) =>
  new Promise((resolve) => setTimeout(resolve, period));

export const authzManyKeyResolver = ({ address }, keys, dispatch) => {
  const keysWeight = keys.reduce((p, k) => ({ ...p, [k.index]: k.weight }), {});
  console.log('auth account', account)
  return {
    addr: fcl.sansPrefix(address),
    address: fcl.sansPrefix(address),
    resolve: (account) => {
      return keys.map(({ index }) => ({
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
              if (weights >= 1000) {
                const sigKey = data.find(d => d.keyId === index);
                const sig = {
                  addr: fcl.withPrefix(sigKey.address),
                  keyId: sigKey.keyId,
                  signature: sigKey.sig,
                };
                console.log('auth sig', sig)
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

export const buildProperAuthz = ({ address, index }, dispatch) => {
  return async function authz(account) {
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

        while (true) {
          await wait();

          const data = await fetch(
            `/api/pending/rlp/${id}/proposer`
          ).then((r) => r.json());

          if (data?.sig) {
            console.log('proposer sig', data.sig);
            const sigHex = data.sig.toString("hex");
            console.log('sig hex', sigHex);
            return ({
              addr: fcl.withPrefix(address),
              keyId: index,
              signature: data.sig,
            })
          }
        }
      },
    };
  };
};
