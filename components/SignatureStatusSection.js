import React from "react";
import { KeysTableStatus } from "./KeysTableStatus";
import { CopyLink } from "./CopyLink";
import { TransactionStatusIndicator } from "./TransactionStatusIndicator";

// Derive button state from transaction lifecycle
const getButtonState = ({ triggerSent, signingFlowActive, transactionId, txWaiting, transaction, transactionErrorMessage }) => {
  // Transaction completed (sealed)
  if (transaction?.status === 4) {
    return { text: "Transaction Sealed", disabled: true, hidden: true };
  }
  // Transaction waiting to seal
  if (txWaiting) {
    return { text: "Transaction Submitted", disabled: true, hidden: true };
  }
  // Transaction submitted to blockchain (has hash)
  if (transactionId) {
    return { text: "Transaction Submitted", disabled: true, hidden: true };
  }
  // Trigger sent but signing flow ended without submitting - needs new signing flow
  if (triggerSent && !signingFlowActive && !transactionErrorMessage) {
    return { 
      text: "Signing Flow Expired", 
      disabled: true, 
      hidden: false,
      needsNewSigningLink: true,
      message: "The signing flow timed out. Please generate a new signing link to try again."
    };
  }
  // Trigger sent, signing flow still active - waiting for FCL to submit
  if (triggerSent && signingFlowActive && !transactionErrorMessage) {
    return { text: "Submitting Transaction...", disabled: true, hidden: false };
  }
  // Error occurred - allow retry if signing flow is still active
  if (transactionErrorMessage) {
    if (signingFlowActive) {
      return { text: "Retry Transaction", disabled: false, hidden: false };
    } else {
      return { 
        text: "Start Over", 
        disabled: true, 
        hidden: false,
        needsNewSigningLink: true,
        message: "The signing flow has ended. Please generate a new signing link to try again."
      };
    }
  }
  // Ready to send (signing flow must be active)
  if (!signingFlowActive) {
    return { text: "Send Transaction", disabled: true, hidden: false, message: "Waiting for signing flow..." };
  }
  return { text: "Send Transaction", disabled: false, hidden: false };
};

export const SignatureStatusSection = ({
  accounts,
  inFlightRequests,
  signatureRequestId,
  getOauthPageLink,
  getLedgerPageLink,
  getCliCommand,
  sendTransaction,
  triggerSent,
  signingFlowActive,
  enoughSignatures,
  transactionId,
  transactionErrorMessage,
  transaction,
  txWaiting,
  getFlowscanUrl,
}) => {
  const buttonState = getButtonState({ triggerSent, signingFlowActive, transactionId, txWaiting, transaction, transactionErrorMessage });
  const accountKeys = Object.keys(accounts);

  // Check if there are any signature requests
  const hasSignatureRequests = accountKeys.some((accountKey) => {
    const cleanedAccount = accountKey.replace("0x", "");
    return Object.keys(inFlightRequests?.[cleanedAccount] || {}).length > 0;
  });

  if (accountKeys.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-500">
          Add an account and generate a signing link to see signature status.
        </p>
      </div>
    );
  }

  if (!hasSignatureRequests) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-500">
          Generate a signing link to track signature collection.
        </p>
        <p className="text-gray-400 text-sm mt-2">
          Keys that have submitted signatures will be highlighted in green.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accountKeys.map((accountKey) => {
        const cleanedAccount = accountKey.replace("0x", "");
        const accountRequests = inFlightRequests?.[cleanedAccount] || {};

        return Object.entries(accountRequests).map(
          ([requestId, compositeKeys]) => (
            <div
              key={requestId}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {/* Signature Request Header */}
              <div className="mb-4 pb-3 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-700">Signature Request</h4>
                  <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-1 rounded">
                    {requestId.substring(0, 8)}...
                  </span>
                </div>
              </div>

              {/* Signing Links */}
              <div className="space-y-2 mb-4">
                <CopyLink
                  text={getOauthPageLink(requestId)}
                  label="OAuth Signing URL"
                />
                <CopyLink
                  text={getCliCommand(requestId)}
                  label="CLI Command"
                  isUrl={false}
                />
              </div>

              {/* Keys Status Table */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Signature Collection Status
                </p>
                <KeysTableStatus
                  keys={compositeKeys}
                  account={accounts[accountKey]}
                />
              </div>

              {/* Signature Progress Indicator */}
              <div className="mb-4">
                <SignatureProgressBar keys={compositeKeys} />
              </div>

              {/* Send Transaction Button */}
              {!buttonState.hidden && (
                <div className="space-y-2">
                  <button
                    className={`py-1.5 px-6 text-sm text-white font-medium rounded shadow-sm transition-colors ${
                      !enoughSignatures(compositeKeys) || buttonState.disabled
                        ? "bg-gray-300 cursor-not-allowed"
                        : transactionErrorMessage
                        ? "bg-orange-500 hover:bg-orange-600 active:bg-orange-700"
                        : "bg-green-500 hover:bg-green-600 active:bg-green-700"
                    }`}
                    onClick={() => sendTransaction()}
                    disabled={!enoughSignatures(compositeKeys) || buttonState.disabled}
                  >
                    {buttonState.disabled && !transactionErrorMessage && !buttonState.needsNewSigningLink && (
                      <span className="inline-block w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    )}
                    {buttonState.text}
                  </button>
                  
                  {/* Status message for edge cases */}
                  {buttonState.message && (
                    <p className={`text-sm text-center ${buttonState.needsNewSigningLink ? "text-amber-600" : "text-gray-500"}`}>
                      {buttonState.message}
                    </p>
                  )}
                </div>
              )}

              {!enoughSignatures(compositeKeys) && !buttonState.hidden && !buttonState.message && (
                <p className="text-sm text-gray-500 text-center mt-2">
                  Waiting for signatures (need 1000+ weight)
                </p>
              )}
            </div>
          )
        );
      })}

      {/* Transaction Status */}
      <TransactionStatusIndicator
        transactionId={transactionId}
        transactionErrorMessage={transactionErrorMessage}
        transaction={transaction}
        txWaiting={txWaiting}
        flowscanUrl={transactionId ? getFlowscanUrl(transactionId) : null}
        signatureRequestId={signatureRequestId}
      />
    </div>
  );
};

// Helper component to show signature progress
const SignatureProgressBar = ({ keys }) => {
  const total = keys.reduce((p, k) => (k.sig ? p + parseInt(k.weight) : p), 0);
  const percentage = Math.min((total / 1000) * 100, 100);
  const isComplete = total >= 1000;

  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">Weight Collected</span>
        <span className={isComplete ? "text-green-600 font-medium" : "text-gray-600"}>
          {total} / 1000
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${
            isComplete ? "bg-green-500" : "bg-blue-500"
          }`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};
