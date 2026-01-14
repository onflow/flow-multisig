import React from "react";

export const GeneratingProgress = ({ status }) => {
  return (
    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center">
        <div className="mr-3">
          <svg
            className="animate-spin h-5 w-5 text-blue-500"
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
        </div>
        <div>
          <p className="text-sm font-medium text-blue-700">
            {status || "Preparing transaction..."}
          </p>
          <p className="text-xs text-blue-600 mt-0.5">
            Please wait while the transaction is being prepared.
          </p>
        </div>
      </div>
    </div>
  );
};
