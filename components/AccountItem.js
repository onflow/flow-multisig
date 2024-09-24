import React from 'react';
import { AddressItem } from './AddressItem';

export const AccountItem = ({ account, network }) => {
    return (
      <div className="text-sm mb-2 flex flex-col">
        <div className="flex justify-between items-center group">
          <div className="flex items-center">
            <AddressItem address={account.address} network={network} />
          </div>
          <span className="text-xs bg-gray-200 rounded px-1 py-0.5">Weight: {account.weight}</span>
        </div>
        <div className="text-xs text-gray-500">Key ID: {account.keyId}</div>
      </div>
    );
};
