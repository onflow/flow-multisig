import {
  Flex,
  Icon,
  Text,
  Stack,
  Input,
  Button,
  Textarea,
  FormLabel,
} from "@chakra-ui/react";
import Helmet from 'react-helmet';
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { encodeVoucherToEnvelope } from "../../../../utils/fclCLI";
import { decode } from "rlp";
import useSWR from "swr";
import * as fcl from "@onflow/fcl";
import { GoogleLogin, googleLogout, hasGrantedAllScopesGoogle, hasGrantedAnyScopeGoogle } from '@react-oauth/google';
import useScript from 'react-script-hook';
import { convert, getPayload, prepareSignedEnvelope, getDigest } from "../../../../utils/kmsSignature";

const KEY_LOC_LOCATION = "multisig:kms:location"
const KEY_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const DISCOVERY_DOC = "https://docs.googleapis.com/$discovery/rest?version=v1";
const GOOGLE_API_URL = "https://apis.google.com/js/api.js";
const GOOGLE_CLIENT_URL = "https://accounts.google.com/gsi/client";
const KMS_REST_ENDPOINT = "https://cloudkms.googleapis.com/v1"
const fetcher = (...args) => fetch(...args).then((res) => res.json());

const KEY_PROJECT_ID = "keyProjectId";
const KEY_LOCATION = "keyLocation";
const KEY_RING = "keyRing";
const KEY_NAME = "keyName";
const KEY_VERSION = "keyVersion";
const SIGN_ACCT = "signingAccount";
const SIGN_KEYID = "signingKeyId";
//const CLIENT_ID = "769260085272-espd1f4180edgc2h4p9i1vad8pv6js26.apps.googleusercontent.com"; //process.env.REACT_APP_GOOGLE_CLIENT_ID;
const CLIENT_ID = "769260085272-oif0n1ut40vn6p8ldhvp4c4fdkfm3f4d.apps.googleusercontent.com";
const projectId = "my-kms-project-35857";
const locationId = "global";
const cryptoKeyVersions = 1;
const SIGNING_REQUESTED = "SIGNING_REQUESTED";
const SIGNING_ERROR = "SIGNING_ERROR";
const SIGNING_DONE = "SIGNING_DONE";
export default function SignatureRequestPage() {
  const [rlpStatusMessage, setRLPStatusMessage] = useState("");
  const [userCred, setUserCred] = useState(null);
  const [isGapiLoaded, setIsGapiLoaded] = useState(false);
  const [accessToken, setAccessToken] = useState(null);
  const [userKeyInfo, setUserKeyInfo] = useState(
    typeof window !== "undefined" ? JSON.parse(window?.localStorage.getItem(KEY_LOC_LOCATION)) : {}
  );
  const [signingStatus, setSigningStatus] = useState(null);
  const [signingMessage, setSigningMessage] = useState(null);

  // --- api configuration --- //
  function gapiInit() {
    gapi.client.init({
      // NOTE: OAuth2 'scope' and 'client_id' parameters have moved to initTokenClient().
    })
      .then(function () {  // Load the Calendar API discovery document.
        gapi.client.load(DISCOVERY_DOC);
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


  const onTokenCallback = (response) => {
    console.log('gis init');
    console.log(response);
  }
  // --- account configuration --- //
  function gGsiLoaded() {
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
        }
      },
    }).requestAccessToken();

  }

  useScript.default({
    src: GOOGLE_CLIENT_URL
    , onload: () => gGsiLoaded()
  });

  const router = useRouter();
  const { signatureRequestId } = router.query;

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window?.localStorage.setItem(KEY_LOC_LOCATION, JSON.stringify(userKeyInfo));
    }
  }, [JSON.stringify(userKeyInfo)])

  const { data } = useSWR(`/api/${signatureRequestId}`, fetcher, {
    refreshInterval: 3,
  });

  const handleKeyInfoUpdate = (value, property) => {
    setUserKeyInfo({ ...userKeyInfo, [property]: value })
  };

  const signatures = data ? data.data : [];

  const onSuccess = (res) => {
    console.log('success:', res);
    setUserCred(res?.credential)
    const hasScope = hasGrantedAllScopesGoogle(res, KEY_SCOPE);
    const anyScope = hasGrantedAnyScopeGoogle(res, KEY_SCOPE);

    if (google.accounts.oauth2.hasGrantedAllScopes(res,
      KEY_SCOPE)) {
      console.log('user has scope')
    }

    console.log('scopes', hasScope, anyScope);
  };

  const onFailure = (err) => {
    console.log('failed:', err);
  };

  const logout = () => {
    console.log("logging user out")
    //googleLogout()
    setUserCred(null)
  }

  const updateSigninStatus = () => {
    console.log('updateSigninStatus called');
  }

  // The voucher is the same for all these. Doesn't matter which we pick here.
  const cliRLP = signatures && signatures.length
    ? encodeVoucherToEnvelope({
      ...signatures[0].signable.voucher,
      envelopeSigs: [],
      payloadSigs: [],
    })
    : "";

  const cadencePayload = cliRLP ? decode("0x" + cliRLP)[0][0] : "";
  const cadenceArguments = cliRLP ? decode("0x" + cliRLP)[0][1] : "";

  const getRestEndpoint = (userKeyInfo) => {
    const project_id = userKeyInfo?.[KEY_PROJECT_ID] || "-";
    const key_location = userKeyInfo?.[KEY_LOCATION] || "-";
    const key_ring = userKeyInfo?.[KEY_RING] || "-";
    const key_name = userKeyInfo?.[KEY_NAME] || "-";
    const key_version = userKeyInfo?.[KEY_VERSION] || "-";
    return `projects/${project_id}/locations/${key_location}/keyRings/${key_ring}/cryptoKeys/${key_name}/cryptoKeyVersions/${key_version}`;
  }

  const getSigningUrl = (userKeyInfo) => {
    return `${KMS_REST_ENDPOINT}/${getRestEndpoint(userKeyInfo)}:asymmetricSign`;
  }

  const fetchMessage = async (id) => {
    const res = await fetch(`/api/pending/rlp/${id}`, {
      headers: {
        'Content-Type': 'application/text'
      }
    });
    return res.text();
  }

  const fetchPostSignature = async (id, envelope) => {
    const res = await fetch(`/api/pending/rlp/${id}`, {
      method: "post",
      headers: {
        'Content-Type': 'application/text'
      },
      body: envelope
    });
  }

  const fetchSignature = async (accessToken, id, keyPath) => {
    const { data, error } = await fetch(
      `/api/signatures/convert`,
      {
        method: "post",
        body: JSON.stringify({ signature: kmsSignature }),
        headers: {
          "Content-Type": "application/json",
        },
      }
    ).then((r) => r.json());

    console.log('data', data, 'error', error)
  }

  const signPayload = async () => {
    setSigningStatus(SIGNING_REQUESTED);
    const kmsUrl = getSigningUrl(userKeyInfo)
    //    console.log('sss', signatures[0].signable.voucher)
    //    const message = encodeTransactionPayload(signatures[0].signable.voucher)
    //    const rlpBase64 = Buffer.from(message, 'hex').toString('base64')
    //console.log('message', rlpBase64)
    const rlp = await fetchMessage(signatureRequestId);
    console.log('rlp', rlp)
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
          const account = userKeyInfo?.[SIGN_ACCT];
          const keyId = userKeyInfo?.[SIGN_KEYID];
          setSigningMessage(`Signing Successful, account ${account}, keyId: ${keyId}`);
          // parse up result and package up sig
          const result = await response.json();
          let sig = null;

          if (response.status === 200) {
            const kmsSignature = result.signature
            console.log('kms sig', kmsSignature)
            sig = convert(kmsSignature);
            console.log('converted sig', sig)
            console.log('keyId', keyId)
            const env = prepareSignedEnvelope(rlp, keyId, sig);
            console.log('env', env)
            fetchPostSignature(signatureRequestId, env);
            // save env to backend
            // asn1 not working in browser but works in nodejs


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
  const signing_account = userKeyInfo?.[SIGN_ACCT];
  const signing_keyId = userKeyInfo?.[SIGN_KEYID];
  const canSign = project_id && key_location && key_ring && key_name && key_version && signing_account && !!String(signing_keyId);

  return (
    <>
      <Helmet>
        <meta name="google-signin-client_id" content={CLIENT_ID} />
      </Helmet>

      <Stack margin="4" alignContent="left">
        <Stack>          
          <Stack>
            <Text color={"blue"}>*** Make sure to allow pop ups for this site ***</Text>
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
            <FormLabel>Signing Account</FormLabel>
            <Input
              size="sm"
              id="signing-account"
              placeholder="Enter Account Address"
              onChange={(e) => handleKeyInfoUpdate(e.target.value, SIGN_ACCT)}
              value={signing_account}
            />
            <FormLabel>Signing KeyId</FormLabel>
            <Input
              size="sm"
              id="key-id"
              placeholder="Enter Key Id"
              onChange={(e) => handleKeyInfoUpdate(e.target.value, SIGN_KEYID)}
              value={signing_keyId}
            />
            <FormLabel>KMS: Full Key Path</FormLabel>
            <FormLabel>{getRestEndpoint(userKeyInfo)}</FormLabel>
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
            value={cadenceArguments}
          />
        </Stack>
        <Button
          disabled={!canSign}
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
