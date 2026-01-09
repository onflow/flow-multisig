import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

export const CopyLink = ({ text, label, isUrl = true }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex space-x-2">
      <CopyToClipboard text={text} onCopy={handleCopy}>
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded">
          {copied ? "Copied!" : "Copy"}
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
};

export default CopyLink;
