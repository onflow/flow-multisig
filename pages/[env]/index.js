import React, { useEffect, useReducer, useState } from "react";
import * as fcl from "@onflow/fcl";
import { useRouter } from "next/router";

if (typeof window !== "undefined") window.fcl = fcl;
import {
  getServiceAccountFileList,
  getFoundationFileList,
  getServiceAccountFilename,
  getFoundationFilename,
} from "../../utils/cadenceLoader";
import {
  LedgerCadenceTransactions,
  LedgerTransactionNames,
  TRANSFERESCROW,
} from "../../utils/payloads";
import { getCliCommand } from "../../utils/kmsHelpers";
import { CountdownTimer } from "../../components/CountdownTimer";
import { MessageLink } from "../../components/MessageLink";
import { KeysTableStatus } from "../../components/KeysTableStatus";
import { KeysTableSelector } from "../../components/KeysTableSelector";
import { authzManyKeyResolver, buildSinglaAuthz } from "../../utils/authz";
import { CopyToClipboard } from "react-copy-to-clipboard";

const flowscanUrls = {
  mainnet: "https://flowscan.org/transaction",
  testnet: "https://testnet.flowscan.org/transaction",
};
const cleanAddress = (address) => address.replace("0x", "");

function upsert(array, element) {
  const i = array.findIndex(
    (_element) =>
      _element.keyId === element.keyId && _element.address === element.address
  );
  if (i > -1) array[i] = element;
  else array.push(element);
  return array;
}

const initialState = {
  compositeKeys: [],
  signatureRequestId: "",
  inFlightRequests: {},
  inFlight: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "in-flight":
      return {
        ...state,
        inFlight: action.data.inFlight,
      };
    case "update-composite-key":
      if (!state.inFlightRequests[action.data.address]) {
        state.inFlightRequests[action.data.address] = {};
      }
      const signatureRequestId = action.data.signatureRequestId;
      const relevantRequest =
        state.inFlightRequests[action.data.address][
          action.data.signatureRequestId
        ] || [];

      return {
        ...state,
        inFlight: false,
        signatureRequestId,
        inFlightRequests: {
          ...state.inFlightRequests,
          [action.data.address]: {
            [action.data.signatureRequestId]: upsert(
              relevantRequest,
              action.data
            ),
          },
        },
      };

    default:
      throw new Error();
  }
}

const FOUNDATION = "foundation";
const SERVICE_ACCOUNT = "serviceAccount";
const LEDGER = "ledger";
const TAB_NAMES = [SERVICE_ACCOUNT, FOUNDATION]; // remove LEDGER from tab names
const MAX_ALLOWED_BLOCKS = 600;
const SECONDS_PER_BLOCK = 1;
const SEND_TX_BUTTON = "Send Transaction";

