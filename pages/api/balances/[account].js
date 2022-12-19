import * as fcl from "@onflow/fcl";

export default async function handler({ body, method, query }, res) {
  switch (method) {
    case "GET":
        const { account } = query;
        if (!account) {
            return res.status(404).json({
                error: 'Account address missing'
            })
        }
        let flow = "0";
        try {
            const acct = await fcl
            .account(authAccountAddress)
            if (!acct) {
                return res.status(404).json({
                    error: 'Invalid account address'
                })
            }
            flow = String(acct.balance / 1e8);

        } catch(e) {
          console.log(e);
          return res.status(500).json({
            error: `${e}`
        })
        };
      return res.status(200).json({
        data: {
            flow
        },
      });

    default:
      return res.status(405);
  }
}
