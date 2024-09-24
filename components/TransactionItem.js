import { abbrvKey, formatDate } from "../utils/formatting";
import { AddressItem } from "./AddressItem";

export const TransactionItem = ({ transaction, selectedTx, handleTxSelect, network }) => {
    return (
        <button
            key={transaction.signatureRequestId}
            onClick={() => handleTxSelect(transaction)}
            className={`w-full text-left p-2 mb-2 rounded text-sm group ${
                transaction === selectedTx ? 'bg-blue-100' : 'hover:bg-gray-100'
            }`}
        >
            <div className="flex justify-between items-center">
                <span className="font-medium">{abbrvKey(transaction.signatureRequestId, 6)}</span>
                <span className="text-xs text-gray-500">{formatDate(transaction.created_at)}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
                <AddressItem address={transaction.address} network={network} />
                <span>Key ID: {transaction.keyId}</span>
            </div>
        </button>
    );
};