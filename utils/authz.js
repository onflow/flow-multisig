import * as fcl from "@onflow/fcl";

const wait = async (period = 3000) =>
  new Promise((resolve) => setTimeout(resolve, period));

export const buildAuthz = ({ address, index }, dispatch) => {
  return async function authz(account) {
    return {
      ...account,
      addr: fcl.sansPrefix(address),
      keyId: Number(index),
      signingFunction: async (signable) => {
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

        dispatch({
          type: "update-signature-request-id",
          data: id,
        });

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
