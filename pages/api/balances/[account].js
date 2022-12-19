import * as fcl from '@onflow/fcl';
import * as t from '@onflow/types';
import { send as httpSent } from '@onflow/transport-http';

const TOP_SHOTS = `
import TopShot from 0xTOPSHOT

// Print the NFTs owned by account 0x01.
pub fun main(account: Address): [UInt64] {
    let acct = getAccount(account)

    let collectionRef = acct
      .getCapability<
        &TopShot.Collection{TopShot.MomentCollectionPublic}
      >(
        /public/MomentCollection
      )
      .borrow() ?? panic("Could not borrow Reference to MomentCollectionPublic for specified Address ")

    return collectionRef.getIDs()
}
`;

const NFL_ALLDAY = `
import AllDay from 0xNFLALLDAY

// Print the NFTs owned by account 0x01.
pub fun main(account: Address): [UInt64] {
    let acct = getAccount(account)

    let collectionRef = acct
      .getCapability<
        &AllDay.Collection{AllDay.MomentNFTCollectionPublic}
      >(
        AllDay.CollectionPublicPath
      )
      .borrow() ?? panic("Could not borrow Reference to MomentNFTCollectionPublic for specified Address ")

    return collectionRef.getIDs()
}
`;

const mainnet = {
  'accessNode.api': 'https://rest-mainnet.onflow.org',
  'discovery.wallet': 'https://fcl-ledger-multisig.vercel.app/mainnet/authn',
  'sdk.transport': httpSent,
  '0xFUNGIBLETOKENADDRESS': '0xf233dcee88fe0abe',
  '0xFLOWTOKENADDRESS': '0x1654653399040a61',
  '0xTOPSHOT': '0x0b2a3299cc857e29',
  '0xNFLALLDAY': '0xe4cf4bdc1751c65d',
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
      let topshots = '0';
      let allday = '0';
      let error = '';
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
        error = String(e);
      }
      try {
        const moments = await fcl.decode(
          await fcl.send([
            fcl.script(TOP_SHOTS),
            fcl.args([fcl.arg(account, t.Address)]),
          ]),
        );
        topshots = moments ? moments.length : 0;

        const all_day_moments = await fcl.decode(
          await fcl.send([
            fcl.script(NFL_ALLDAY),
            fcl.args([fcl.arg(account, t.Address)]),
          ]),
        );
        allday = all_day_moments ? all_day_moments.length : 0;
      } catch (e) {
        console.log(e);
        error = String(e);
      }
      return res.status(200).json({
        data: {
          flow,
          contracts,
          topshots,
          allday,
        },
      });

    default:
      return res.status(405);
  }
}
