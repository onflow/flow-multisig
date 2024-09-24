import * as fcl from "@onflow/fcl"
import { useState } from "react";
import { fetchMessage, getPayload, postSignatureToApi, prepareSignedEnvelope } from "../utils/kmsHelpers";

const SIGNING_REQUESTED = "Signature Requested";
const SIGNING_ERROR = "SIGNING_ERROR";

export const SignOauthGcpTransaction = ({ signatureRequestId, keyId, address }) => {
  const [signingStatus, setSigningStatus] = useState(null);
  const [signingMessage, setSigningMessage] = useState(null);
  const [isSigning, setIsSigning] = useState(false);

  const signPayload = async () => {
    setIsSigning(true);
    setSigningStatus(SIGNING_REQUESTED);
    const rlp = await fetchMessage(signatureRequestId);
    const message = getPayload(rlp);
    if (typeof window !== 'undefined') {

      try {

        console.log('sending message', message);
        const response = await fcl.currentUser.signUserMessage(message)
        console.log('response from wallet', response);
        const sig = response && response[0]?.signature
        console.log('sig from wallet', sig)
        if (sig) {
          const env = prepareSignedEnvelope(rlp, keyId, sig);
          console.log('env', env)
          postSignatureToApi(signatureRequestId, env);
          setSigningStatus(`addr: ${address} keyId: ${keyId} Signed Successfully`);
        } else {
          setSigningStatus(SIGNING_ERROR);
          setSigningMessage(`KMS Service returned error ${response}, try logging out and in again`)
        }
      } catch (e) {
        console.log('error', e)
        setSigningStatus(SIGNING_ERROR);
        setSigningMessage(e.toString())
      } finally {
        setIsSigning(false);
      }
    }
  }

  return (
    <div className="flex flex-col space-y-4">
      <button
        onClick={signPayload}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Sign Payload
      </button>
      <div className="space-y-2">
        <p>{signingStatus}</p>
        <p>{signingMessage}</p>
      </div>
      {isSigning && (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
        </div>
      )}
    </div>
  );
}
