import * as fcl from "@onflow/fcl";

const wait = async (period = 3000) =>
  new Promise((resolve) => setTimeout(resolve, period));

/**
 * 
 * @param {*} account 
 * @param {*} keys | {index: number}
 * @param {*} dispatch 
 * @returns 
 */
export const authzResolver = (account, keys, dispatch) => {
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
        console.log('signable', JSON.stringify(signable))
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
          const data = await fetch(
            `/api/signatures/${signable.addr}/${signable.keyId}/${id}`
          ).then((r) => r.json());

          dispatch({
            type: "update-composite-key",
            data,
          });

          if (data.sig)
            return {
              addr: fcl.withPrefix(data.address),
              keyId: data.keyId,
              signature: data.sig,
            };
        }
      },
      resolve: null,
    }))
  }
}

}
export const buildAuthz = ({ address, index }, dispatch) => {
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

        // Check status and update UI with status here.
        while (true) {
          await wait();
          const data = await fetch(
            `/api/signatures/${signable.addr}/${signable.keyId}/${id}`
          ).then((r) => r.json());

          dispatch({
            type: "update-composite-key",
            data,
          });

          if (data.sig)
            return {
              addr: fcl.withPrefix(data.address),
              keyId: data.keyId,
              signature: data.sig,
            };
        }
      },
    };
  };
};
