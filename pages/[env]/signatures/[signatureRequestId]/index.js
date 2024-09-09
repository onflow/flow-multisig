import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { encodeVoucherToEnvelope } from "../../../../utils/fclCLI";
import { decode } from "rlp";
import useSWR from "swr";
import QRCode from "react-qr-code";
import { AddressKeyView } from "../../../../components/AddressKeyView";
import * as fcl from "@onflow/fcl";
import { CopyToClipboard } from 'react-copy-to-clipboard';

const fetcher = (...args) => fetch(...args).then((res) => res.json());

const iconFn = (color) =>
  function CustomIcon() {
    return (
      <svg viewBox="0 0 200 200" className={`w-4 h-4 ${color}`}>
        <path
          fill="currentColor"
          d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0"
        />
      </svg>
    );
  };

const GreenDot = iconFn("text-green-500");
const RedDot = iconFn("text-red-500");

export default function SignatureRequestPage() {
  const [rlpStatusMessage, setRLPStatusMessage] = useState("");
  const router = useRouter();
  const { signatureRequestId } = router.query;

  const [currentUser, setCurrentUser] = useState({
    loggedIn: false,
  });
  useEffect(() => {
    fcl.currentUser.subscribe((currentUser) => setCurrentUser(currentUser));
  }, []);

  console.log('signatureRequestId', signatureRequestId)
  const { data } = useSWR(`/api/${signatureRequestId}/signable`, fetcher, {
    refreshInterval: 3,
  });

  console.log('data', data);
  const signatures = data ? data.data : [];

  console.log('sign', signatures)
  // Get the keys
  useEffect(() => {
    if (currentUser && signatures?.length > 0) {
      console.log("currentUser", currentUser, signatures?.length);
    }
  }, [currentUser, signatures]);

  // The voucher is the same for all these. Doesn't matter which we pick here.
  const cliRLP = signatures.length
    ? encodeVoucherToEnvelope({
      ...signatures[0].signable.voucher,
      envelopeSigs: [],
      payloadSigs: [],
    })
    : "";

  const [copiedText, setCopiedText] = useState("");

  const onRLPChange = async (e) => {
    setRLPStatusMessage("");
    try {
      if (!e.target.value || e.target.value.length === 0) {
        return setRLPStatusMessage("");
      }
      // This just confirms it is a valid encoding.
      decode("0x" + e.target.value);

      setRLPStatusMessage("Updating signature.....");
      await fetch(`/api/${signatureRequestId}/envelope`, {
        method: "post",
        body: JSON.stringify({ envelope: e.target.value }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((r) => r.json());

      setRLPStatusMessage("Signature Updated.");
    } catch (e) {
      console.error(e);
      setRLPStatusMessage("Could not decode");
    }
  };

  const signTheMessage = (signable) => async () => {
    console.log("signable", signable);

    const result = await fcl.authz();
    const resolveResults = await result
      .resolve({}, signable)
      .then((result) => (Array.isArray(result) ? result : [result]))
      // Filter down to the addr/keyId pair the user clicked.
      .then((result) =>
        result.filter(
          (item) => item.addr === signable.addr && item.keyId === signable.keyId
        )
      );

    for (const resolveKey in resolveResults) {
      const { addr, keyId, signingFunction } = resolveResults[resolveKey];

      console.log(
        `Attempting to get signature for addr ${addr} with keyId ${keyId}`
      );
      const signedResult = await signingFunction(signable);
      await fetch(`/api/${signatureRequestId}`, {
        method: "post",
        body: JSON.stringify({
          addr,
          keyId,
          ...signedResult,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((r) => r.json());
    }
  };

  const AuthedState = () => {
    return (
      <div className="space-y-4">
        <div>Hello</div>
        <div className="flex items-center space-x-4">
          <div>Address: {currentUser?.addr ?? "No Address"}</div>
          <button onClick={fcl.unauthenticate} className="px-4 py-2 bg-blue-500 text-white rounded">Log Out</button>
        </div>
      </div>
    );
  };

  const getNetwork = () => {
    let network = "mainnet";
    if (window.location.href.indexOf("testnet")) network = "testnet";
    return network;
  };

  const BloctoRedirectUrl = (signatureRequestId) => {
    const network = getNetwork();
    return `${window.location.origin}/${network}/blocto/${signatureRequestId}`;
  };

  const UnauthenticatedState = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <button onClick={fcl.logIn} className="px-4 py-2 bg-blue-500 text-white rounded">Log In</button>
          <button onClick={fcl.signUp} className="px-4 py-2 bg-blue-500 text-white rounded">Sign Up</button>
          <a href={BloctoRedirectUrl(signatureRequestId)} className="px-4 py-2 bg-blue-500 text-white rounded">
            Sign with Blocto
          </a>
        </div>
      </div>
    );
  };

  // Deal with dat flash and/or bad sig request id.
  if (!cliRLP) {
    return (
      <div className="m-12">
        <div className="border border-gray-200 rounded-lg p-4">
          <p>
            There does not appear to be an active signature request id
            {signatureRequestId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="m-4">
      <div>
        <h2 className="text-2xl font-bold mb-4">Key status</h2>
        {signatures.map(({ address, sig, keyId, signable }) => (
          <div
            key={address + keyId}
            className="flex items-center p-4 border rounded-lg mb-2"
          >
            <div className="flex items-center">
              <div>{sig ? <GreenDot /> : <RedDot />}</div>
              <AddressKeyView address={address} keyId={keyId} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="flex items-center mb-2">
          <h2 className="text-2xl font-bold mr-4">CLI Entry</h2>
          <CopyToClipboard text={cliRLP} onCopy={() => setCopiedText("cliRLP")}>
            <button className="px-4 py-2 bg-blue-500 text-white rounded">
              {copiedText === "cliRLP" ? "Copied!" : "Copy"}
            </button>
          </CopyToClipboard>
        </div>
        <p>{cliRLP}</p>
      </div>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">CLI Command for signing</h2>
        {/* ... keep existing content ... */}
      </div>

      <div className="mt-4">
        <h2 className="text-2xl font-bold mb-2">Paste signed rlp here</h2>
        <input
          className="w-full p-2 border rounded"
          onChange={onRLPChange}
        />
        <p className="text-red-500">{rlpStatusMessage}</p>
      </div>

      {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
    </div>
  );
}