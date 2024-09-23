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
    <div className="container mx-auto p-4 max-w-3xl">
      <h1 className="text-2xl font-bold mb-4">Signature Request</h1>
      
      {/* Authentication Section */}
      <section className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Authentication</h2>
        {!accessToken ? (
          <>
            <p className="text-blue-600 mb-2">*** Make sure to allow pop ups for this site ***</p>
            <button onClick={gGsiSignIn} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
              Google Login
            </button>
          </>
        ) : (
          <p className="text-green-600">You are logged in</p>
        )}
        {loginError && <p className="text-red-500 mt-2">{loginError}</p>}
      </section>

      {/* Key Configuration Section */}
      <section className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Key Configuration</h2>
        <label className="block mb-4">
          <span className="text-gray-700 font-medium">Full Key Path</span>
          <input
            type="text"
            className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 text-gray-900 placeholder-gray-400"
            placeholder="Enter full key path"
            onChange={(e) => handleKeyInfoUpdate(e.target.value, KEY_FULL_PATH)}
            value={full_key_path}
          />
        </label>
        <div className="mb-4">
          <div className="flex items-baseline space-x-2 mb-2">
            <span className="text-gray-700 font-medium">Signing Account:</span>
            <span className="text-gray-900">{signing_account || 'Not set'}</span>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-gray-700 font-medium">Using KeyId:</span>
            <span className="text-gray-900">{signing_keyId || 'Not set'}</span>
          </div>
        </div>
        {publicKeyStatus !== null && <p className="text-red-500 mb-4">{publicKeyStatus}</p>}
        <div className="flex space-x-2 mb-4">
          {loadingKeys && <div className="w-8 h-8 border-t-2 border-blue-500 rounded-full animate-spin"></div>}
          {!loadingKeys && signableKeys.map(k => (
            <button 
              onClick={() => handleKeyInfoUpdate(k.keyId, SIGN_KEYID)} 
              disabled={signing_keyId === k.keyId} 
              key={k.keyId}
              className={`px-3 py-2 rounded ${signing_keyId === k.keyId ? 'bg-indigo-200 text-indigo-800' : 'bg-indigo-500 text-white hover:bg-indigo-600'}`}
            >
              <AddressKeyView keyId={k.keyId} weight={k.weight} />
            </button>
          ))}
        </div>
        <button 
          onClick={() => setTogglePath(!togglePath)} 
          className="text-indigo-600 hover:text-indigo-800 hover:underline font-medium"
        >
          {togglePath ? `Hide Advanced Options` : `Show Advanced Options`}
        </button>
        {togglePath && (
          <div className="mt-4 space-y-4">
            {[
              { label: 'Project Id', key: KEY_PROJECT_ID, value: project_id },
              { label: 'Location', key: KEY_LOCATION, value: key_location },
              { label: 'Key Ring', key: KEY_RING, value: key_ring },
              { label: 'Key Name', key: KEY_NAME, value: key_name },
              { label: 'Key Version', key: KEY_VERSION, value: key_version },
            ].map(({ label, key, value }) => (
              <label key={key} className="block">
                <span className="text-gray-700 font-medium">{label}</span>
                <input
                  type="text"
                  className="mt-1 block w-full rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 px-3 py-2 text-gray-900 placeholder-gray-400"
                  placeholder={`Enter ${label}`}
                  onChange={(e) => handleKeyInfoUpdate(e.target.value, key)}
                  value={value}
                />
              </label>
            ))}
            <div className="mt-4">
              <span className="text-gray-700 font-medium">Generated Full Key Path:</span>
              <p className="mt-1 text-gray-900 bg-gray-200 p-2 rounded">{getKeyPath(userKeyInfo, true)}</p>
            </div>
          </div>
        )}
      </section>

      {/* Signable Keys Section */}
      <section className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Signable Keys</h2>
        {/* Loading indicator and signable keys buttons */}
        {publicKeyStatus && <p className="text-red-500 mt-2">{publicKeyStatus}</p>}
      </section>

      {/* Cadence Viewer Section */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Transaction Details</h2>
        <CadenceViewer code={cadencePayload} args={signatures[0]?.signable.voucher.arguments} />
      </section>

      {/* Signing Action Section */}
      <section className="mb-8 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">Sign Transaction</h2>
        <button
          disabled={!canSign || !accessToken}
          onClick={signPayload}
          className={`px-4 py-2 rounded ${!canSign || !accessToken ? 'bg-gray-300' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
        >
          Sign Payload
        </button>
        <div className="mt-4">
          <p>{signingStatus}</p>
          <p>{signingMessage}</p>
        </div>
      </section>
    </div>
  );
}
