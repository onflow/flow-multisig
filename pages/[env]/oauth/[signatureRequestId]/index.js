import {
  Flex,
  Text,
  Stack,
  Input,
  Button,
  Textarea,
  FormLabel,
  HStack,
  CircularProgress
} from "@chakra-ui/react";
import Helmet from 'react-helmet';
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { encodeVoucherToEnvelope } from "../../../../utils/fclCLI";
import { decode } from "rlp";
import useSWR from "swr";
import useScript from 'react-script-hook';
import { convert, getPayload, prepareSignedEnvelope, getDigest, convertPublicKey, getAccountKeyId } from "../../../../utils/kmsHelpers";

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
const CLIENT_ID = "769260085272-oif0n1ut40vn6p8ldhvp4c4fdkfm3f4d.apps.googleusercontent.com";
const projectId = "my-kms-project-35857";
const SIGNING_REQUESTED = "SIGNING_REQUESTED";
const SIGNING_ERROR = "SIGNING_ERROR";
const PUBLIC_KEY_ERROR = "PUBLIC_KEY_ERROR";
const SIGNING_DONE = "SIGNING_DONE";
const noop = () => { };

export default function SignatureRequestPage() {
  const [accessToken, setAccessToken] = useState(null);
  const [userKeyInfo, setUserKeyInfo] = useState(
    typeof window !== "undefined" ? JSON.parse(window?.localStorage.getItem(KEY_LOC_LOCATION)) : {}
  );
  const [signingStatus, setSigningStatus] = useState(null);
  const [publicKeyStatus, setPublicKeyStatus] = useState(null);
  const [signingMessage, setSigningMessage] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [togglePath, setTogglePath] = useState(false);

  // --- api configuration --- //
  function gapiInit() {
    window?.gapi.client.init({
      // NOTE: OAuth2 'scope' and 'client_id' parameters have moved to initTokenClient().
    })
      .then(function () {  // Load the Calendar API discovery document.
        window?.gapi.client.load(DISCOVERY_DOC);
      });
  }
  const gAPILoaded = () => {
    console.log('loaded', GOOGLE_API_URL);
    if (typeof window !== 'undefined') {
      window?.gapi.load('client', gapiInit)
    }
  }

  useScript.default({
    src: GOOGLE_API_URL
    , onload: () => gAPILoaded()
  });

  // --- account configuration --- //
  function gGsiSignIn() {
    console.log('loaded', GOOGLE_CLIENT_URL)
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: KEY_SCOPE,
      prompt: 'consent',
      callback: (tokenResponse) => {
        console.log(tokenResponse, tokenResponse?.access_token)
        if (google.accounts.oauth2.hasGrantedAllScopes(tokenResponse,
          KEY_SCOPE)) {
          console.log('user has scope, saving access token')
          setAccessToken(tokenResponse.access_token)
        } else {
          setLoginError(`account needs scope ${KEY_SCOPE}`)
        }
      },
    }).requestAccessToken();

  }

  useScript.default({
    src: GOOGLE_CLIENT_URL
    , onload: noop
  });

  const router = useRouter();
  const { signatureRequestId } = router.query;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window?.localStorage.setItem(KEY_LOC_LOCATION, JSON.stringify(userKeyInfo));
    }
  }, [JSON.stringify(userKeyInfo)])

  const { data } = useSWR(`/api/${signatureRequestId}/signable`, fetcher);

  const handleKeyInfoUpdate = (value, property) => {
    setUserKeyInfo({ ...userKeyInfo, [property]: value })
  };

  const signatures = data ? data.data : [];

  // The voucher is the same for all these. Doesn't matter which we pick here.
  const cliRLP = signatures && signatures.length
    ? encodeVoucherToEnvelope({
      ...signatures[0].signable.voucher,
      envelopeSigs: [],
      payloadSigs: [],
    })
    : "";

  const decodedMsg = cliRLP ? decode("0x" + cliRLP) : null;
  const cadencePayload = decodedMsg ? decodedMsg[0][0] : "";
  const cadenceArguments = decodedMsg ? decodedMsg[0][1] : "";
  const decodedAccount = decodedMsg ? "0x" + decodedMsg[0][7].toString("hex") : ""

  const getKeyPath = (userKeyInfo, generated = false) => {
    if (userKeyInfo?.[KEY_FULL_PATH] && !generated) return userKeyInfo[KEY_FULL_PATH];
    const project_id = userKeyInfo?.[KEY_PROJECT_ID] || "-";
    const key_location = userKeyInfo?.[KEY_LOCATION] || "-";
    const key_ring = userKeyInfo?.[KEY_RING] || "-";
    const key_name = userKeyInfo?.[KEY_NAME] || "-";
    const key_version = userKeyInfo?.[KEY_VERSION] || "-";
    return `projects/${project_id}/locations/${key_location}/keyRings/${key_ring}/cryptoKeys/${key_name}/cryptoKeyVersions/${key_version}`;
  }

  const getSigningUrl = (userKeyInfo) => {
    return `${KMS_REST_ENDPOINT}/${getKeyPath(userKeyInfo)}:asymmetricSign`;
  }

  const getPublicKeyUrl = (userKeyInfo) => {
    return `${CONTENT_KMS_REST_ENDPOINT}/${getKeyPath(userKeyInfo)}/publicKey`;
  }

  const fetchMessage = async (id) => {
    const res = await fetch(`/api/pending/rlp/${id}`, {
      headers: {
        'Content-Type': 'application/text'
      }
    });
    return res.text();
  }

  const postSignatureToApi = async (id, envelope) => {
    const res = await fetch(`/api/pending/rlp/${id}`, {
      method: "post",
      headers: {
        'Content-Type': 'application/text'
      },
      body: envelope
    });
  }

  const signPayload = async () => {
    setSigningStatus(SIGNING_REQUESTED);
    const kmsUrl = getSigningUrl(userKeyInfo)
    const rlp = await fetchMessage(signatureRequestId);
    const message = getPayload(rlp);
    if (typeof window !== 'undefined') {

      try {
        const response = await fetch(kmsUrl, {
          method: "POST",
          cache: "no-cache",
          headers: {
            'authorization': 'Bearer ' + accessToken,
            'Content-Type': 'application/json',
          },
          redirect: 'follow',
          body: JSON.stringify({
            digest: getDigest(message),
          })
        }).catch(e => {
          console.log('error', e)
          setSigningStatus(SIGNING_ERROR);
          setSigningMessage(e.toString())
        })
        if (response.status === 200) {
          setSigningStatus(SIGNING_DONE)
          // TODO: put on helper to parse out account info
          const account = decodedAccount;
          const keyId = userKeyInfo?.[SIGN_KEYID];
          setSigningMessage(`Signing Successful, account ${account}, keyId: ${keyId}`);
          // parse up result and package up sig
          const result = await response.json();
          let sig = null;

          if (response.status === 200) {
            const kmsSignature = result.signature
            sig = convert(kmsSignature);
            const env = prepareSignedEnvelope(rlp, keyId, sig);
            postSignatureToApi(signatureRequestId, env);
          } else {
            setSigningStatus(SIGNING_ERROR);
            setSigningMessage(`KMS Service returned error ${response.status}, check network status`)
          }
        }

      } catch (e) {
        console.log('error', e)
        setSigningStatus(SIGNING_ERROR);
        setSigningMessage(e.toString())
      }

    }
  }

  const getKeyId = async () => {
    setPublicKeyStatus("")
    const account = decodedAccount;
    handleKeyInfoUpdate("-", SIGN_KEYID)
    const url = getPublicKeyUrl(userKeyInfo)
    const response = await fetch(url, {
      method: "GET",
      cache: "no-cache",
      headers: {
        'authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      redirect: 'follow',
    }).catch(e => {
      console.log('error', e)
      setPublicKeyStatus(PUBLIC_KEY_ERROR);
    })
    if (response?.status === 200) {
      const { pem } = await response.json();
      console.log('result', pem)
      const flowPublicKey = await convertPublicKey(pem);
      console.log('flow public key', flowPublicKey)
      console.log('userKeyInfo', userKeyInfo)
      let keyId = await getAccountKeyId(account, flowPublicKey)
      if (!keyId) {
        setPublicKeyStatus("KeyId not found for this account");
        handleKeyInfoUpdate(0, SIGN_KEYID)
      }
      handleKeyInfoUpdate(keyId, SIGN_KEYID)
    }
  }
  // Deal with dat flash and/or bad sig request id.
  if (!cliRLP) {
    return (
      <Stack margin={"50"}>
        <Flex
          flex="1"
          borderWidth="1px"
          borderRadius="lg"
          overflow="hidden"
          padding="4"
        >
          <Text>
            There does not appear to be an active signature request id
            {signatureRequestId}
          </Text>
        </Flex>
      </Stack>
    );
  }

  const project_id = userKeyInfo?.[KEY_PROJECT_ID];
  const key_location = userKeyInfo?.[KEY_LOCATION];
  const key_ring = userKeyInfo?.[KEY_RING];
  const key_name = userKeyInfo?.[KEY_NAME];
  const key_version = userKeyInfo?.[KEY_VERSION];
  const signing_account = decodedAccount;
  const signing_keyId = userKeyInfo?.[SIGN_KEYID];
  const full_key_path = userKeyInfo?.[KEY_FULL_PATH]
  const canSign = !!full_key_path || (project_id && key_location && key_ring && key_name && key_version && signing_account && !!String(signing_keyId));

  return (
    <>
      <Helmet>
        <meta name="google-signin-client_id" content={CLIENT_ID} />
      </Helmet>

      <Stack margin="4" alignContent="left">
        <Stack>
          <Stack>
            {!accessToken && <Text color={"blue"}>*** Make sure to allow pop ups for this site ***</Text>}
            {!accessToken && <Button onClick={gGsiSignIn}>Google Login</Button>}
            {accessToken && <Text>You are logged in</Text>}
            {loginError && <Text color={"red"}>{loginError}</Text>}
            <FormLabel>Full Key Path</FormLabel>
            <Input
              size="sm"
              id="full-key-path"
              placeholder="Full key Path"
              onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_FULL_PATH)}
              value={full_key_path}
            />
            <FormLabel>Signing Account</FormLabel>
            <Text
              size="sm"
            >{signing_account}</Text>
            <FormLabel>Signing KeyId</FormLabel>
            {publicKeyStatus !== null && <Text color={"red"}>{publicKeyStatus}</Text>}
            <HStack>
              <Button size={"sm"} disabled={!accessToken} onClick={() => getKeyId()}>Lookup KeyId</Button>
              {signing_keyId === "-" && <CircularProgress size={"2rem"} isIndeterminate color="green.300" />}
              <Input
                size="sm"
                id="key-id"
                placeholder="Enter Key Id"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, SIGN_KEYID)}
                value={signing_keyId}
              />
            </HStack>
            <Stack><Button size="sm" onClick={() => setTogglePath(!togglePath)}>{togglePath ? `Hide Advanced` : `Advanced`}</Button></Stack>
            {togglePath && <Stack>
              <FormLabel>Project Id</FormLabel>
              <Input
                size="sm"
                id="project-id"
                placeholder="Enter ProjectId"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_PROJECT_ID)}
                value={project_id}
              />
              <FormLabel>Loction</FormLabel>
              <Input
                size="sm"
                id="location"
                placeholder="Enter Location"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_LOCATION)}
                value={key_location}
              />
              <FormLabel>Key Ring</FormLabel>
              <Input
                size="sm"
                id="key-ring"
                placeholder="Enter Key Ring Name"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_RING)}
                value={key_ring}
              />
              <FormLabel>Key Name</FormLabel>
              <Input
                size="sm"
                id="key-name"
                placeholder="Enter Key Name"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_NAME)}
                value={key_name}
              />
              <FormLabel>Key Version</FormLabel>
              <Input
                size="sm"
                id="key-version"
                placeholder="Enter Key Version"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_VERSION)}
                value={key_version}
              />
              <FormLabel>Full Key Path <Text display={"inline-block"} color="orange">(only used if Full Key Path input is empty)</Text></FormLabel>
              <FormLabel>{getKeyPath(userKeyInfo, true)}</FormLabel>
            </Stack>}
          </Stack>
        </Stack>
        <Stack>
          <FormLabel>Cadence Code</FormLabel>
          <Textarea size="md"
            placeholder='Cadence Script'
            resize={'vertical'}
            value={cadencePayload}
            onChange={() => { }} />
        </Stack>
        <Stack>
          <FormLabel>Cadence Arguments</FormLabel>
          <Input
            size="md"
            id="arguments"
            placeholder="Cadence Arguments"
            onChange={() => { }}
            value={`[${cadenceArguments}]`}
          />
        </Stack>
        <Button
          disabled={!canSign || !accessToken}
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
