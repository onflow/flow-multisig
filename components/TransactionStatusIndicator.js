import React from "react";

const PHASE_CONFIG = {
  pending: {
    label: "Waiting for submission...",
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
  submitting: {
    label: "Submitting transaction...",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  waiting: {
    label: "Waiting for transaction to seal...",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
  },
  sealed: {
    label: "Transaction Sealed",
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
  },
  failed: {
    label: "Transaction Failed",
    color: "text-red-500",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
};

const PHASES = [
  { key: "submitting", label: "Submitting" },
  { key: "waiting", label: "Confirming" },
  { key: "sealed", label: "Sealed" },
];

/**
 * Get the current transaction phase based on state
 * 
 * transactionId (hash) is only set when transaction is actually submitted to blockchain
 */
export const getTransactionPhase = ({
  transactionErrorMessage,
  transaction,
  txWaiting,
  transactionId,
  signatureRequestId,
}) => {
  if (transactionErrorMessage) {
    return { phase: "failed", ...PHASE_CONFIG.failed };
  }
  if (transaction?.status === 4) {
    return { phase: "sealed", ...PHASE_CONFIG.sealed };
  }
  if (txWaiting) {
    return { phase: "waiting", ...PHASE_CONFIG.waiting };
  }
  // Transaction hash exists means it was submitted to blockchain
  if (transactionId && !transaction) {
    return { phase: "submitting", ...PHASE_CONFIG.submitting };
  }
  // Signature request exists but transaction not yet submitted (no hash yet)
  if (signatureRequestId && !transactionId) {
    return { phase: "pending", ...PHASE_CONFIG.pending };
  }
  return null;
};

const ExternalLinkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

const ProgressSteps = ({ currentPhaseIndex, isFailed }) => {
  const getStepStatus = (index) => {
    const isActive = index === currentPhaseIndex && !isFailed;
    const isComplete = index < currentPhaseIndex && !isFailed;
    const isFailedStep = isFailed && index >= currentPhaseIndex;
    return { isActive, isComplete, isFailedStep };
  };

  return (
    <div className="flex items-center justify-between mb-4">
      {PHASES.map((phase, index) => {
        const { isActive, isComplete, isFailedStep } = getStepStatus(index);

        return (
          <React.Fragment key={phase.key}>
            <span
              className={`text-sm font-medium transition-all duration-300 ${
                isComplete
                  ? "text-green-600"
                  : isActive
                  ? "text-blue-600"
                  : isFailedStep
                  ? "text-red-500"
                  : "text-gray-400"
              }`}
            >
              {phase.label}
            </span>
            {index < PHASES.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 transition-all duration-300 ${
                  getStepStatus(index).isComplete ? "bg-green-500" : "bg-gray-300"
                }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const StatusMessage = ({ phaseInfo }) => {
  if (!phaseInfo) return null;

  return (
    <div className={`text-center font-medium ${phaseInfo.color}`}>
      {phaseInfo.label}
    </div>
  );
};

export const TransactionStatusIndicator = ({
  transactionId,
  transactionErrorMessage,
  transaction,
  txWaiting,
  flowscanUrl,
  signatureRequestId,
}) => {
  const phaseInfo = getTransactionPhase({
    transactionErrorMessage,
    transaction,
    txWaiting,
    transactionId,
    signatureRequestId,
  });

  if (!phaseInfo && !transactionId) return null;

  const currentPhaseIndex = PHASES.findIndex((p) => p.key === phaseInfo?.phase);
  const isFailed = phaseInfo?.phase === "failed";

  return (
    <div
      className={`mt-4 p-4 rounded-lg border ${phaseInfo?.bgColor || "bg-gray-50"} ${
        phaseInfo?.borderColor || "border-gray-200"
      }`}
    >
      {/* Progress Steps */}
      <ProgressSteps currentPhaseIndex={currentPhaseIndex} isFailed={isFailed} />

      {/* Status Message */}
      <StatusMessage phaseInfo={phaseInfo} />

      {/* Error Message */}
      {transactionErrorMessage && (
        <p className="text-red-500 text-sm mt-3 text-center bg-red-100 p-2 rounded">
          {typeof transactionErrorMessage === "string"
            ? transactionErrorMessage
            : "An error occurred during the transaction"}
        </p>
      )}

      {/* Transaction ID */}
      {transactionId && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center break-all">
            Transaction ID: {transactionId}
          </p>
        </div>
      )}

      {/* Flowscan Link - Only show when not in submitting phase */}
      {transactionId && flowscanUrl && phaseInfo?.phase !== "submitting" && (
        <div className="mt-3">
          <a
            href={flowscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`w-full flex items-center justify-center space-x-2 p-2 rounded font-medium transition-colors ${
              phaseInfo?.phase === "sealed"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : phaseInfo?.phase === "failed"
                ? "bg-gray-500 hover:bg-gray-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            <span>View on Flowscan</span>
            <ExternalLinkIcon />
          </a>
        </div>
      )}
    </div>
  );
};

export default TransactionStatusIndicator;
