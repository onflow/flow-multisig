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
import { format } from 'date-fns'; // Make sure to install and import date-fns
import { AccountItem } from "../components/AccountItem";
import { TransactionItem } from "../components/TransactionItem";

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
  const [copiedAddress, setCopiedAddress] = useState(null);

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
    
    // Deduplicate by signatureRequestId to prevent duplicate React keys
    const uniqueSignableIds = Array.from(
      new Map(signableIds.map(item => [item.signatureRequestId, item])).values()
    );
    
    const allPending = uniqueSignableIds.filter((t) => !t.sig);
    const now = new Date();
    const fifteenMinutes = 15 * 60 * 1000;
    const fifteenMinutesAgo = new Date(now - fifteenMinutes);
    const pending = allPending.filter((t) => new Date(t.created_at) > fifteenMinutesAgo);

    const signed = uniqueSignableIds.filter((t) => !!t.sig);
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
        // Deduplicate accounts by address+keyId to prevent duplicate React keys
        const uniqueAccounts = Array.from(
          new Map(accts.accounts.map(a => [`${a.address}${a.keyId}`, a])).values()
        );
        setAccounts(uniqueAccounts || []);
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


  const handleTxSelect = useCallback((tx) => {
    setSelectedTx(tx);
    // Here you would typically fetch more details about the transaction if needed
  }, []);

  const formatDate = (dateString) => {
    return format(new Date(dateString), 'MMM-dd-yyyy');
  };

  console.log("signedTxs", signedTxs);
  console.log("pendingTxs", pendingTxs);
  
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
        <div className="w-1/4 bg-gray-100 p-4 flex flex-col overflow-y-auto">
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
                  <AccountItem 
                    key={`${acct.address}${acct.keyId}`}
                    account={acct}
                    network={network}
                  />
                ))
              )}
            </div>
          </div>

          {/* Pending Transactions */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Pending</h2>
            <div className="bg-white rounded shadow p-2 h-36 overflow-y-auto">
              {pendingTxs.length === 0 && !loading ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500 text-sm">No pending transactions</p>
                </div>
              ) : (
                <>
                  {pendingTxs.map((tx) => (
                    <TransactionItem
                      key={`${tx.signatureRequestId}-${tx.keyId}`}
                      transaction={tx}
                      selectedTx={selectedTx}
                      handleTxSelect={handleTxSelect}
                      network={network}
                      className={`w-full text-left p-2 mb-2 rounded text-sm ${
                        tx === selectedTx ? 'bg-blue-100' : 'hover:bg-gray-100'
                      }`}
                    />
                  ))}
                  {loading && (
                    <div className="text-center py-2">
                      <p className="text-gray-500 text-sm">Loading...</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Signed Transactions */}
          <div className="flex-grow">
            <h2 className="text-lg font-semibold mb-2">Signed</h2>
            <div className="bg-white rounded shadow p-2 h-full overflow-y-auto">
              {signedTxs.length === 0 ? (
                <p className="text-gray-500 text-sm">No signed transactions</p>
              ) : (
                signedTxs.map((s) => (
                  <TransactionItem
                    key={`${s.signatureRequestId}-${s.keyId}`}
                    transaction={s}
                    selectedTx={selectedTx}
                    handleTxSelect={handleTxSelect}
                    className={`w-full text-left p-2 mb-2 rounded text-sm ${
                      s === selectedTx ? 'bg-blue-100' : 'hover:bg-gray-100'
                    }`}
                  />
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right content area */}
        <div className="w-3/4 bg-white p-6 overflow-y-auto">
          {selectedTx ? (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Transaction Details</h2>
              <p className="mb-2">Signature Request ID: {selectedTx.signatureRequestId}</p>
              <p className="mb-2">Address: {selectedTx.address}</p>
              <p className="mb-2">Key ID: {selectedTx.keyId}</p>
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
            <p className="text-gray-500 text-center mt-10">Select a transaction to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
