import React from "react";

const FOUNDATION = "foundation";
const SERVICE_ACCOUNT = "serviceAccount";
const LEDGER = "ledger";
const TAB_NAMES = [SERVICE_ACCOUNT, FOUNDATION];

export const TransactionCreationSection = ({
  scriptType,
  setScriptType,
  serviceAccountFilenames,
  foundationFilenames,
  ledgerTransactionNames,
  scriptName,
  fetchServiceAccountFilename,
  fetchFoundationFilename,
  setLedgerTransaction,
  cadencePayload,
  setCadencePayload,
  jsonArgs,
  setArgumentsValue,
  jsonError,
  customAccountInput,
  handleCustomInputChange,
  selectedAccount,
  handleAccountChange,
  predefinedAccounts,
  addAuthAccountAddress,
  error,
  exeEffort,
  setExeEffort,
  isLedgerDisabled = true,
}) => {
  const getDropdownOptions = (filenames, currentScriptName, isSelected) => {
    return filenames.map((filename) => {
      const selected = filename === currentScriptName ? "selected" : "";
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

  return (
    <section className="w-full mb-6">
      <div className="space-y-4">
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              onChange={(e) => setLedgerTransaction(e.target.value)}
            >
              <option value="">Select Cadence</option>
              {getDropdownOptions(
                ledgerTransactionNames,
                scriptName,
                scriptType === LEDGER
              )}
            </select>
          )}
        </div>

        {/* Cadence Editor */}
        <textarea
          className="w-full h-40 p-3 border border-gray-300 rounded-md resize-vertical bg-white text-black font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter your Cadence script here"
          value={cadencePayload}
          onChange={(e) => setCadencePayload(e.target.value)}
        />

        {/* JSON Arguments input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            JSON Arguments
          </label>
          <input
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter json arguments"
            onChange={(e) => setArgumentsValue(e.target.value)}
            value={jsonArgs}
          />
          {jsonError && <p className="text-red-500 text-sm mt-1">{jsonError}</p>}
        </div>

        {/* Account Selection and Execution Limit in a row */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Authorized Account Select */}
          <div
            className={`flex-1 ${
              error ? "border-red-500" : "border-gray-300"
            } border rounded-md p-3`}
          >
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Authorized Account
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                className="flex-grow p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter account address"
                value={customAccountInput}
                onChange={handleCustomInputChange}
              />
              <select
                className="w-1/3 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className={`py-1.5 px-6 text-sm text-white font-medium rounded shadow-sm transition-colors ${
                !customAccountInput
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-500 hover:bg-blue-600 active:bg-blue-700"
              }`}
              onClick={addAuthAccountAddress}
              disabled={!customAccountInput}
            >
              Add Account
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          {/* Execution Limit input */}
          <div className="md:w-48">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Execution Limit
            </label>
            <input
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter Execute Limit"
              onChange={(e) => setExeEffort(e.target.value)}
              value={exeEffort}
            />
          </div>
        </div>
      </div>
    </section>
  );
};
