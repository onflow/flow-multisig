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
import { authzManyKeyResolver, buildSinglaAuthz, clearRegistrationState } from "../../utils/authz";
import { MAINNET, TESTNET } from "../../utils/constants";
import { TransactionCreationSection } from "../../components/TransactionCreationSection";
import { ProposalKeySection } from "../../components/ProposalKeySection";
import { SignatureStatusSection } from "../../components/SignatureStatusSection";

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
const MAX_ALLOWED_BLOCKS = 600;
const SECONDS_PER_BLOCK = 0.75;

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
  const [transactionErrorMessage, setTransactionErrorMessage] = useState(null);
  const [triggerSent, setTriggerSent] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [signingFlowActive, setSigningFlowActive] = useState(false);

  const isLedgerDisabled = true;
  const predefinedAccounts = ["0xe467b9dd11fa00df", "0x8624b52f9ddcd04a"];

  // Account handlers
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

  // Fetch file lists on mount
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

  // Handle query params
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

  // Transaction submission
  const onSubmit = async (accountKey) => {
    setGenerating(true);
    setGeneratingStatus("Preparing transaction...");
    setTransactionErrorMessage(null);
    setTriggerSent(false);
    setSigningFlowActive(true);
    
    // Clear any stale registration state from previous transactions
    clearRegistrationState();

    const account = accounts[accountKey];
    const keys = account.keys;

    if (selectedProposalKey === null) {
      setTransactionErrorMessage("Please select a proposal key");
      setGenerating(false);
      setGeneratingStatus("");
      return;
    }

    const proposalKey = account.keys.find(
      (k) => k.index === selectedProposalKey
    );
    if (!proposalKey) {
      setTransactionErrorMessage("Selected proposal key not found");
      setGenerating(false);
      setGeneratingStatus("");
      return;
    }

    let userDefinedArgs;
    try {
      userDefinedArgs = jsonArgs ? JSON.parse(jsonArgs) : [];
    } catch (parseError) {
      setTransactionErrorMessage(
        `Invalid JSON arguments: ${parseError.message}`
      );
      setGenerating(false);
      setGeneratingStatus("");
      return;
    }

    console.log(
      `[onSubmit] Starting transaction with ${keys.length} keys, proposer key: ${proposalKey.index}`
    );
    
    setGeneratingStatus(`Saving transaction payload for ${keys.length} keys...`);

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
          setTransactionErrorMessage(
            e.message || "An error occurred during the transaction"
          );
          setGenerating(false);
          setGeneratingStatus("");
          setTriggerSent(false);
          setSigningFlowActive(false);
          return null;
        })
        .finally(() => {
          setGenerating(false);
          setGeneratingStatus("");
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
      setGeneratingStatus("");
      setTriggerSent(false);
      setSigningFlowActive(false);
      return;
    }

    if (!tx?.transactionId) {
      console.log("[onSubmit] No transaction ID - transaction was not submitted");
      setSigningFlowActive(false);
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
      setTransactionErrorMessage(
        e.message || "An error occurred while waiting for the transaction to seal"
      );
      setGenerating(false);
    } finally {
      setTxWaiting(false);
      setSigningFlowActive(false);
    }
  };

  // URL helpers
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
      setArgumentsValue(getPlaceHolderArgs(filename));
    });
  };

  const fetchFoundationFilename = (filename) => {
    setScriptName(filename);
    setScriptType(FOUNDATION);
    setCadencePayload("loading ...");
    getFoundationFilename(filename).then((contents) => {
      setCadencePayload(contents);
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
    setJsonArgs(value);
    let errorString = "";
    try {
      JSON.parse(value);
    } catch (e) {
      errorString = e.message || "Invalid JSON";
    }
    setJsonError(errorString);
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
    setTriggerSent(true);
    const signatureRequestId = state?.signatureRequestId;

    try {
      await fetch(`/api/${signatureRequestId}/confirmation`, {
        method: "post",
        body: signatureRequestId,
      });
      
      // Verify the trigger was set
      const value = await fetch(`/api/${signatureRequestId}/confirmation`).then(
        (r) => r.json()
      );

      if (!value?.triggered) {
        console.warn("[sendTransaction] Trigger confirmation failed, retrying...");
        // Retry once if confirmation failed (serverless instance issue)
        await fetch(`/api/${signatureRequestId}/confirmation`, {
          method: "post",
          body: signatureRequestId,
        });
      }
    } catch (error) {
      console.error("[sendTransaction] Error sending trigger:", error);
      setTriggerSent(false);
      setTransactionErrorMessage("Failed to trigger transaction. Please try again.");
    }
  };

  const getFlowscanUrl = (transactionId) => {
    const network = router.query.env || MAINNET;
    const baseUrl =
      network === TESTNET
        ? "https://testnet.flowscan.io"
        : "https://flowscan.io";
    return `${baseUrl}/transaction/${transactionId}`;
  };

  // Check if there's an in-flight request for the current account
  const hasInFlightRequest = Boolean(
    state.inFlightRequests?.[cleanAddress(customAccountInput || selectedAccount)]
  );

  return (
    <div className="min-h-screen px-6 py-4 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Transaction Creation - Full Width */}
        <TransactionCreationSection
          scriptType={scriptType}
          setScriptType={setScriptType}
          serviceAccountFilenames={serviceAccountFilenames}
          foundationFilenames={foundationFilenames}
          ledgerTransactionNames={LedgerTransactionNames}
          scriptName={scriptName}
          fetchServiceAccountFilename={fetchServiceAccountFilename}
          fetchFoundationFilename={fetchFoundationFilename}
          setLedgerTransaction={setLedgerTransaction}
          cadencePayload={cadencePayload}
          setCadencePayload={setCadencePayload}
          jsonArgs={jsonArgs}
          setArgumentsValue={setArgumentsValue}
          jsonError={jsonError}
          customAccountInput={customAccountInput}
          handleCustomInputChange={handleCustomInputChange}
          selectedAccount={selectedAccount}
          handleAccountChange={handleAccountChange}
          predefinedAccounts={predefinedAccounts}
          addAuthAccountAddress={addAuthAccountAddress}
          error={error}
          exeEffort={exeEffort}
          setExeEffort={setExeEffort}
          isLedgerDisabled={isLedgerDisabled}
        />

        {/* Two Column Layout for Submission */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Proposal Key Selection */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-2">
              Proposal Key Selection
            </h2>
            <ProposalKeySection
              accounts={accounts}
              selectedProposalKey={selectedProposalKey}
              setProposalKey={setProposalKey}
              onGenerateLink={onSubmit}
              generating={generating}
              generatingStatus={generatingStatus}
              hasInFlightRequest={hasInFlightRequest}
              getFormUrlLink={getFormUrlLink}
            />
          </section>

          {/* Right Column - Signature Status */}
          <section>
            <h2 className="text-xl font-semibold mb-3 text-gray-800 border-b border-gray-200 pb-2">
              Signature Status
            </h2>
            <SignatureStatusSection
              accounts={accounts}
              inFlightRequests={state.inFlightRequests}
              signatureRequestId={state.signatureRequestId}
              getOauthPageLink={getOauthPageLink}
              getLedgerPageLink={getLedgerPageLink}
              getCliCommand={getCliCommand}
              sendTransaction={sendTransaction}
              triggerSent={triggerSent}
              signingFlowActive={signingFlowActive}
              enoughSignatures={enoughSignatures}
              transactionId={transactionId}
              transactionErrorMessage={transactionErrorMessage}
              transaction={transaction}
              txWaiting={txWaiting}
              getFlowscanUrl={getFlowscanUrl}
            />
          </section>
        </div>
      </div>
    </div>
  );
}
