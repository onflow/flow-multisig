import * as fcl from '@onflow/fcl';
import { send as httpSent } from '@onflow/transport-http';

const TOP_SHOTS = `
import TopShot from 0xTOPSHOT


`;
const mainnet = {
  'accessNode.api': 'https://rest-mainnet.onflow.org',
  'discovery.wallet': 'https://fcl-ledger-multisig.vercel.app/mainnet/authn',
  'sdk.transport': httpSent,
  '0xFUNGIBLETOKENADDRESS': '0xf233dcee88fe0abe',
  '0xFLOWTOKENADDRESS': '0x1654653399040a61',
  '0xTOPSHOT': '0x0b2a3299cc857e29',
  'app.detail.icon':
    'https://flow-multisig-git-service-account-onflow.vercel.app/icon.png',
  'app.detail.title': 'Multisig Webapp',
};

export default async function handler({ body, method, query }, res) {
  fcl.config({ ...mainnet });
  switch (method) {
    case 'GET':
      const { account } = query;
      if (!account) {
        return res.status(404).json({
          error: 'Account address missing',
        });
      }
      let flow = '0';
      let contracts = '0';
      try {
        const acct = await fcl.account(account);
        contracts = acct.contracts?.names?.length
          ? acct.contracts?.names?.length
          : 0;
        if (!acct) {
          return res.status(404).json({
            error: 'Invalid account address',
          });
        }
        flow = String(acct.balance / 1e8);
      } catch (e) {
        console.log(e);
        return res.status(500).json({
          error: `${e}`,
        });
      }
      return res.status(200).json({
        data: {
          flow,
          contracts,
        },
      });

    default:
      return res.status(405);
  }
}
