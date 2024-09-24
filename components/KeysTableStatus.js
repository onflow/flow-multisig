import { abbrvKey } from "../utils/formatting";

export const KeysTableStatus = ({ keys, account }) => {
    const total = keys.reduce((p, k) => k.sig ? p + k.weight : p, 0);
    const accountKeys = (account?.keys || []).reduce((p, d) => ({ ...p, [d.index]: abbrvKey(d.publicKey) }), {})
    return (
        <div className="overflow-x-auto shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                    <tr>
                        <th scope="col" className="px-4 py-2 text-left">Weight</th>
                        <th scope="col" className="px-4 py-2 text-left">KeyId</th>
                        <th scope="col" className="px-4 py-2 text-left">Public Key</th>
                    </tr>
                </thead>
                <tbody>
                    {[...keys].sort((a, b) => a.keyId > b.keyId ? 1 : -1).map((key, i) => (
                        <tr key={`tr-${key.index}-${i}`} className={`${key?.sig ? 'bg-green-50' : 'bg-white'} border-b hover:bg-gray-50`}>
                            <td className="px-4 py-2 text-left">{key.weight}</td>
                            <td className="px-4 py-2 text-left">{key.keyId}</td>
                            <td className="px-4 py-2 font-mono text-xs text-left">{abbrvKey(accountKeys[key.keyId])}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr className="font-semibold text-gray-900 bg-gray-100">
                        <th scope="row" className="px-4 py-2 text-base text-right">{total}</th>
                        <td className="px-4 py-2 text-left" colSpan="2">Total Weight</td>
                    </tr>
                </tfoot>
            </table>
        </div>
    )
}