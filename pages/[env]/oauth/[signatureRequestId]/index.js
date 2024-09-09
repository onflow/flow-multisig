import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { encodeVoucherToEnvelope } from "../../../../utils/fclCLI";
import { decode } from "rlp";
import useSWR from "swr";
import useScript from 'react-script-hook';
import { convert, getPayload, prepareSignedEnvelope, getDigest, convertPublicKey, getMatchingAccountKeys, postSignatureToApi, fetchMessage } from "../../../../utils/kmsHelpers";
import { CadenceViewer } from "../../../../components/CadenceViewer";
import { AddressKeyView } from "../../../../components/AddressKeyView";

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

export default function SignatureRequestPage() {
  const [accessToken, setAccessToken] = useState(null);
  const [userKeyInfo, setUserKeyInfo] = useState(
    typeof window !== "undefined" ? JSON.parse(window?.localStorage.getItem(KEY_LOC_LOCATION)) : {}
  );
  const [signingStatus, setSigningStatus] = useState(null);
  const [publicKeyStatus, setPublicKeyStatus] = useState(null);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [signingMessage, setSigningMessage] = useState(null);
  const [loginError, setLoginError] = useState(null);
  const [togglePath, setTogglePath] = useState(false);
  const [cadencePayload, setCadencePayload] = useState(null);
  const [decodedAccount, setDecodedAccount] = useState(null);
  const [signableKeys, setSignableKeys] = useState([]);

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
    google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: KEY_SCOPE,
      prompt: 'consent',
      callback: (tokenResponse) => {
        if (google.accounts.oauth2.hasGrantedAllScopes(tokenResponse,
          KEY_SCOPE)) {
          setAccessToken(tokenResponse.access_token)
          getKeyId(tokenResponse.access_token)
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

  useEffect(() => {
    if (signatures && signatures.length > 0) {
      // The voucher is the same for all these. Doesn't matter which we pick here.
      const cliRLP = signatures && signatures.length
        ? encodeVoucherToEnvelope({
          ...signatures[0].signable.voucher,
          envelopeSigs: [],
          payloadSigs: [],
        })
        : "";

      const decodedMsg = cliRLP ? decode("0x" + cliRLP) : null;
      const cp = decodedMsg ? decodedMsg[0][0] : "";
      const da = decodedMsg ? "0x" + decodedMsg[0][7].toString("hex") : ""
      setCadencePayload(cp)
      setDecodedAccount(da)
    }
  }, [signatures])

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

  const getKeyId = async (accessToken) => {
    if (!accessToken) {
      setPublicKeyStatus("error with authentication credentials")
      return;
    }
    setPublicKeyStatus("")
    setLoadingKeys(true);
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
    }).finally(() => {
      setLoadingKeys(false);
    })

    if (response?.status === 200) {
      const { pem } = await response.json();
      const flowPublicKey = await convertPublicKey(pem);
      let keys = await getMatchingAccountKeys(account, flowPublicKey)
      if (!keys || keys.length === 0) {
        setPublicKeyStatus("No signing keys found for this account");
        handleKeyInfoUpdate(0, SIGN_KEYID)
      }
      const primaryKey = keys[0]
      handleKeyInfoUpdate(primaryKey.keyId, SIGN_KEYID)
      setSignableKeys(keys)
    }
  }
  // Deal with dat flash and/or bad sig request id.
  if (signatures && signatures.length === 0) {
    return (
      <div className="m-4 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p>
            There does not appear to be an active signature request id
            {signatureRequestId}
          </p>
        </div>
      </div>
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
    <div className="m-4 space-y-4">
      <div className="space-y-2">
        {!accessToken && <p className="text-blue-600">*** Make sure to allow pop ups for this site ***</p>}
        {!accessToken && <button onClick={gGsiSignIn} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Google Login</button>}
        {accessToken && <p>You are logged in</p>}
        {loginError && <p className="text-red-500">{loginError}</p>}
        <label className="block">
          <span className="text-gray-700">Full Key Path</span>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            placeholder="Full key Path"
            onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_FULL_PATH)}
            value={full_key_path}
          />
        </label>
        <div className="flex items-baseline space-x-2">
          <span className="text-sm">Signing Account:</span>
          <span>{signing_account}</span>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-sm">Using KeyId:</span>
          <span>{signing_keyId}</span>
        </div>
        {publicKeyStatus !== null && <p className="text-red-500">{publicKeyStatus}</p>}
        <div className="flex space-x-2">
          {loadingKeys && <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>}
          {!loadingKeys && signableKeys.map(k => (
            <button 
              onClick={() => handleKeyInfoUpdate(k.keyId, SIGN_KEYID)} 
              disabled={signing_keyId === k.keyId} 
              key={k.keyId}
              className={`px-2 py-1 rounded ${signing_keyId === k.keyId ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
            >
              <AddressKeyView keyId={k.keyId} weight={k.weight} />
            </button>
          ))}
        </div>
        <button onClick={() => setTogglePath(!togglePath)} className="text-blue-500 hover:underline">
          {togglePath ? `Hide Advanced` : `Advanced`}
        </button>
        {togglePath && (
          <div className="space-y-2">
            <label className="block">
              <span className="text-gray-700">Project Id</span>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Enter ProjectId"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_PROJECT_ID)}
                value={project_id}
              />
            </label>
            <label className="block">
              <span className="text-gray-700">Loction</span>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Enter Location"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_LOCATION)}
                value={key_location}
              />
            </label>
            <label className="block">
              <span className="text-gray-700">Key Ring</span>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Enter Key Ring Name"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_RING)}
                value={key_ring}
              />
            </label>
            <label className="block">
              <span className="text-gray-700">Key Name</span>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Enter Key Name"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_NAME)}
                value={key_name}
              />
            </label>
            <label className="block">
              <span className="text-gray-700">Key Version</span>
              <input
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                placeholder="Enter Key Version"
                onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_VERSION)}
                value={key_version}
              />
            </label>
            <div className="flex items-baseline space-x-2">
              <span className="text-gray-700">Full Key Path</span>
              <span className="text-orange-500">(only used if Full Key Path input is empty)</span>
            </div>
            <p>{getKeyPath(userKeyInfo, true)}</p>
          </div>
        )}
      </div>
      <CadenceViewer code={cadencePayload} args={signatures[0]?.signable.voucher.arguments} />
      <button
        disabled={!canSign || !accessToken}
        onClick={signPayload}
        className={`px-4 py-2 rounded ${!canSign || !accessToken ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
      >
        Sign Payload
      </button>
      <div>
        <p>{signingStatus}</p>
        <p>{signingMessage}</p>
      </div>
    </div>
  );
}
