export const CadenceViewer = ({ code, args }) => {
    return (
        <>
            <div className="py-2">
                <h2 className="text-lg font-semibold mb-2">Cadence Code</h2>
                <textarea 
                    className="w-full h-32 p-2 text-sm border rounded resize-y bg-gray-50"
                    readOnly
                    placeholder='Cadence Script'
                    value={code}
                />
            </div>
            <div className="py-2">
                <h2 className="text-lg font-semibold mb-2">Cadence Arguments</h2>
                {args && args.map((arg, i) =>
                    <div className="flex items-baseline" key={`${i}`}>
                        <span className="text-xs mr-2">{arg.type}</span>
                        <span>{`${JSON.stringify(arg.value)}`}</span>
                    </div>
                )}
                {args && args.length === 0 && (
                    <p className="px-4 text-base">No Arguments</p>
                )}
            </div>
        </>
    )
}