export default function MainPage() {
  const router = useRouter();

  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [authAccountAddress, setAuthAccountAddress] = useState("");
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [serviceAccountFilenames, setServiceAccountFilenames] = useState([]);
  const [foundationFilenames, setFoundationFilenames] = useState([]);
  const [jsonArgs, setJsonArgs] = useState("[]");
  const [cadencePayload, setCadencePayload] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [exeEffort, setExeEffort] = useState(9999);
  const [accountBalance, setAccountBalance] = useState(null);
  const [scriptName, setScriptName] = useState("");
  const [scriptType, setScriptType] = useState("");
  const [selectedProposalKey, setProposalKey] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [transaction, setTransaction] = useState(null);
  const [txWaiting, setTxWaiting] = useState(false);
  const [eventButtonText, setEventButtonText] = useState("show");
  const [transactionErrorMessage, setTransactionErrorMessage] = useState(null);
  const [sendButtonText, setSendButtonText] = useState(SEND_TX_BUTTON);
  const [generating, setGenerating] = useState(false);
  const [copiedText, setCopiedText] = useState("");

  const isLedgerDisabled = true; // Set this to true to disable the Ledger tab

  useEffect(() => {
    getServiceAccountFileList()
      .then((result) => {
        console.log("Service account file list received", result);
        setServiceAccountFilenames(result);
      })
      .catch((error) => {
        console.error("Error fetching service account file list", error);
      });
    return () => {};
  }, []);

  useEffect(() => {
    getFoundationFileList()
      .then((result) => {
        console.log("Foundation file list received", result);
        setFoundationFilenames(result);
      })
      .catch((error) => {
        console.error("Error fetching foundation file list", error);
      });
    return () => {};
  }, []);

  const { query } = useRouter();
  const qp = new URLSearchParams(query);

  useEffect(() => {
    console.log("Effect running for query changes", query);
    const fromScript = qp.get("type");
    const namedScript = qp.get("name");
    const jsonParam = qp.get("param");
    const userAccount = qp.get("acct");
    const exeLimit = qp.get("limit");

    if (exeLimit) {
      setExeEffort(parseInt(exeLimit));
    }

    if (fromScript) {
      if (fromScript.toLocaleLowerCase() === FOUNDATION) {
        if (namedScript) {
          fetchFoundationFilename(namedScript);
          setScriptName(namedScript);
          setScriptType(FOUNDATION);
        }
      } else if (fromScript.toLocaleLowerCase() === LEDGER) {
        if (namedScript) {
          setLedgerTransaction(namedScript);
          setScriptName(namedScript);
          setScriptType(LEDGER);
        }
      } else {
        if (namedScript) {
          fetchServiceAccountFilename(namedScript);
          setScriptName(namedScript);
          setScriptType(SERVICE_ACCOUNT);
        }
      }
    }
    if (jsonParam) {
      setJsonArgs(jsonParam);
    }
    if (userAccount) {
      validateAccount(userAccount);
      addAuthAccountAddress();
    }
    return () => {};
  }, [query]);

  const addAuthAccountAddress = () => {
    if (authAccountAddress) {
      fcl
        .account(authAccountAddress)
        .then(({ keys }) => {
          setAccounts({
            ...accounts,
            [authAccountAddress]: {
              keys: keys.filter((k) => !k.revoked),
              enabledKeys: [],
              link: null,
              flowScanUrl: null,
            },
          });
        })
        .catch((err) => {
          console.log("unexpected error occured", err);
        });
    }
  };

  const validateAccount = (authAccountAddress) => {
    setIsOpen(false);
    setAuthAccountAddress(authAccountAddress);
    setError(null);
    if (authAccountAddress !== "") {
      fcl
        .account(authAccountAddress)
        .then((acct) => {
          // used to test account validity get account balance
          console.log("acct", acct);
          if (acct) {
            const bal = acct.balance / 1e8;
            setAccountBalance(bal);
          }
        })
        .catch((e) => {
          // only log out error
          console.log(e);
          setError("Invalid Account Address");
        });
    }
  };

  const onSubmit = async (accountKey) => {
    setGenerating(true);
    const account = accounts[accountKey];
    const keys = account.keys;
    if (selectedProposalKey === null) {
      return;
    }
    // selected key is proposer
    const proposalKey = account.keys.find(
      (k) => k.index === selectedProposalKey
    );
    if (!proposalKey) {
      console.log("proposalKey is null, exiting");
      return;
    }

    const userDefinedArgs = jsonArgs ? JSON.parse(jsonArgs) : [];
    const authorizations = [
      authzManyKeyResolver(
        { address: accountKey },
        proposalKey.index,
        keys,
        dispatch
      ),
    ];
    const resolver = authzManyKeyResolver(
      { address: accountKey },
      proposalKey.index,
      keys,
      dispatch
    );
    const resolveProposer = buildSinglaAuthz(
      { address: accountKey, ...proposalKey },
      proposalKey.index,
      keys,
      dispatch
    );

    setCountdown(
      new Date().getTime() + MAX_ALLOWED_BLOCKS * SECONDS_PER_BLOCK * 1000
    );
    let tx = null;
    try {
      tx = await fcl
        .send([
          fcl.transaction(cadencePayload),
          fcl.args(userDefinedArgs.map((a) => fcl.arg(a, fcl.t.Identity))),
          //fcl.args([fcl.arg("100.000000", t.UFix64), fcl.arg(fcl.withPrefix("0xc590d541b72f0ac1"), t.Address)]),
          //       fcl.args([fcl.arg(transferAmount || "0.0", t.UFix64), fcl.arg(fcl.withPrefix(toAddress), t.Address)]),
          fcl.proposer(resolveProposer),
          fcl.authorizations(authorizations),
          fcl.payer(resolver),
          fcl.limit(parseInt(exeEffort)),
          (ix) => {
            console.log(ix);
            return ix;
          },
        ])
        .catch((e) => {
          console.log("transaction error", e);
          setTransactionErrorMessage(e);
          setGenerating(false);
        })
        .finally(() => {
          setGenerating(false);
        });

      console.log("transactionId", tx?.transactionId);
      account.transaction = tx?.transactionId;
      if (tx?.transactionId) setCountdown(0);

      setAccounts({
        ...accounts,
        [accountKey]: account,
      });
    } catch (e) {
      console.log("transaction error", e);
      setTransactionErrorMessage(e);
      setGenerating(false);
    }

    setTxWaiting(true);
    let transaction = null;
    try {
      if (tx?.transactionId) {
        transaction = await fcl.tx(tx?.transactionId).onceSealed();
        if (transaction?.errorMessage) {
          setTransactionErrorMessage(transaction.errorMessage);
        }
      }
    } catch (e) {
      console.error(e);
      setTransactionErrorMessage(e);
      setSendButtonText(SEND_TX_BUTTON); // revert button text on error
      setGenerating(false);
    } finally {
      setTxWaiting(false);
    }

    if (transaction) setTransaction(transaction);
  };

  const getNetwork = () => {
    let network = "mainnet";
    if (window.location.href.indexOf("testnet") > -1) network = "testnet";
    return network;
  };

  const getFormUrlLink = () => {
    const network = getNetwork();
    const url = `${window.location.origin}/${network}?type=${scriptType}&name=${scriptName}&param=${jsonArgs}&acct=${authAccountAddress}&limit=${exeEffort}`;
    return encodeURI(url);
  };

  const getOauthPageLink = (signatureRequestId) => {
    const network = getNetwork();
    const url = `${window.location.origin}/${network}/oauth/${signatureRequestId}`;
    return url;
  };

  const getLedgerPageLink = (signatureRequestId) => {
    const network = getNetwork();
    const url = `${window.location.origin}/${network}/ledger/${signatureRequestId}`;
    return url;
  };

  const getFlowscanLink = (tx) => {
    const network = getNetwork();
    return `${flowscanUrls[network]}/${tx}`;
  };

  const getPlaceHolderArgs = (filename) => {
    console.log("filename", filename);
    // case statement on filename and return string
    switch (filename) {
      case "lockedTokenTransfer.cdc":
      case "unlockTokens.cdc":
        return `[{"type": "Address","value": "ADDRESS"},{"type": "UFix64","value": "AMOUNT"}]`;
      case "transferFLOW.cdc":
        return `[{"type": "UFix64","value": "AMOUNT"},{"type": "Address","value": "ADDRESS"}]`;
      case TRANSFERESCROW:
        return `[{"type": "UFix64","value": "AMOUNT"}, {"type": "Address", "value": "TO"}, {"type": "Address","value": "CONTRACT_ADDRESS"}, {"type": "Address","value": "CONTRACT_NAME"}]`;
      default:
        return "[]";
    }
  };
  const fetchServiceAccountFilename = (filename) => {
    setScriptName(filename);
    setScriptType(SERVICE_ACCOUNT);
    setCadencePayload("loading ...");
    getServiceAccountFilename(filename).then((contents) => {
      setCadencePayload(contents);
      // set placeholder json args
      setArgumentsValue(getPlaceHolderArgs(filename));
    });
  };

  const fetchFoundationFilename = (filename) => {
    setScriptName(filename);
    setScriptType(FOUNDATION);
    setCadencePayload("loading ...");
    getFoundationFilename(filename).then((contents) => {
      setCadencePayload(contents);
      // set placeholder json args
      setArgumentsValue(getPlaceHolderArgs(filename));
    });
  };

  const setLedgerTransaction = (name) => {
    setScriptName(name);
    setScriptType(LEDGER);
    setCadencePayload(LedgerCadenceTransactions[name]);
    setArgumentsValue(getPlaceHolderArgs(name));
  };

  const setArgumentsValue = (value) => {
    // test if value json
    setJsonArgs(value);
    let errorString = "";
    try {
      JSON.parse(value);
    } catch (e) {
      errorString = e.toString();
    }
    setJsonError(errorString);
  };

  const getDropdownOptions = (filenames, scriptName, isSelected) => {
    return filenames.map((filename) => {
      const selected = filename === scriptName ? "selected" : "";
      if (selected && isSelected)
        return (
          <option key={filename} value={filename} selected>
            {filename}
          </option>
        );
      else
        return (
          <option key={filename} value={filename}>
            {filename}
          </option>
        );
    });
  };

  const showHideEvents = () => {
    if (eventButtonText === "hide") setEventButtonText("show");
    else setEventButtonText("hide");
  };

  const enoughSignatures = (keys) => {
    const total = keys.reduce(
      (p, k) => (k.sig ? p + parseInt(k.weight) : p),
      0
    );
    const result = total >= 1000;
    return result;
  };

  const sendTransaction = async () => {
    setSendButtonText("Attempting Sending Transaction ...");
    const signatureRequestId = state?.signatureRequestId;
    let isSent = false;
    // attempt to trigger sending transaction
    while (!isSent) {
      await fetch(`/api/${signatureRequestId}/confirmation`, {
        method: "post",
        body: signatureRequestId,
      }).then((r) => r.json());

      const value = await fetch(`/api/${signatureRequestId}/confirmation`).then(
        (r) => r.json()
      );

      isSent = value?.triggered || false;
      console.log("Confirmation value", value?.triggered);
    }

    setTimeout(() => setSendButtonText("Transaction Sent"), 600);
  };

  const handleCopy = (text, label) => {
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const CopyLink = ({ text, label, isUrl = true }) => (
    <div className="flex space-x-2">
      <CopyToClipboard text={text} onCopy={() => handleCopy(text, label)}>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded ">
          {copiedText === label ? "Copied!" : "Copy"}
        </button>
      </CopyToClipboard>
      {isUrl && (
        <a href={text} target="_blank" rel="noopener noreferrer">
          <button className="bg-green-500 hover:bg-green-700 text-white font-medium py-2 px-4 rounded">
            Navigate to {label}
          </button>
        </a>
      )}
      {!isUrl && <p className="text-sm items-center justify-center">{label}</p>}
    </div>
  );

  return (
    <div className="min-h-screen m-12">
      <div>
        <div className="space-y-6">
          <div>
            <div className="flex flex-col items-start">
              <h1 className="text-2xl font-bold">Multisig Webapp</h1>
            </div>
          </div>
          <div className="mt-8 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {TAB_NAMES.map((name, index) => (
                <button
                  key={name}
                  className={`${
                    TAB_NAMES.indexOf(scriptType) === index
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm transition duration-150 ease-in-out ${
                    name === LEDGER && isLedgerDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  onClick={() =>
                    name !== LEDGER || !isLedgerDisabled
                      ? setScriptType(name)
                      : null
                  }
                  disabled={name === LEDGER && isLedgerDisabled}
                >
                  {name === SERVICE_ACCOUNT
                    ? "Service Account"
                    : name === FOUNDATION
                    ? "Foundation"
                    : "Ledger (v0.13.0)"}
                </button>
              ))}
            </nav>
          </div>
          <div>
            {scriptType === SERVICE_ACCOUNT && (
              <div className="flex items-center">
                <label className="w-1/5 text-sm" htmlFor="serviceAccount">
                  From Service Account
                </label>
                <select
                  id="serviceAccount"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  onChange={(e) => fetchServiceAccountFilename(e.target.value)}
                >
                  <option value="">Select Cadence</option>
                  {getDropdownOptions(
                    serviceAccountFilenames,
                    scriptName,
                    scriptType === SERVICE_ACCOUNT
                  )}
                </select>
              </div>
            )}
            {scriptType === FOUNDATION && (
              <div className="flex items-center">
                <label className="w-1/5 text-sm" htmlFor="foundation">
                  From Foundation
                </label>
                <select
                  id="foundation"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  onChange={(e) => fetchFoundationFilename(e.target.value)}
                >
                  <option value="">Select Cadence</option>
                  {getDropdownOptions(
                    foundationFilenames,
                    scriptName,
                    scriptType === FOUNDATION
                  )}
                </select>
              </div>
            )}
            {scriptType === LEDGER && (
              <div className="flex items-center">
                <label className="w-1/5 text-sm" htmlFor="ledger">
                  From Ledger
                </label>
                <select
                  id="ledger"
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  onChange={(e) => setLedgerTransaction(e.target.value)}
                >
                  <option value="">Select Cadence</option>
                  {getDropdownOptions(
                    LedgerTransactionNames,
                    scriptName,
                    scriptType === LEDGER
                  )}
                </select>
              </div>
            )}
          </div>
          <div>
            <div>
              <label
                htmlFor="cadenceScript"
                className="block text-sm font-medium text-gray-700"
              >
                Cadence Script
              </label>
              <textarea
                id="cadenceScript"
                className="mt-1 w-full h-32 p-2 border border-gray-300 rounded-md resize-vertical bg-white text-black"
                placeholder="Enter your Cadence script here"
                value={cadencePayload}
                onChange={(e) => setCadencePayload(e.target.value)}
              />
            </div>
          </div>
          <div>
            <input
              className="w-full p-2 border border-gray-300 rounded-md"
              id="arguments"
              placeholder="Enter json arguments"
              onChange={(e) => setArgumentsValue(e.target.value)}
              value={jsonArgs}
            />
            <p className="text-red-500">{jsonError}</p>
          </div>
          <div className="space-y-6">
            <div>
              <div
                className={`${
                  error ? "border-red-500" : "border-gray-300"
                } border rounded-md p-4`}
              >
                <div className="flex items-baseline">
                  <p className="font-semibold">Multisig Account Address</p>
                  {scriptType === LEDGER && (
                    <p className="text-sm">
                      {accountBalance ? `${accountBalance} FLOW` : ""}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  <button
                    className={`p-2 rounded ${
                      error || !authAccountAddress
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-700 text-white font-semibold rounded"
                    }`}
                    onClick={addAuthAccountAddress}
                    disabled={error || !authAccountAddress}
                  >
                    Add Account
                  </button>
                  <div className="flex items-center space-x-2">
                    <input
                      className="w-full p-2 border border-gray-300 rounded-md"
                      id="account"
                      placeholder="Enter Authorized Account"
                      onChange={(e) => validateAccount(e.target.value)}
                      value={authAccountAddress}
                    />
                    {!isOpen && (
                      <button
                        className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded"
                        onClick={() => setIsOpen(true)}
                      >
                        {"=>"}
                      </button>
                    )}
                    {isOpen && (
                      <select
                        className="w-full p-2 border border-gray-300 rounded-md"
                        placeholder="Known Accounts"
                        onChange={(e) => validateAccount(e.target.value)}
                      >
                        <option value="0x47fd53250cc3982f">
                          0x47fd53250cc3982f
                        </option>
                        <option value="0x9178260195652f85">
                          0x9178260195652f85
                        </option>
                      </select>
                    )}
                  </div>
                </div>
                {error && <p className="text-red-500">{error}</p>}
              </div>
            </div>
            <div>
              {Object.keys(accounts).map((account) => {
                return (
                  <React.Fragment key={account}>
                    <div>
                      <div className="flex items-baseline">
                        <label className="font-semibold">
                          Select Proposal Key
                        </label>
                        <p>{account}</p>
                      </div>
                      <div>
                        <KeysTableSelector
                          keys={accounts[account].keys}
                          selectedKey={selectedProposalKey}
                          setKey={setProposalKey}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <label
                          className="whitespace-nowrap py-4 font-semibold"
                          htmlFor="executeLimit"
                        >
                          Execution Limit:
                        </label>
                        <input
                          className="w-full p-2 border border-gray-300 rounded-md"
                          id="executeLimit"
                          placeholder="Enter Execute Limit"
                          onChange={(e) => setExeEffort(e.target.value)}
                          value={exeEffort}
                        />
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-gray-100 p-4 rounded-md">
                        <CopyLink text={getFormUrlLink()} label="Page URL" />
                        {state.inFlightRequests?.[cleanAddress(account)] &&
                          Object.entries(
                            state.inFlightRequests[cleanAddress(account)]
                          ).map(([signatureRequestId]) => (
                            <React.Fragment key={signatureRequestId}>
                              {scriptType === LEDGER && !isLedgerDisabled && (
                                <CopyLink
                                  text={getLedgerPageLink(signatureRequestId)}
                                  label="Ledger URL"
                                />
                              )}
                            </React.Fragment>
                          ))}
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          className={`text-white font-semibold rounded p-2 ${
                            generating ||
                            selectedProposalKey === null ||
                            state.inFlightRequests?.[cleanAddress(account)]
                              ? "bg-gray-300 cursor-not-allowed"
                              : "bg-blue-500 hover:bg-blue-700"
                          }`}
                          onClick={() => onSubmit(account)}
                          disabled={
                            generating ||
                            selectedProposalKey === null ||
                            state.inFlightRequests?.[cleanAddress(account)]
                          }
                        >
                          Generate Link
                        </button>
                        {accounts[account].transaction && (
                          <a
                            href={getFlowscanLink(
                              accounts[account].transaction
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`${
                              txWaiting
                                ? "bg-pink-500"
                                : "bg-blue-500 hover:bg-blue-700"
                            } text-white font-semibold py-2 px-4 rounded`}
                          >
                            {txWaiting ? "TX Processing" : "Transaction"}
                          </a>
                        )}
                        {!state.inFlightRequests?.[cleanAddress(account)] &&
                          state.inFlight && (
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gray-900"></div>
                          )}
                      </div>
                      {Object.entries(
                        state.inFlightRequests?.[cleanAddress(account)] || {}
                      ).map(([signatureRequestId, compositeKeys], i) => (
                        <div key={signatureRequestId}>
                          {signatureRequestId && (
                            <div className="bg-gray-100 p-4 rounded-md">
                              <CopyLink
                                text={getOauthPageLink(signatureRequestId)}
                                label="OAuth URL"
                              />
                              {scriptType === LEDGER && (
                                <MessageLink
                                  disabled={isLedgerDisabled}
                                  link={getLedgerPageLink(signatureRequestId)}
                                  message={"Ledger page URL"}
                                  subMessage={
                                    "** only Ledger specific tx are supported **"
                                  }
                                />
                              )}
                            </div>
                          )}
                          <div
                            key={`${signatureRequestId}-${i}`}
                            className="border border-gray-300 rounded-md p-4"
                          >
                            <div className="flex items-center">
                              <p className="text-lg font-semibold">
                                Signature Request Id:
                              </p>
                              <p className="text-sm">{signatureRequestId}</p>
                            </div>

                            <div className="bg-gray-100 p-4 rounded-md">
                              <CopyLink
                                text={getCliCommand(signatureRequestId)}
                                label="FLOW CLI Command"
                                isUrl={false}
                              />
                            </div>
                            <CountdownTimer endTime={countdown} />
                            <p className="text-lg font-semibold">
                              Incoming Signatures:
                            </p>
                            <KeysTableStatus
                              keys={compositeKeys}
                              account={accounts[account]}
                            />
                            <button
                              className={`w-1/2 p-2 my-4 text-white font-semibold rounded ${
                                !enoughSignatures(compositeKeys)
                                  ? "bg-gray-300 cursor-not-allowed"
                                  : "bg-blue-500 hover:bg-blue-700"
                              }`}
                              onClick={() => sendTransaction()}
                              disabled={!enoughSignatures(compositeKeys)}
                            >
                              {sendButtonText}
                            </button>
                            {accounts[account].transaction && (
                              <div className="flex items-center">
                                <p>Tx Id:</p>
                                <p className="text-sm">
                                  {accounts[account].transaction}
                                </p>
                              </div>
                            )}
                            {txWaiting && (
                              <p>Waiting for Transaction to be sealed</p>
                            )}
                            {transactionErrorMessage && (
                              <p className="text-red-500">
                                {transactionErrorMessage}
                              </p>
                            )}
                            {transaction && (
                              <>
                                <p>{transaction?.statusString}</p>
                                <div className="flex items-center">
                                  <p>Events</p>
                                  <button
                                    className="bg-blue-500 hover:bg-blue-700 text-white font-semibold py-1 px-2 rounded text-sm"
                                    onClick={showHideEvents}
                                  >
                                    {eventButtonText}
                                  </button>
                                </div>
                                <div className="flex flex-col items-start">
                                  {eventButtonText === "hide" &&
                                    transaction.events.map((e, i) => {
                                      return (
                                        <>
                                          <p key={i}>{e.type}</p>
                                          <p key={i}>
                                            {JSON.stringify(e.data)}
                                          </p>
                                        </>
                                      );
                                    })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
