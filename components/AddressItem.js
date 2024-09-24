import React, { useState } from 'react';
import { MAINNET, TESTNET } from '../utils/configurations';

export const AddressItem = ({ address, network }) => {
  const [copiedAddress, setCopiedAddress] = useState(null);

  // determine the flowscan url based on the network
  const getFlowscanUrl = (address) => {
    if (network === MAINNET) {
      return `https://www.flowscan.io/account/${address}`;
    } else if (network === TESTNET) {
      return `https://testnet.flowscan.io/account/${address}`;
    } else {
      return `https://www.flowscan.io/account/${address}`;
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddress(text);
      setTimeout(() => setCopiedAddress(null), 500); // Reset after 500ms
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  return (
    <div className="flex items-center">
      {copiedAddress === address ? (
        <span className="text-green-600 font-medium">Copied!</span>
      ) : (
        <a 
          href={getFlowscanUrl(address)} 
          target="_blank" 
          rel="noopener noreferrer"
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {address}
        </a>
      )}
      <button 
        onClick={(e) => {
          e.preventDefault(); // Prevent the link from being followed
          copyToClipboard(address);
        }}
        className="w-full ml-2 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
        title="Copy full address"
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-4 w-4 text-gray-400 hover:text-gray-600" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      </button>
    </div>
  );
};
