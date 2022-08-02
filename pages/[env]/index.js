import React, { useEffect, useReducer, useState, useMemo } from "react";
import * as fcl from "@onflow/fcl";
import { useRouter } from 'next/router'
import {
  Button,
  FormControl,
  FormErrorMessage,
  HStack,
  FormLabel,
  Heading,
  Input,
  Link,
  Stack,
  Text,
  Select,
  CircularProgress,
  VStack,
  Textarea,
} from "@chakra-ui/react";
import { KeysTableSelector } from "../../components/KeysTableSelector";
import { KeysTableStatus } from "../../components/KeysTableStatus";
import { CountdownTimer } from "../../components/CountdownTimer";
import { authzManyKeyResolver, buildSinglaAuthz } from "../../utils/authz";
import { abbrvKey } from "../../utils/formatting";

if (typeof window !== "undefined") window.fcl = fcl;
import { useCopyToClipboard } from "react-use";
import { getServiceAccountFileList, getFoundationFileList, getServiceAccountFilename, getFoundationFilename } from "../../utils/cadenceLoader";

const flowscanUrls = {
  mainnet: "https://flowscan.org/transaction",
  testnet: "https://testnet.flowscan.org/transaction",
};
const cleanAddress = (address) => address.replace("0x", "");

function upsert(array, element) {
  const i = array.findIndex(
    (_element) =>
      _element.keyId === element.keyId && _element.address === element.address
  );
  if (i > -1) array[i] = element;
  else array.push(element);
  return array;
}

const initialState = {
  compositeKeys: [],
  signatureRequestId: "",
  inFlightRequests: {},
  inFlight: false,
};

function reducer(state, action) {
  switch (action.type) {
    case "in-flight":
      return {
        ...state,
        inFlight: action.data.inFlight,
      };
    case "update-composite-key":
      if (!state.inFlightRequests[action.data.address]) {
        state.inFlightRequests[action.data.address] = {};
      }
      const relevantRequest =
        state.inFlightRequests[action.data.address][
        action.data.signatureRequestId
        ] || [];

      return {
        ...state,
        inFlight: false,
        inFlightRequests: {
          ...state.inFlightRequests,
          [action.data.address]: {
            [action.data.signatureRequestId]: upsert(
              relevantRequest,
              action.data
            ),
          },
        },
      };

    default:
      throw new Error();
  }
}

const FOUNDATION = "foundation";
const SERVICE_ACCOUNT = "serviceAccount";
const MAX_ALLOWED_BLOCKS = 600;
const SECONDS_PER_BLOCK = 1;

