import * as fcl from "@onflow/fcl"
import {
  Text,
  Stack,
  Button,
  CircularProgress
} from "@chakra-ui/react";
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
          setSigningMessage(`KMS Service returned error ${response}`)
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
    <>
      <Stack>
        <Button
          onClick={signPayload}
        >
          Sign Payload
        </Button>
        <Stack>
          <Text>{signingStatus}</Text>
          <Text>{signingMessage}</Text>
        </Stack>
        {isSigning && <CircularProgress size={"2rem"} isIndeterminate color="green.300" />}
      </Stack>
    </>
  );
}
