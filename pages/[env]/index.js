import React, { useEffect, useReducer, useState } from "react";
import * as fcl from "@onflow/fcl";
import { useRouter } from 'next/router'
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  HStack,
  FormLabel,
  Heading,
  Icon,
  Input,
  Link,
  Stack,
  Text,
  Select,
  CircularProgress,
  VStack,
  Textarea,
} from "@chakra-ui/react";
import { AccountsTable } from "../../components/AccountsTable";
import { authzResolver, buildAuthz } from "../../utils/authz";

import { AddressKeyView } from "../../components/AddressKeyView"
if (typeof window !== "undefined") window.fcl = fcl;
import { useCopyToClipboard } from "react-use";
import * as t from "@onflow/types";
import { getServiceAccountFileList, getFoundationFileList, getServiceAccountFilename, getFoundationFilename } from "../../utils/cadenceLoader";

const iconFn = (color) =>
  function CustomIcon() {
    return (
      <Icon viewBox="0 0 200 200" color={color}>
        <path
          fill="currentColor"
          d="M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0"
        />
      </Icon>
    );
  };

const GreenDot = iconFn("green.500");
const RedDot = iconFn("red.500");

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

export default function MainPage() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const [authAccountAddress, setAuthAccountAddress] = useState("");
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [transferAmount, setTransferAmount] = useState("");
  const [serviceAccountFilenames, setServiceAccountFilenames] = useState([]);
  const [foundationFilenames, setFoundationFilenames] = useState([]);
  const [jsonArgs, setJsonArgs] = useState("");
  const [cadencePayload, setCadencePayload] = useState("");
  const [jsonError, setJsonError] = useState("")
  const [currentUser, setCurrentUser] = useState({
    loggedIn: false,
  });
  const [exeEffort, setExeEffort] = useState(9999)
  const [myState, copyToClipboard] = useCopyToClipboard();
  const [copyText, setCopyText] = useState("Copy");
  const [copyText2, setCopyText2] = useState("Copy");

  useEffect(() => getServiceAccountFileList().then(result => setServiceAccountFilenames(result)), [])
  useEffect(() => getFoundationFileList().then(result => setFoundationFilenames(result)), [])
  useEffect(() => {
    fcl.currentUser.subscribe((currentUser) => setCurrentUser(currentUser));
  }, []);

  const { query } = useRouter()
  const qp = new URLSearchParams(query)

  useEffect(() => {

    const fromScript = qp.get("type");
    const nameScript = qp.get("name");
    const jsonParam = qp.get("param");
    const userAccount = qp.get("acct");

    if (fromScript) {
      if (fromScript.toLocaleLowerCase() === "foundation")
        if (nameScript) {
          fetchFoundationFilename(nameScript)
        }
        else {
          if (nameScript) {
            fetchServiceAccountFilename(nameScript)
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


  const selectAccountKeys = (account, keys) => {
    if (accounts[account].enabledKeys.length !== keys.length) {
      accounts[account].enabledKeys = keys;
      setAccounts({ ...accounts })
    }
  };
  const addAuthAccountAddress = () => {
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
        setAuthAccountAddress("");
      })
      .catch((err) => {
        console.log("unexpected error occured", err);
      });
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
        });
    }
  };

  const onSubmit = async (accountKey) => {
    const account = accounts[accountKey];
    const keys = account.enabledKeys;
    if (keys.length === 0) return;
    const userDefinedArgs = jsonArgs ? JSON.parse(jsonArgs) : [];
    const authorizations = keys.map(({ index }) =>
      buildAuthz({ address: accountKey, index }, dispatch)
    );
    userDefinedArgs.map(a => console.log(a))
    const resolver = authzResolver({ address: accountKey }, keys, dispatch);
    const { transactionId } = await fcl.send([
      fcl.transaction(cadencePayload),
      fcl.args(userDefinedArgs.map(a => fcl.arg(a, fcl.t.Identity))),
      //fcl.args([fcl.arg("100.000000", t.UFix64), fcl.arg(fcl.withPrefix("0xc590d541b72f0ac1"), t.Address)]),
      //       fcl.args([fcl.arg(transferAmount || "0.0", t.UFix64), fcl.arg(fcl.withPrefix(toAddress), t.Address)]),
      fcl.proposer(authorizations[0]),
      fcl.authorizations(authorizations),
      fcl.payer(resolver),
      fcl.limit(parseInt(exeEffort)),
      ix => {
        console.log(ix)
        return ix
      }
    ]);

    account.transaction = transactionId;
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

  const getLink = (signatureRequestId) => {
    const network = getNetwork();
    return `${window.location.origin}/${network}/signatures/${signatureRequestId}`;
  };


  const getCliCommand = (signatureRequestId) => {
    const url = getCliLink(signatureRequestId);
    return `flow transactions sign --from-remote-url ${url} --signer <account>`

  }

  const getCliLink = (signatureRequestId) => {
    const network = getNetwork();
    return `${window.location.origin}/api/pending/rlp/${signatureRequestId}`;
  };


  const getFlowscanLink = (tx) => {
    const network = getNetwork();
    return `${flowscanUrls[network]}/${tx}`;
  };

  const fetchServiceAccountFilename = (filename) => {
    setCadencePayload("loading ...")
    getServiceAccountFilename(filename)
      .then(contents => setCadencePayload(contents));
  }

  const fetchFoundationFilename = (filename) => {
    setCadencePayload("loading ...")
    getFoundationFilename(filename)
      .then(contents => setCadencePayload(contents));
  }

  const copyTextToClipboard = (text, second) => {
    second ? setCopyText2("Copied!") : setCopyText("Copied!")
    copyToClipboard(text);
    setTimeout(() => {
      setCopyText("Copy")
      setCopyText2("Copy")
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

  useEffect(() => {
    const getBalance = async () => fcl.account(authAccountAddress).then(account => {
      console.log('account', account)
      if (!transferAmount) {
        const balance = (parseInt(account.balance) / 10e7) - 0.01
        setTransferAmount(balance.toFixed(8))
      }
    });
    if (authAccountAddress) {
      getBalance();
    }
  }, [authAccountAddress, transferAmount])

  const AuthedState = () => {
    return (
      <VStack>
        <Stack direction="row" spacing={4} align="center">
          <div>Address: {currentUser?.addr ?? "No Address"}</div>
          <Button onClick={fcl.unauthenticate}>Log Out</Button>
        </Stack>
      </VStack>
    );
  };

  const UnauthenticatedState = () => {
    return (
      <VStack>
        <Stack direction="row" spacing={4} align="center">
          <Button onClick={fcl.authenticate}>Log In</Button>
        </Stack>
      </VStack>
    );
  };

  return (
    <Stack minH={"100vh"} margin={"50"}>
      <Stack>
        <Stack spacing="24px">
          <Stack>
            <VStack align="start">
              <Heading>Service Account</Heading>
              {/*<Stack maxW="container.xl">
                User Address:
                {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
              </Stack>*/}

            </VStack>
          </Stack>
          <HStack>
            <FormLabel width="20%" size="sm" htmlFor="serviceAccount">From Service Account</FormLabel>
            <Select id="serviceAccount" placeholder='Select Cadence' onChange={(e) => fetchServiceAccountFilename(e.target.value)}>
              {serviceAccountFilenames.map(filename => {
                return (<option key={filename} value={filename}>{filename}</option>)
              })}
            </Select>

          </HStack>
          <HStack>
            <FormLabel width="20%" size="sm" htmlFor="foundation">From Foundation</FormLabel>
            <Select id="foundation" placeholder='Select Cadence' onChange={(e) => fetchFoundationFilename(e.target.value)}>
              {foundationFilenames.map(filename => {
                return (<option key={filename} value={filename}>{filename}</option>)
              })}
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
                        <FormLabel>Select Signing Keys</FormLabel>
                        <Text>{account}</Text>
                      </HStack>
                      <AccountsTable
                        accountKeys={accounts[account].keys}
                        setSelectedKeys={(keys) =>
                          selectAccountKeys(account, keys)
                        }
                      />
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
                    <Stack direction="row" spacing={4} align="start">
                      <Stack>
                        <Button disabled={accounts[account]?.enabledKeys?.length === 0} onClick={() => onSubmit(account)}>
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
                      </Stack>
                      {!state.inFlightRequests?.[cleanAddress(account)] &&
                        state.inFlight && (
                          <CircularProgress isIndeterminate color="green.300" />
                        )}
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
                                <Button size="sm" onClick={() => copyTextToClipboard(getLink(signatureRequestId))}>{copyText}</Button>
                                <Text fontSize='15px'>Manual CLI:</Text>
                                </HStack>
                              <Link isExternal href={getLink(signatureRequestId)}>
                                {getLink(signatureRequestId)}
                              </Link>
                            </VStack>
                          </HStack>
                          <HStack backgroundColor="lightgray" padding="0.5rem">
                            <VStack align="flex-start">
                              <HStack>
                                <Button size="sm" onClick={() => copyTextToClipboard(getCliCommand(signatureRequestId), true)}>{copyText2}</Button>
                                <Text fontSize='15px'>FLOW CLI:</Text>
                                </HStack>
                              <Text fontSize='15px'>{getCliCommand(signatureRequestId)}</Text>
                            </VStack>
                          </HStack>
                          {compositeKeys.map(({ address, sig, keyId }) => {
                            return (
                              <Flex key={address + keyId}>
                                <Box p={1}>
                                  {sig ? <GreenDot /> : <RedDot />}{" "}
                                </Box>
                                <AddressKeyView address={address} keyId={keyId} />
                              </Flex>
                            );
                          })}
                          {accounts[account] && accounts[account].transaction && (
                            <HStack><Text>Tx:</Text><Text fontSize={"15px"}>{accounts[account].transaction}</Text></HStack>
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
