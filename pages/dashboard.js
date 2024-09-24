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
  const [selectedTx, setSelectedTx] = useState(null);
  const [network, setNetwork] = useState(MAINNET);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [publicKey, setPublicKey] = useState(null);
  const [walletType, setWalletType] = useState(GCP_WALLET);
  const [user, setUser] = useState({ loggedIn: null });

  useEffect(() => {
    SetupFclConfiguration(fcl, network);
  }, [network]);

  useEffect(() => {
    const unsubscribe = fcl.currentUser.subscribe(setUser);
    return () => {
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
    const now = new Date();
    const fifteenMinutes = 15 * 60 * 1000;
    const fifteenMinutesAgo = new Date(now - fifteenMinutes);
    const pending = allPending.filter((t) => new Date(t.created_at) > fifteenMinutesAgo);

    const signed = signableIds.filter((t) => !!t.sig);
    setLoading(false);
    return { pending, signed };
  }, []);

  useEffect(() => {
    const polling = setInterval(() => {
      if (publicKey) {
        lookUpSignableTransactions(publicKey).then(({ pending, signed }) => {
          setPendingTxs(pending);
          setSignedTxs(signed);
        });
      }
    }, 5000);
    return () => {
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

    console.log('accounts', accounts)
    accountInfos = [...accountInfos, ...accounts];
    return { accounts: accountInfos, publicKey };
  }, [user, network]);

  useEffect(() => {
    const fetchAccounts = async () => {
      if (!network || !user?.loggedIn) return;
      if (user?.addr) {
        setLoadingAccounts(true);
        const accts = await processUserAccounts(user);
        if (!accts) {
          setLoadingAccounts(false);
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
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Flow Multisig Dashboard</h1>
          <div className="flex items-center space-x-4">
            <select
              className="bg-blue-700 text-white px-3 py-1 rounded"
              value={network}
              onChange={(e) => pickNetwork(e.target.value)}
            >
              {networks.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            {!publicKey ? (
              <button className="bg-white text-blue-600 px-4 py-2 rounded" onClick={() => login()}>
                Log In
              </button>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="text-sm">Public Key: {abbrvKey(publicKey)}</span>
                <button className="bg-red-500 text-white px-4 py-2 rounded" onClick={() => logout()}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left sidebar */}
        <div className="w-1/6 bg-gray-100 p-4 flex flex-col overflow-y-auto">
          {/* Accounts */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Accounts</h2>
            <div className="bg-white rounded shadow p-2 max-h-32 overflow-y-auto">
              {loadingAccounts ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : accounts.length === 0 ? (
                <p className="text-gray-500 text-sm">No accounts</p>
              ) : (
                accounts.map((acct) => (
                  <div key={`${acct.address}${acct.keyId}`} className="text-sm mb-2 flex flex-col">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{abbrvKey(acct.address, 6)}</span>
                      <span className="text-xs bg-gray-200 rounded px-1 py-0.5">Weight: {acct.weight}</span>
                    </div>
                    <div className="text-xs text-gray-500">Key ID: {acct.keyId}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pending Transactions */}
          <div className="mb-6 flex-grow">
            <h2 className="text-lg font-semibold mb-2">Pending</h2>
            <div className="bg-white rounded shadow p-2 h-full overflow-y-auto">
              {loading ? (
                <p className="text-gray-500 text-sm">Loading...</p>
              ) : pendingTxs.length === 0 ? (
                <p className="text-gray-500 text-sm">No pending</p>
              ) : (
                pendingTxs.map((tx) => (
                  <button
                    key={tx.signatureRequestId}
                    className={`w-full text-left p-1 mb-1 rounded text-sm ${
                      tx === selectedTx ? 'bg-blue-100' : 'hover:bg-gray-100'
                    }`}
                    onClick={() => setSelectedTx(tx)}
                  >
                    {abbrvKey(tx.signatureRequestId, 4)}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Signed Transactions */}
          <div>
            <h2 className="text-lg font-semibold mb-2">Signed</h2>
            <div className="bg-white rounded shadow p-2 max-h-32 overflow-y-auto">
              {signedTxs.length === 0 ? (
                <p className="text-gray-500 text-sm">No signed</p>
              ) : (
                signedTxs.map((s) => (
                  <div key={s.signatureRequestId} className="text-sm mb-1">
                    {abbrvKey(s.signatureRequestId, 4)}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right content area */}
        <div className="w-5/6 bg-white p-6 overflow-y-auto">
          {selectedTx ? (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Transaction Details</h2>
              <p className="mb-2">Created: {formatDate(selectedTx.created_at)}</p>
              <AddressKeyView {...selectedTx} />
              <div className="mb-4">
                <span className="font-semibold">Request ID:</span> {abbrvKey(selectedTx.signatureRequestId)}
              </div>
              <MessageLink
                link={getCliCommand(selectedTx.signatureRequestId)}
                message="FLOW CLI"
                bg="bg-gray-200"
              />
              <ViewTransactionInfo {...selectedTx} />
              {!selectedTx.sig && (
                <SignOauthGcpTransaction {...selectedTx} />
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center mt-10">Select a pending transaction to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
