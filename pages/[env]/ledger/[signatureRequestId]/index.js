
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useSWR from "swr";
import { AddressKeyView } from "../../../../components/AddressKeyView";
import * as fcl from "@onflow/fcl";
import { CadenceViewer } from "../../../../components/CadenceViewer";
import { filerKeys, getUserAccount } from "../../../../utils/accountHelper";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

export default function SignatureRequestPage() {
    const router = useRouter();
    const { signatureRequestId } = router.query;
    const [currentUser, setCurrentUser] = useState({
        loggedIn: false,
    });
    const [user, setUser] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [signableKeys, setSignableKeys] = useState([])

    const { data } = useSWR(`/api/${signatureRequestId}`, fetcher, {
        refreshInterval: 3,
    });

    const signatures = data ? data.data : [];

    const { data: signableRecord } = useSWR(`/api/${signatureRequestId}/signable`, fetcher, {
        refreshInterval: 3,
    });

    const signableItems = signableRecord ? signableRecord.data : [];

    useEffect(() => {
        fcl.currentUser.subscribe((currentUser) => {
            if (currentUser?.addr) {
                setCurrentUser(currentUser)
                getUserAccount(currentUser.addr).then(user => {
                    if (user) {
                        setUser(user);
                        setLoading(false)
                    } else {
                        setErrorMessage("Could not load user information")
                    }
                }).catch(e => {
                    setErrorMessage(e)
                });
            } else {
                setCurrentUser({ loggedIn: false })
            }
        })
    }, []);

    // Get the keys
    useEffect(() => {
        if (user && signatures?.length > 0) {
            setLoading(true);
            getUserAccount(signatures[0]?.address)
                .then(acct => {
                    if (acct) {
                        const keys = filerKeys(acct, user, signatures);
                        setSignableKeys(keys);
                    } else {
                        setErrorMessage("Could not retreive transaction account information")
                    }
                    setLoading(false)
                }).catch(e => {
                    setErrorMessage(e)
                });
        }
    }, [signatures, user]);

    // Deal with dat flash and/or bad sig request id.
    if (!signatures || signatures.length === 0) {
        return (
            <div className="m-4 space-y-4">
                <div className="max-w-4xl">
                    <div>
                        <h2 className="text-xl font-semibold">Sign with Ledger (v0.9.12)</h2>
                    </div>
                    <div className="max-w-4xl">
                        User Address:
                        {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
                    </div>
                </div>
                <CadenceViewer code={signableItems[0]?.signable.voucher.cadence} args={signableItems[0]?.signable.voucher.arguments} />
                <div className="py-4">
                    <h3 className="text-lg font-semibold">Signing Keys</h3>
                    {loading && <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>}
                    {!currentUser.loggedIn && <p className="text-red-500 text-lg">Log in to get started</p>}
                    {currentUser.loggedIn && !loading && signableKeys.map(({ address, sig, keyId, weight }) => (
                        <div key={address + keyId} className="flex items-center border rounded-lg p-1 my-1">
                            <button 
                                disabled={!currentUser.loggedIn || sig} 
                                className={`w-48 px-2 py-1 text-sm rounded ${sig ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                                onClick={signTheMessage(signableItems[0]?.signable, keyId)}
                            >
                                {sig ? `Signed` : `Sign the message!`}
                            </button>
                            <AddressKeyView address={address} keyId={keyId} weight={weight} />
                        </div>
                    ))}
                </div>
                {errorMessage && <p className="text-red-500">{errorMessage}</p>}
            </div>
        );
    }

    const signTheMessage = (signable, keyId) => async () => {
        const result = await fcl.authz();
        const result2 = await result.resolve();
        // remove payload sigs for ledger signing
        signable.voucher.payloadSigs = [];
        console.log(JSON.stringify(signable))
        const signedResult = await result2.signingFunction(signable);
        console.log('signable', JSON.stringify(signable))
        console.log('signable Result', JSON.stringify(signedResult))
        // ledger returns keyId of 0, even though it signs correctly
        signedResult.keyId = keyId;
        signedResult.addr = signable.addr;
        console.log("Ledger signing message", signable, signedResult);
        await fetch(`/api/${signatureRequestId}`, {
            method: "post",
            body: JSON.stringify(signedResult),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((r) => r.json());
    };

    const AuthedState = () => (
        <div className="space-y-2">
            <div>Hello</div>
            <div className="flex items-center space-x-4">
                <div>Address: {currentUser?.addr ?? "No Address"}</div>
                <button onClick={fcl.currentUser.unauthenticate} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Log Out</button>
            </div>
        </div>
    );

    const UnauthenticatedState = () => (
        <div>
            <button onClick={fcl.logIn} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Log In</button>
        </div>
    );

    return (
        <div className="m-4 space-y-4">
            <div className="max-w-4xl">
                <div>
                    <h2 className="text-xl font-semibold">Sign with Ledger (v0.9.12)</h2>
                </div>
                <div className="max-w-4xl">
                    User Address:
                    {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
                </div>
            </div>
            <CadenceViewer code={signableItems[0]?.signable.voucher.cadence} args={signableItems[0]?.signable.voucher.arguments} />
            <div className="py-4">
                <h3 className="text-lg font-semibold">Signing Keys</h3>
                {loading && <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>}
                {!currentUser.loggedIn && <p className="text-red-500 text-lg">Log in to get started</p>}
                {currentUser.loggedIn && !loading && signableKeys.map(({ address, sig, keyId, weight }) => (
                    <div key={address + keyId} className="flex items-center border rounded-lg p-1 my-1">
                        <button 
                            disabled={!currentUser.loggedIn || sig} 
                            className={`w-48 px-2 py-1 text-sm rounded ${sig ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                            onClick={signTheMessage(signableItems[0]?.signable, keyId)}
                        >
                            {sig ? `Signed` : `Sign the message!`}
                        </button>
                        <AddressKeyView address={address} keyId={keyId} weight={weight} />
                    </div>
                ))}
            </div>
            {errorMessage && <p className="text-red-500">{errorMessage}</p>}
        </div>
    );
}
