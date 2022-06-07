import React, { useEffect, useReducer, useState } from "react";
import * as fcl from "@onflow/fcl";
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

import { CadencePayloadTypes, CadencePayloads } from "../../utils/payloads";
import { AddressKeyView } from "../../components/AddressKeyView"
if (typeof window !== "undefined") window.fcl = fcl;
import { useCopyToClipboard } from "react-use";
import * as t from "@onflow/types";
import { getCadenceFilesnames, getCadenceFilename } from "../../utils/cadenceLoader";

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
  mainnet: "https://flowscan.org/transaction/",
  testnet: "https://testnet.flowscan.org/transaction/",
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

  const cadencePayload = CadencePayloadTypes.TransferEscrow;
  const [authAccountAddress, setAuthAccountAddress] = useState("");
  const [toAddress, setToAddress] = useState("0x47fd53250cc3982f");
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState({});
  const [transferAmount, setTransferAmount] = useState("");
  const [filenames, setFilenames] = useState([]);
  const [args, setArgs] = useState("");
  const [fileContents, setFileContents] = useState("");
  const [jsonError, setJsonError]  = useState("")

  useEffect(() => getCadenceFilesnames().then(result => setFilenames(result)), [])

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
            keys,
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

  const validateToAddress = (toAddress) => {
    setToAddress(toAddress)
    if (toAddress !== "") {
      fcl
        .account(toAddress)
        .then(({ keys }) => {
          // used to test account validity
        })
        .catch(() => {
          setError("To Address not valid");
        });
    }
  }
  const validateAccount = (authAccountAddress) => {
    setAuthAccountAddress(authAccountAddress);
    setError(null);
    if (authAccountAddress !== "") {
      fcl
        .account(authAccountAddress)
        .then(({ keys }) => {
          // used to test account validity
        })
        .catch(() => {
          setError("Account not valid");
        });
    }
  };

  const onSubmit = async (accountKey) => {
    const account = accounts[accountKey];
    const keys = account.enabledKeys;
    if (keys.length === 0) return;
    const payload = CadencePayloads[cadencePayload];
    console.log('keys', keys)
    const authorizations = keys.map(({ index }) =>
      buildAuthz({ address: accountKey, index }, dispatch)
    );
    const resolver = authzResolver({ address: accountKey }, keys, dispatch);
    const { transactionId } = await fcl.send([
      fcl.transaction(payload),
      fcl.args([fcl.arg(transferAmount || "0.0", t.UFix64), fcl.arg(fcl.withPrefix(toAddress), t.Address)]),
      fcl.proposer(authorizations[0]),
      fcl.authorizations(authorizations),
      fcl.payer(resolver),
      fcl.limit(9999),
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

  const getBloctoLink = (signatureRequestId) => {
    const network = getNetwork();
    return `${window.location.origin}/${network}/blocto/${signatureRequestId}`;
  };

  const getFlowscanLink = (tx) => {
    const network = getNetwork();
    return `${flowscanUrls[network]}/${tx}`;
  };

  const fetchFilename = (filename) => {
    setFileContents("loading ...")
    getCadenceFilename(filename)
      .then(contents => setFileContents(contents));
  }

  const setArgumentsValue = (value) => {
    // test if value json
    setArgs(value);
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

  return (
    <Stack minH={"100vh"} margin={"50"}>
      <Stack>
        <Stack spacing="24px">
          <Stack>
            <Heading>Service Account</Heading>
          </Stack>
          <Stack>
            <Select placeholder='Select Cadence' onChange={(e) => fetchFilename(e.target.value)}>
              {filenames.map(filename => {
                return (<option key={filename} value={filename}>{filename}</option>)
              })}
            </Select>
          </Stack>
          <Stack>
            <Textarea size="lg"
              placeholder='Cadence Script'
              resize={'vertical'}
              value={fileContents}
              onChange={(e) => setFileContents(e.target.value)} />
          </Stack>
          <Stack>
            <Input
              size="lg"
              id="arguments"
              placeholder="Enter json arguments"
              onChange={(e) => setArgumentsValue(e.target.value)}
              value={args}
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

                    <Stack direction="row" spacing={4} align="start">
                      <Stack>
                        <HStack>
                          <FormLabel htmlFor='amount'>Transfer Amount</FormLabel>
                          <Input
                            size="md"
                            id="amount"
                            placeholder="Enter Token Amount"
                            onChange={(e) => setTransferAmount(e.target.value)}
                            value={transferAmount}
                          />
                        </HStack>
                        <HStack>
                          <FormLabel htmlFor='toAddress'>Transfer to Address</FormLabel>
                          <Input
                            size="md"
                            id="toAddress"
                            placeholder="Enter To Address"
                            onChange={(e) => validateToAddress(e.target.value)}
                            value={toAddress}
                          />
                        </HStack>
                      </Stack>
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
                          <VStack align="start">
                            <Text fontSize='15px' color='purple'>Blocto:</Text> <Link isExternal href={getBloctoLink(signatureRequestId)}>
                              {getBloctoLink(signatureRequestId)}
                            </Link>
                            <Text fontSize='15px' color='purple'>CLI:</Text> <Link isExternal href={getLink(signatureRequestId)}>
                              {getLink(signatureRequestId)}
                            </Link>
                          </VStack>
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
