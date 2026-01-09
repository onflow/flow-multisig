import React from "react";
import { KeysTableSelector } from "./KeysTableSelector";
import { CopyLink } from "./CopyLink";

export const ProposalKeySection = ({
  accounts,
  selectedProposalKey,
  setProposalKey,
  onGenerateLink,
  generating,
  hasInFlightRequest,
  getFormUrlLink,
}) => {
  const accountKeys = Object.keys(accounts);

  if (accountKeys.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-500">
          Add an account in the Transaction Creation section above to select a proposal key.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {accountKeys.map((accountKey) => (
        <div
          key={accountKey}
          className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-700">Account</h4>
            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
              {accountKey}
            </span>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">
              Select a key to use as the proposal key:
            </p>
            <div className="border border-gray-200 rounded-md overflow-hidden">
              <KeysTableSelector
                keys={accounts[accountKey].keys}
                selectedKey={selectedProposalKey}
                setKey={setProposalKey}
              />
            </div>
          </div>

          {/* Generate Link button */}
          <button
            className={`py-1.5 px-6 text-sm text-white font-medium rounded shadow-sm transition-colors ${
              generating || selectedProposalKey === null || hasInFlightRequest
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
            }`}
            onClick={() => onGenerateLink(accountKey)}
            disabled={generating || selectedProposalKey === null || hasInFlightRequest}
          >
            {generating ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-2 h-3 w-3 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating...
              </span>
            ) : (
              "Generate Tx Payload"
            )}
          </button>

          {/* Page URL */}
          <div className="mt-3">
            <CopyLink text={getFormUrlLink()} label="Share Page URL" />
          </div>
        </div>
      ))}
    </div>
  );
};
