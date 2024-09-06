import { abbrvKey } from "../utils/formatting";

export const KeysTableStatus = ({ keys, account }) => {
    const total = keys.reduce((p, k) => k.sig ? p + k.weight : p, 0);
    const accountKeys = (account?.keys || []).reduce((p, d) => ({ ...p, [d.index]: abbrvKey(d.publicKey) }), {})
    return (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="py-2">Weight</th>
                        <th scope="col" className="py-2">KeyId</th>
                        <th scope="col" className="py-2">Public Key</th>
                    </tr>
                </thead>
                <tbody>
                    {[...keys].sort((a, b) => a.keyId > b.keyId ? 1 : -1).map((key, i) => (
                        <tr key={`tr-${key.index}-${i}`} className={`${key?.sig ? 'bg-green-100' : 'bg-white'} border-b`}>
                            <td className="py-1">{key.weight}</td>
                            <td className="py-1">{key.keyId}</td>
                            <td className="py-1">{abbrvKey(accountKeys[key.keyId])}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-semibold text-gray-900">
                        <th scope="row" className="px-6 py-3 text-base">{total}</th>
                        <td className="px-6 py-3" colSpan="2">Total Weight</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}