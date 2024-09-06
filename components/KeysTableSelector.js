import { abbrvKey } from "../utils/formatting";

export const KeysTableSelector = ({ keys, selectedKey, setKey }) => {
    const selectKey = (keyId) => {
        if (setKey) setKey(keyId)
    }
    if (!keys || keys.length === 0) {
        return null
    }

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">KeyId</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Public Key</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {keys.map((key, i) => (
                    <tr 
                        key={`tr-${key.index}-${i}`}
                        className={`cursor-pointer ${selectedKey === key.index ? 'bg-green-100' : 'hover:bg-gray-50'}`}
                        onClick={() => selectKey(key.index)}
                    >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{key.index}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{key.weight}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{abbrvKey(key.publicKey)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    )
}