export default function MainPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [authAccountAddress, setAuthAccountAddress] = useState("");
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [serviceAccountFilenames, setServiceAccountFilenames] = useState([]);
  const [foundationFilenames, setFoundationFilenames] = useState([]);
  const [jsonArgs, setJsonArgs] = useState("");
  const [cadencePayload, setCadencePayload] = useState("");
  const [jsonError, setJsonError] = useState("")
  const [exeEffort, setExeEffort] = useState(9999)
  const [myState, copyToClipboard] = useCopyToClipboard();
  const [copyText2, setCopyText2] = useState("Copy");
  const [copyTextFormUrl, setCopyTextFormUrl] = useState("Copy");
  const [scriptName, setScriptName] = useState("");
  const [scriptType, setScriptType] = useState("");
  const [selectedProposalKey, setProposalKey] = useState(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => getServiceAccountFileList().then(result => setServiceAccountFilenames(result)), [])
  useEffect(() => getFoundationFileList().then(result => setFoundationFilenames(result)), [])

  const { query } = useRouter()
  const qp = new URLSearchParams(query)

  useEffect(() => {

    const fromScript = qp.get("type");
    const namedScript = qp.get("name");
    const jsonParam = qp.get("param");
    const userAccount = qp.get("acct");
    const exeLimit = qp.get("limit");

    if (exeLimit) {
      setExeEffort(parseInt(exeLimit));
    }

    if (fromScript) {
      if (fromScript.toLocaleLowerCase() === FOUNDATION) {
        if (namedScript) {
          fetchFoundationFilename(namedScript)
          setScriptName(namedScript);
          setScriptType(FOUNDATION);
        }
      } else {
        if (namedScript) {
          fetchServiceAccountFilename(namedScript)
          setScriptName(namedScript);
          setScriptType(SERVICE_ACCOUNT);
        }
      }
    }
    if (jsonParam) {
      setJsonArgs(jsonParam)
    }
    if (userAccount) {
      validateAccount(userAccount);
      addAuthAccountAddress();
    }
  }, [query])

  const addAuthAccountAddress = () => {
    if (authAccountAddress) {
      fcl
        .account(authAccountAddress)
        .then(({ keys }) => {
          setAccounts({
            ...accounts,
            [authAccountAddress]: {
              keys: keys.filter(k => !k.revoked),
              enabledKeys: [],
              link: null,
              flowScanUrl: null,
            },
          });
        })
        .catch((err) => {
          console.log("unexpected error occured", err);
        });
    }
  };

  const validateAccount = (authAccountAddress) => {
    setAuthAccountAddress(authAccountAddress);
    setError(null);
    if (authAccountAddress !== "") {
      fcl
        .account(authAccountAddress)
        .then(({ keys }) => {
          // used to test account validity
        })
        .catch((e) => {
          // only log out error
          console.log(e);
          setError("Invalid Account Address");
        });
    }
  };

  const onSubmit = async (accountKey) => {
    const account = accounts[accountKey];
    const keys = account.keys;
    if (selectedProposalKey === null) return;
    // selected key is proposer
    const proposalKey = account.keys.find(k => k.index === selectedProposalKey)
    if (!proposalKey) return;

    const userDefinedArgs = jsonArgs ? JSON.parse(jsonArgs) : [];
    const authorizations = [authzManyKeyResolver({ address: accountKey }, proposalKey.index, keys, dispatch)];
    const resolver = authzManyKeyResolver({ address: accountKey }, proposalKey.index, keys, dispatch);
    const resolveProposer = buildSinglaAuthz({ address: accountKey, ...proposalKey }, proposalKey.index, keys, dispatch);

    setCountdown(new Date().getTime() + (MAX_ALLOWED_BLOCKS * SECONDS_PER_BLOCK * 1000));
    const { transactionId } = await fcl.send([
      fcl.transaction(cadencePayload),
      fcl.args(userDefinedArgs.map(a => fcl.arg(a, fcl.t.Identity))),
      //fcl.args([fcl.arg("100.000000", t.UFix64), fcl.arg(fcl.withPrefix("0xc590d541b72f0ac1"), t.Address)]),
      //       fcl.args([fcl.arg(transferAmount || "0.0", t.UFix64), fcl.arg(fcl.withPrefix(toAddress), t.Address)]),
      fcl.proposer(resolveProposer),
      fcl.authorizations(authorizations),
      fcl.payer(resolver),
      fcl.limit(parseInt(exeEffort)),
      ix => {
        console.log(ix)
        return ix
      }
    ]);

    account.transaction = transactionId;
    if (transactionId) setCountdown(0);
    setAccounts({
      ...accounts,
      [accountKey]: account,
    });
  };

  const getNetwork = () => {
    let network = "mainnet";
    if (window.location.href.indexOf("testnet") > -1) network = "testnet";
    return network;
  };

  const getFormUrlLink = () => {
    const network = getNetwork();
    const url = `${window.location.origin}/${network}?type=${scriptType}&name=${scriptName}&param=${jsonArgs}&acct=${authAccountAddress}&limit=${exeEffort}`;
    return encodeURI(url);
  };

  const getCliCommand = (signatureRequestId) => {
    const url = getCliLink(signatureRequestId);
    return `flow transactions sign --from-remote-url ${url} --signer <account>`

  }

  const getCliLink = (signatureRequestId) => {
    const url = `${window.location.origin}/api/pending/rlp/${signatureRequestId}`;
    return encodeURI(url);
  };


  const getFlowscanLink = (tx) => {
    const network = getNetwork();
    return `${flowscanUrls[network]}/${tx}`;
  };

  const fetchServiceAccountFilename = (filename) => {
    setScriptName(filename);
    setScriptType(SERVICE_ACCOUNT);
    setCadencePayload("loading ...")
    getServiceAccountFilename(filename)
      .then(contents => setCadencePayload(contents));
  }

  const fetchFoundationFilename = (filename) => {
    setScriptName(filename);
    setScriptType(FOUNDATION);
    setCadencePayload("loading ...")
    getFoundationFilename(filename)
      .then(contents => setCadencePayload(contents));
  }

  const copyTextToClipboard = (text, setTextMethod) => {
    setTextMethod("Copied!")
    copyToClipboard(text);
    setTimeout(() => {
      setTextMethod("Copy")
    }, 500)
  }

  const setArgumentsValue = (value) => {
    // test if value json
    setJsonArgs(value);
    let errorString = "";
    try {
      JSON.parse(value);
    } catch (e) {
      errorString = e.toString();
    }
    setJsonError(errorString)
  }

  const getDropdownOptions = (filenames, scriptName, isSelected) => {
    return filenames.map(filename => {
      const selected = filename === scriptName ? "selected" : ""
      if (selected && isSelected)
        return (<option key={filename} value={filename} selected>{filename}</option>)
      else
        return (<option key={filename} value={filename}>{filename}</option>)
    })

  }
 
  return (
    <Stack minH={"100vh"} margin={"50"}>
      <Stack>
        <Stack spacing="24px">
          <Stack>
            <VStack align="start">
              <Heading>Service Account</Heading>
            </VStack>
          </Stack>
          <HStack>
            <FormLabel width="20%" size="sm" htmlFor="serviceAccount">From Service Account</FormLabel>
            <Select id="serviceAccount" placeholder='Select Cadence' onChange={(e) => fetchServiceAccountFilename(e.target.value)}>
              {getDropdownOptions(serviceAccountFilenames, scriptName, scriptType === SERVICE_ACCOUNT)}
            </Select>

          </HStack>
          <HStack>
            <FormLabel width="20%" size="sm" htmlFor="foundation">From Foundation</FormLabel>
            <Select id="foundation" placeholder='Select Cadence' onChange={(e) => fetchFoundationFilename(e.target.value)}>
              {getDropdownOptions(foundationFilenames, scriptName, scriptType === FOUNDATION)}
            </Select>

          </HStack>
          <Stack>
            <Textarea size="lg"
              placeholder='Cadence Script'
              resize={'vertical'}
              value={cadencePayload}
              onChange={(e) => setCadencePayload(e.target.value)} />
          </Stack>
          <Stack>
            <Input
              size="lg"
              id="arguments"
              placeholder="Enter json arguments"
              onChange={(e) => setArgumentsValue(e.target.value)}
              value={jsonArgs}
            />
            <Text color='tomato'>{jsonError}</Text>
          </Stack>
          <Stack spacing="24px">
            <Stack>
              <FormControl isInvalid={error}>
                <FormLabel>Service Account Address</FormLabel>
                <HStack spacing={4}>
                  <Button
                    isDisabled={error || !authAccountAddress}
                    onClick={addAuthAccountAddress}
                  >
                    Add Account
                  </Button>
                  <Input
                    size="lg"
                    id="account"
                    placeholder="Enter Authorized Account"
                    onChange={(e) => validateAccount(e.target.value)}
                    value={authAccountAddress}
                  />
                </HStack>
                <FormErrorMessage>{error}</FormErrorMessage>
              </FormControl>
            </Stack>
            <Stack>
              {Object.keys(accounts).map((account) => {
                return (
                  <React.Fragment key={account}>
                    <FormControl>
                      <HStack align="baseline">
                        <FormLabel>Select Proposal Key</FormLabel>
                        <Text>{account}</Text>
                      </HStack>
                      <Stack>
                        <KeysTableSelector keys={accounts[account].keys} selectedKey={selectedProposalKey} setKey={setProposalKey} />
                      </Stack>
                    </FormControl>
                    <Stack>
                      <HStack>
                        <FormControl>
                          <FormLabel htmlFor="executeLimit">Execution Limit:</FormLabel>
                          <Input
                            size="sm"
                            id="executeLimit"
                            placeholder="Enter Execute Limit"
                            onChange={((e) => setExeEffort(e.target.value))}
                            value={exeEffort}
                          />
                        </FormControl>
                      </HStack>
                    </Stack>
                    <Stack spacing={4} align="start">
                      <Stack backgroundColor="lightgray" padding="0.5rem" width="100%">
                        <VStack align="flex-start">
                          <HStack>
                            <Button size="sm" onClick={() => copyTextToClipboard(getFormUrlLink(), setCopyTextFormUrl)}>{copyTextFormUrl}</Button>
                            <Text fontSize='15px'>Page URL</Text>
                          </HStack>
                          <Link isExternal href={getFormUrlLink()}>
                            {getFormUrlLink().substring(0, 90)}...
                          </Link>
                        </VStack>
                      </Stack>
                      <HStack>
                        <Button disabled={selectedProposalKey === null || state.inFlightRequests?.[cleanAddress(account)]} onClick={() => onSubmit(account)}>
                          Generate Link
                        </Button>
                        {accounts[account].transaction && (
                          <Link
                            isExternal
                            href={getFlowscanLink(
                              accounts[account].transaction
                            )}
                          >
                            <Button colorScheme='pink'>Transaction</Button>
                          </Link>

                        )}
                        {!state.inFlightRequests?.[cleanAddress(account)] &&
                          state.inFlight && (
                            <CircularProgress isIndeterminate color="green.300" />
                          )}
                      </HStack>

                      {Object.entries(
                        state.inFlightRequests?.[cleanAddress(account)] || {}
                      ).map(([signatureRequestId, compositeKeys]) => (
                        <Stack
                          key={signatureRequestId}
                          flex="1"
                          borderWidth="1px"
                          borderRadius="lg"
                          overflow="hidden"
                          padding="4"
                        >
                          <HStack align="center">
                            <Text fontSize='20px' color='black'>Signature Request Id:</Text>
                            <Text align={"center"} fontSize='15px' >{signatureRequestId}</Text>
                          </HStack>
                          <HStack backgroundColor="lightgray" padding="0.5rem">
                            <VStack align="flex-start">
                              <HStack>
                                <Button size="sm" onClick={() => copyTextToClipboard(getCliCommand(signatureRequestId), setCopyText2)}>{copyText2}</Button>
                                <Text fontSize='15px'>FLOW CLI:</Text>
                              </HStack>
                              <Text fontSize='15px'>{getCliCommand(signatureRequestId)}</Text>
                            </VStack>
                          </HStack>
                          <CountdownTimer endTime={countdown} />
                          <Text fontSize='20px'>Incoming Signatures:</Text>
                          <KeysTableStatus keys={compositeKeys} account={accounts[account]} />
                          {accounts[account] && accounts[account].transaction && (
                            <HStack><Text>Tx Id:</Text><Text fontSize={"15px"}>{accounts[account].transaction}</Text></HStack>
                          )}
                        </Stack>
                      ))}
                    </Stack>
                  </React.Fragment>
                );
              })}
            </Stack>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  );
}
