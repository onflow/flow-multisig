import React, { useEffect, useState, useCallback } from "react";
import * as fcl from "@onflow/fcl";
import {
  GetPublicKeyAccounts,
  SetupFclConfiguration,
} from "../utils/configurations";
import {
  getPrimaryPublicKeys,
  getUserAccount,
  getUserAccountKeyId,
} from "../utils/accountHelper";
import { abbrvKey, formatDate } from "../utils/formatting";
import { ViewTransactionInfo } from "../components/ViewTransactionInfo";
import { SignOauthGcpTransaction } from "../components/SignOauthGcpTransaction";
import { AddressKeyView } from "../components/AddressKeyView";
import { fetchSignableRequestIds, getCliCommand } from "../utils/kmsHelpers";
import { MessageLink } from "../components/MessageLink";
import { LOCAL, MAINNET, TESTNET, GCP_WALLET } from "../utils/constants";

const networks = [MAINNET, TESTNET, LOCAL];

export default function Dashboard() {
  const [pendingTxs, setPendingTxs] = useState([]);
  const [signedTxs, setSignedTxs] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null); //"496e6c78f2b421de25ede8b240df781273f7fe1177e2d071d06d46c27b6c4564");
  const [network, setNetwork] = useState(MAINNET);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [walletType, setWalletType] = useState(GCP_WALLET);
  const [user, setUser] = useState({ loggedIn: null });

  useEffect(() => {
    console.log('Setting up FCL configuration');
    SetupFclConfiguration(fcl, network);
  }, [network]);

  useEffect(() => {
    console.log('Subscribing to current user');
    const unsubscribe = fcl.currentUser.subscribe(setUser);
    return () => {
      console.log('Unsubscribing from current user');
      unsubscribe();
    };
  }, []);
 

  const lookUpSignableTransactions = useCallback(async (publicKey) => {
    let signableIds = [];
    setLoading(true);
    const items = await fetchSignableRequestIds(publicKey);
    const requests = items?.data.map((i) => ({ ...i }));

    signableIds = [...signableIds, ...(requests || [])];
    const allPending = signableIds.filter((t) => !t.sig);
    // filter out old pending signables. 15 minutes older than now, time is in UTC
    // example created_at: "2024-04-23T23:01:54.934342+00:00"
    const now = new Date();
    const fifteenMinutes = 15 * 60 * 1000;
    const fifteenMinutesAgo = new Date(now - fifteenMinutes);
    const pending = allPending.filter((t) => new Date(t.created_at) > fifteenMinutesAgo);

    console.log("pending", allPending, "valid", pending);

    const signed = signableIds.filter((t) => !!t.sig);
    setLoading(false);
    return { pending, signed };
  }, []);

  
  useEffect(() => {
    console.log('Setting up polling interval');
    const polling = setInterval(() => {
      if (publicKey) {
        console.log('Polling for signable transactions');
        lookUpSignableTransactions(publicKey).then(({ pending, signed }) => {
          setPendingTxs(pending);
          setSignedTxs(signed);
        });
      }
    }, 5000);
    return () => {
      console.log('Clearing polling interval');
      clearInterval(polling);
    };
  }, [publicKey, lookUpSignableTransactions]);

  const processUserAccounts = useCallback(async (user) => {
    const address = user.addr;
    if (!address) return;

    const loggedInUserKeyId = await getUserAccountKeyId(user);
    if (loggedInUserKeyId === "" || loggedInUserKeyId === undefined) return;

    const acctWithKeys = await getUserAccount(address);
    let accountInfos = [];
    const publicKey = getPrimaryPublicKeys(acctWithKeys, loggedInUserKeyId);
    const accounts = await GetPublicKeyAccounts(network, publicKey);
    accountInfos = [...accountInfos, ...accounts];
    return { accounts: accountInfos, publicKey };
  }, [user, network]);

  useEffect(() => {
    console.log('Fetching accounts');
    const fetchAccounts = async () => {
      if (!network || !user?.loggedIn) return;
      if (user?.addr) {
        setLoadingAccounts(true);
        const accts = await processUserAccounts(user);
        if (!accts) {
          setLoadingAccounts(false);
          console.log("no accounts");
          return;
        } 
        setPublicKey(accts.publicKey);
        setAccounts([...accts.accounts] || []);
        const { pending, signed } = await lookUpSignableTransactions(
          accts.publicKey
        );
        setPendingTxs(pending);
        setSignedTxs(signed);
        setLoadingAccounts(false);
      }
    };
    fetchAccounts();
  }, [user, network, processUserAccounts, lookUpSignableTransactions]);

  const pickNetwork = async (network) => {
    setAccounts([]);
    setNetwork(network);
  };

  const logout = async () => {
    fcl.unauthenticate();
    setPublicKey(null);
    setAccounts([]);
    setSignedTxs([]);
    setPendingTxs([]);
    setSelectedTx(null);
  };
  const login = async () => {
    try {
      fcl.unauthenticate();
      fcl.authenticate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="m-1 h-[99vh] overflow-y-hidden">
      <div className="grid grid-rows-[50px_10%_30%_1fr] grid-cols-[1fr_6fr] gap-1 h-full text-gray-700 font-bold">
        <div className="bg-blue-100 p-2 col-span-2">
          <div className="flex items-center">
            <select
              className="w-32 text-sm p-1 mr-2"
              value={network}
              onChange={(e) => pickNetwork(e.target.value)}
            >
              {networks.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {!publicKey ? (
              <button className="text-sm px-2 py-1 bg-blue-500 text-white rounded" onClick={() => login()}>
                Log In
              </button>
            ) : (
              <div className="flex items-center">
                <button className="text-sm px-2 py-1 bg-blue-500 text-white rounded mr-2" onClick={() => logout()}>
                  Logout
                </button>
                <p className="text-xs">
                  Public Key: {abbrvKey(publicKey)} ({walletType})
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="bg-blue-100 p-2">
          <div className="p-4 h-full overflow-auto">
            <h2 className="bg-green-100 p-1 text-sm text-center">
              ACCOUNTS {loadingAccounts && <span className="animate-spin">⟳</span>}
            </h2>
            {accounts.length === 0 && <p className="p-2 text-sm">---</p>}
            {accounts.map((acct) => (
              <div key={`${acct.address}${acct.keyId}`} className="flex justify-between">
                <span className="text-sm">{abbrvKey(acct.address, 6)}</span>
                <span className="text-sm">{acct.keyId}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-blue-100 p-2">
          <div className="p-4 h-full overflow-auto">
            <h2 className="bg-green-100 p-1 text-sm text-center">
              PENDING {loading && <span className="animate-spin">⟳</span>}
            </h2>
            {pendingTxs.length === 0 && <p className="p-2 text-sm">---</p>}
            {publicKey && pendingTxs.length > 0 && pendingTxs.map((tx) => (
              <button
                key={tx}
                className={`w-full text-left py-1 ${tx === selectedTx ? 'bg-gray-300 cursor-not-allowed' : 'bg-white hover:bg-gray-100'}`}
                disabled={tx === selectedTx}
                onClick={() => setSelectedTx(tx)}
              >
                {abbrvKey(tx.signatureRequestId, 5)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-blue-100 p-2 row-span-3">
          {user?.addr && selectedTx !== null && (
            <div className="p-2 space-y-2">
              <p className="bg-green-100 p-1">{formatDate(selectedTx.created_at)}</p>
              <AddressKeyView {...selectedTx} />
              <div className="flex items-baseline">
                <span className="text-xs pr-0.5">RequestId:</span>
                <span>{abbrvKey(selectedTx.signatureRequestId)}</span>
              </div>
              <MessageLink
                link={getCliCommand(selectedTx.signatureRequestId)}
                message={"FLOW CLI"}
                bg="none"
              />
              <ViewTransactionInfo {...selectedTx} />
              {selectedTx && !selectedTx.sig && (
                <SignOauthGcpTransaction {...selectedTx} />
              )}
            </div>
          )}
        </div>
        <div className="bg-blue-100 p-2 overflow-y-scroll">
          <div className="h-[50vh] overflow-auto p-4">
            <h2 className="bg-green-100 p-1 text-sm text-center">SIGNED</h2>
            {signedTxs.length === 0 && <p className="p-2 text-sm">---</p>}
            {user?.addr && signedTxs.length > 0 && signedTxs.map((s) => (
              <button
                key={s}
                className="w-full text-left py-1 bg-white hover:bg-gray-100"
                onClick={() => setSelectedTx(s)}
              >
                {abbrvKey(s.signatureRequestId, 5)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
