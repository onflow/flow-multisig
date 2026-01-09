import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

export const CopyLink = ({ text, label, isUrl = true }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center space-x-2">
      <CopyToClipboard text={text} onCopy={handleCopy}>
        <button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white text-xs font-medium py-1 px-3 rounded shadow-sm transition-colors">
          {copied ? "Copied!" : "Copy"}
        </button>
      </CopyToClipboard>
      {isUrl && (
        <a href={text} target="_blank" rel="noopener noreferrer">
          <button className="bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-xs font-medium py-1 px-3 rounded shadow-sm transition-colors">
            {label}
          </button>
        </a>
      )}
      {!isUrl && <span className="text-xs text-gray-600">{label}</span>}
    </div>
  );
};

export default CopyLink;
