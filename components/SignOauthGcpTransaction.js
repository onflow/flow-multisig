import * as fcl from "@onflow/fcl"
import {
  Flex,
  Text,
  Stack,
  Input,
  Button,
  FormLabel,
  HStack,
  CircularProgress
} from "@chakra-ui/react";
import { useState } from "react";
import { fetchMessage, fetchSignable, getPayload, postSignatureToApi, prepareSignedEnvelope } from "../utils/kmsHelpers";

const KEY_LOC_LOCATION = "multisig:kms:location"
const KEY_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DISCOVERY_DOC = "https://docs.googleapis.com/$discovery/rest?version=v1";
const GOOGLE_API_URL = "https://apis.google.com/js/api.js";
const GOOGLE_CLIENT_URL = "https://accounts.google.com/gsi/client";
const KMS_REST_ENDPOINT = "https://cloudkms.googleapis.com/v1"
const CONTENT_KMS_REST_ENDPOINT = "https://content-cloudkms.googleapis.com/v1"
const fetcher = (...args) => fetch(...args).then((res) => res.json());

const KEY_PROJECT_ID = "keyProjectId";
const KEY_LOCATION = "keyLocation";
const KEY_RING = "keyRing";
const KEY_NAME = "keyName";
const KEY_VERSION = "keyVersion";
const SIGN_ACCT = "signingAccount";
const SIGN_KEYID = "signingKeyId";
const KEY_FULL_PATH = "keyFullPath";
//const CLIENT_ID = "769260085272-espd1f4180edgc2h4p9i1vad8pv6js26.apps.googleusercontent.com"; //process.env.REACT_APP_GOOGLE_CLIENT_ID;
const CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || "769260085272-oif0n1ut40vn6p8ldhvp4c4fdkfm3f4d.apps.googleusercontent.com";
const projectId = "my-kms-project-35857";
const SIGNING_REQUESTED = "SIGNING_REQUESTED";
const SIGNING_ERROR = "SIGNING_ERROR";
const PUBLIC_KEY_ERROR = "PUBLIC_KEY_ERROR";
const SIGNING_DONE = "SIGNING_DONE";
const noop = () => { };

export const SignOauthGcpTransaction = ({ signatureRequestId, keyId, address }) => {
  const [signingStatus, setSigningStatus] = useState(null);
  const [signingMessage, setSigningMessage] = useState(null);
  const [decodedAccount, setDecodedAccount] = useState(null);

  const signPayload = async () => {
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
        } else {
          setSigningStatus(SIGNING_ERROR);
          setSigningMessage(`KMS Service returned error ${response.status}, check network status`)
        }
      } catch (e) {
        console.log('error', e)
        setSigningStatus(SIGNING_ERROR);
        setSigningMessage(e.toString())
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
      </Stack>
    </>
  );
}
