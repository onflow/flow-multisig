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
import { KeysTableStatus } from "../../components/KeysTableStatus";
import { KeysTableSelector } from "../../components/KeysTableSelector";
import { authzManyKeyResolver, buildSinglaAuthz } from "../../utils/authz";
import { MAINNET, TESTNET } from "../../utils/constants";
import { CopyLink } from "../../components/CopyLink";
import { TransactionStatusIndicator } from "../../components/TransactionStatusIndicator";

const flowscanUrls = {
  mainnet: "https://flowscan.io/transaction",
  testnet: "https://testnet.flowscan.io/transaction",
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
const SECONDS_PER_BLOCK = 0.75;
const SEND_TX_BUTTON = "Send Transaction";

export default function MainPage() {
  const router = useRouter();

  const [state, dispatch] = useReducer(reducer, initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [customAccountInput, setCustomAccountInput] = useState("");
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
  const [transactionId, setTransactionId] = useState(null);
  const [txWaiting, setTxWaiting] = useState(false);
  const [eventButtonText, setEventButtonText] = useState("show");
  const [transactionErrorMessage, setTransactionErrorMessage] = useState(null);
  const [sendButtonText, setSendButtonText] = useState(SEND_TX_BUTTON);
  const [generating, setGenerating] = useState(false);

  const isLedgerDisabled = true; // Set this to true to disable the Ledger tab

  const predefinedAccounts = ["0x9178260195652f85", "0x47fd53250cc3982f"];

  const handleAccountChange = (e) => {
    const value = e.target.value;
    setSelectedAccount(value);
    if (value !== "custom") {
      setCustomAccountInput(value);
    }
  };

  const handleCustomInputChange = (e) => {
    setCustomAccountInput(e.target.value);
    setSelectedAccount("custom");
  };

  const addAuthAccountAddress = () => {
    const accountToAdd = customAccountInput || selectedAccount;
    if (accountToAdd) {
      fcl
        .account(accountToAdd)
        .then(({ keys }) => {
          setAccounts({
            ...accounts,
            [accountToAdd]: {
              keys: keys.filter((k) => !k.revoked),
              enabledKeys: [],
              link: null,
              flowScanUrl: null,
            },
          });
        })
        .catch((err) => {
          console.log("unexpected error occurred", err);
          setError("Failed to add account: " + err.message);
        });
    }
  };

  useEffect(() => {
    getServiceAccountFileList()
      .then((result) => {
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

  const validateAccount = (authAccountAddress) => {
    setIsOpen(false);
    setError(null);
    if (authAccountAddress !== "") {
      fcl
        .account(authAccountAddress)
        .then((acct) => {
          if (acct) {
            const bal = acct.balance / 1e8;
            setAccountBalance(bal);
          }
        })
        .catch((e) => {
          console.log(e);
          setError(e.message || "Invalid Account Address");
        });
    }
  };

  const onSubmit = async (accountKey) => {
    setGenerating(true);
    setTransactionErrorMessage(null);
    
    const account = accounts[accountKey];
    const keys = account.keys;
    
    if (selectedProposalKey === null) {
      setTransactionErrorMessage("Please select a proposal key");
      setGenerating(false);
      return;
    }
    
    const proposalKey = account.keys.find(
      (k) => k.index === selectedProposalKey
    );
    if (!proposalKey) {
      setTransactionErrorMessage("Selected proposal key not found");
      setGenerating(false);
      return;
    }

    let userDefinedArgs;
    try {
      userDefinedArgs = jsonArgs ? JSON.parse(jsonArgs) : [];
    } catch (parseError) {
      setTransactionErrorMessage(`Invalid JSON arguments: ${parseError.message}`);
      setGenerating(false);
      return;
    }

    console.log(`[onSubmit] Starting transaction with ${keys.length} keys, proposer key: ${proposalKey.index}`);

    // Create authorization resolvers
    // The first signing function called by FCL will register ALL keys using the batch API
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
          fcl.proposer(resolveProposer),
          fcl.authorizations(authorizations),
          fcl.payer(resolver),
          fcl.limit(parseInt(exeEffort)),
        ])
        .catch((e) => {
          console.error("[onSubmit] Transaction send error:", e);
          setTransactionErrorMessage(e.message || "An error occurred during the transaction");
          setGenerating(false);
          return null;
        })
        .finally(() => {
          setGenerating(false);
        });

      if (tx?.transactionId) {
        console.log("[onSubmit] Transaction ID:", tx.transactionId);
        account.transaction = tx.transactionId;
        setTransactionId(tx.transactionId);
        setCountdown(0);
        setAccounts({ ...accounts, [accountKey]: account });
      }
    } catch (e) {
      console.error("[onSubmit] Unexpected transaction error:", e);
      setTransactionErrorMessage(e.message || "An unexpected error occurred");
      setGenerating(false);
      return;
    }

    if (!tx?.transactionId) {
      console.log("[onSubmit] No transaction ID - transaction was not submitted");
      return;
    }

    setTxWaiting(true);
    try {
      const transaction = await fcl.tx(tx.transactionId).onceSealed();
      if (transaction?.errorMessage) {
        setTransactionErrorMessage(transaction.errorMessage);
      }
      if (transaction) setTransaction(transaction);
    } catch (e) {
      console.error("[onSubmit] Transaction sealing error:", e);
      setTransactionErrorMessage(e.message || "An error occurred while waiting for the transaction to seal");
      setSendButtonText(SEND_TX_BUTTON);
      setGenerating(false);
    } finally {
      setTxWaiting(false);
    }
  };

  const getNetwork = () => {
    let network = "mainnet";
    if (window.location.href.indexOf("testnet") > -1) network = "testnet";
    return network;
  };

  const getFormUrlLink = () => {
    const network = getNetwork();
    const url = `${
      window.location.origin
    }/${network}?type=${scriptType}&name=${scriptName}&param=${jsonArgs}&acct=${
      customAccountInput || selectedAccount
    }&limit=${exeEffort}`;
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
      errorString = e.message || "Invalid JSON";
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
    }

    setTimeout(() => setSendButtonText("Transaction Sent"), 600);
  };

  // Get the correct Flowscan URL based on the network
  const getFlowscanUrl = (transactionId) => {
    const network = router.query.env || MAINNET; // Assuming 'env' in the URL indicates the network
    const baseUrl =
      network === TESTNET
        ? "https://testnet.flowscan.io"
        : "https://flowscan.io";
    return `${baseUrl}/transaction/${transactionId}`;
  };

  return (
    <div className="min-h-screen px-8 py-2">
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
        {/* Transaction Creation Section */}
        <section className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-2">Transaction Creation</h2>
          <div className="space-y-3">
            {/* Tab navigation */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                {TAB_NAMES.map((name, index) => (
                  <button
                    key={name}
                    className={`${
                      TAB_NAMES.indexOf(scriptType) === index
                        ? "border-primary text-primary"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    } whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm transition duration-150 ease-in-out ${
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

            {/* Script selection dropdown */}
            <div>
              {scriptType === SERVICE_ACCOUNT && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) => fetchServiceAccountFilename(e.target.value)}
                >
                  <option value="">Select Cadence</option>
                  {getDropdownOptions(
                    serviceAccountFilenames,
                    scriptName,
                    scriptType === SERVICE_ACCOUNT
                  )}
                </select>
              )}
              {scriptType === FOUNDATION && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) => fetchFoundationFilename(e.target.value)}
                >
                  <option value="">Select Cadence</option>
                  {getDropdownOptions(
                    foundationFilenames,
                    scriptName,
                    scriptType === FOUNDATION
                  )}
                </select>
              )}
              {scriptType === LEDGER && (
                <select
                  className="w-full p-2 border border-gray-300 rounded-md"
                  onChange={(e) => setLedgerTransaction(e.target.value)}
                >
                  <option value="">Select Cadence</option>
                  {getDropdownOptions(
                    LedgerTransactionNames,
                    scriptName,
                    scriptType === LEDGER
                  )}
                </select>
              )}
            </div>

            <textarea
              className="w-full h-32 p-2 border border-gray-300 rounded-md resize-vertical bg-white text-black"
              placeholder="Enter your Cadence script here"
              value={cadencePayload}
              onChange={(e) => setCadencePayload(e.target.value)}
            />

            {/* JSON Arguments input */}
            <input
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Enter json arguments"
              onChange={(e) => setArgumentsValue(e.target.value)}
              value={jsonArgs}
            />
            {jsonError && <p className="text-red-500 text-sm">{jsonError}</p>}

            {/* Authorized Account Select */}
            <div
              className={`${
                error ? "border-red-500" : "border-gray-300"
              } border rounded-md p-3`}
            >
              <div className="flex space-x-2 mb-1">
                <input
                  className="flex-grow p-2 border border-gray-300 rounded-md"
                  placeholder="Enter account address"
                  value={customAccountInput}
                  onChange={handleCustomInputChange}
                />
                <select
                  className="w-1/3 p-2 border border-gray-300 rounded-md"
                  value={selectedAccount}
                  onChange={handleAccountChange}
                >
                  <option value="">Select an account</option>
                  {predefinedAccounts.map((account) => (
                    <option key={account} value={account}>
                      {account}
                    </option>
                  ))}
                  <option value="custom">Enter custom address</option>
                </select>
              </div>
              <button
                className={`w-full p-2 text-white font-semibold rounded ${
                  !customAccountInput
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-700"
                }`}
                onClick={addAuthAccountAddress}
                disabled={!customAccountInput}
              >
                Add
              </button>
              {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
            </div>

            {/* Execution Limit input */}
            <div className="flex items-center space-x-2">
              <label className="whitespace-nowrap font-semibold">
                Execution Limit:
              </label>
              <input
                className="flex-grow p-2 border border-gray-300 rounded-md"
                placeholder="Enter Execute Limit"
                onChange={(e) => setExeEffort(e.target.value)}
                value={exeEffort}
              />
            </div>
          </div>
        </section>

        {/* Transaction Submission Section */}
        <section className="w-full md:w-1/2">
          <h2 className="text-xl font-semibold mb-2">Transaction Submission</h2>
          <div className="space-y-3">
            {Object.keys(accounts).map((account) => (
              <div
                key={account}
                className="border border-gray-300 rounded-md p-3"
              >
                <h3 className="font-semibold mb-1">Select Proposal Key</h3>

                {/* Select Proposal Key */}
                <KeysTableSelector
                  keys={accounts[account].keys}
                  selectedKey={selectedProposalKey}
                  setKey={setProposalKey}
                />

                {/* Generate Link button */}
                <button
                  className={`w-full p-2 mt-2 text-white font-semibold rounded ${
                    generating ||
                    selectedProposalKey === null ||
                    state.inFlightRequests?.[
                      cleanAddress(customAccountInput || selectedAccount)
                    ]
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-700"
                  }`}
                  onClick={() =>
                    onSubmit(customAccountInput || selectedAccount)
                  }
                  disabled={
                    generating ||
                    selectedProposalKey === null ||
                    state.inFlightRequests?.[
                      cleanAddress(customAccountInput || selectedAccount)
                    ]
                  }
                >
                  Generate Link
                </button>

                <div className="mt-2">
                  <CopyLink text={getFormUrlLink()} label="Page URL" />
                </div>

                {/* Signature Requests */}
                {Object.entries(
                  state.inFlightRequests?.[cleanAddress(account)] || {}
                ).map(([signatureRequestId, compositeKeys]) => (
                  <div
                    key={signatureRequestId}
                    className="mt-3 p-2 bg-gray-100 rounded-md"
                  >
                    <p className="font-semibold text-sm">
                      Signature Request ID: {signatureRequestId}
                    </p>
                    <div className="mt-2">
                      <CopyLink
                        text={getOauthPageLink(signatureRequestId)}
                        label="OAuth Page URL"
                      />
                    </div>
                    <div className="mt-2">
                      <CopyLink
                        text={getCliCommand(signatureRequestId)}
                        label="CLI Command"
                        isUrl={false}
                      />
                    </div>
                    <KeysTableStatus
                      keys={compositeKeys}
                      account={accounts[account]}
                    />
                    <button
                      className={`w-full p-2 mt-2 text-white font-semibold rounded ${
                        !enoughSignatures(compositeKeys)
                          ? "bg-gray-300 cursor-not-allowed"
                          : "bg-blue-500 hover:bg-blue-700"
                      }`}
                      onClick={() => sendTransaction()}
                      disabled={!enoughSignatures(compositeKeys)}
                    >
                      {sendButtonText}
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Transaction Status Indicator */}
          <TransactionStatusIndicator
            transactionId={transactionId}
            transactionErrorMessage={transactionErrorMessage}
            transaction={transaction}
            txWaiting={txWaiting}
            flowscanUrl={transactionId ? getFlowscanUrl(transactionId) : null}
            signatureRequestId={state.signatureRequestId}
          />
        </section>
      </div>
    </div>
  );
}
