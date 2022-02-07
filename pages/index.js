import { useEffect, useReducer, useState } from "react";
import * as fcl from "@onflow/fcl";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormErrorMessage,
  FormHelperText,
  HStack,
  FormLabel,
  Heading,
  Icon,
  Input,
  Link,
  Stack,
  Text,
  Select
} from "@chakra-ui/react";
import { AccountsTable } from "../components/AccountsTable";
import { buildAuthz } from "../utils/authz";
import { CadencePayloadTypes, CadencePayloads } from "../utils/payloads";
if (typeof window !== "undefined") window.fcl = fcl;

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
const flowscan = "https://flowscan.org/transaction/";
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
    case "update-composite-key":
      if (!state.inFlightRequests[action.data.address]) {
        state.inFlightRequests[action.data.address] = {}
      }
      const relevantRequest =
        state.inFlightRequests[action.data.address][action.data.signatureRequestId] || [];

      return {
        ...state,
        inFlightRequests: {
          ...state.inFlightRequests,
          [action.data.address]: {
            [action.data.signatureRequestId]: upsert(
              relevantRequest,
              action.data
            ),
          }
        },
      };

    default:
      throw new Error();
  }
}

export default function MainPage() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [currentUser, setCurrentUser] = useState({
    loggedIn: false,
  });
  const [cadencePayload, setCadencePayload] = useState(CadencePayloadTypes.TransferEscrow);
  const [authAccountAddress, setAuthAccountAddress] = useState("");
  const [error, setError] = useState(null);
  const [accounts, setAccounts] = useState({});

  const selectAccountKeys = (account, keys) => {
    accounts[account].enabledKeys = keys
  }
  const addAuthAccountAddress = () => {
    fcl.account(authAccountAddress).then(({ keys }) => {
      setAccounts({
        ...accounts,
        [authAccountAddress]: {
          keys,
          enabledKeys: [],
          link: null,
          flowScanUrl: null,
        }
      })
      setAuthAccountAddress("");
    }).catch((err) => {
      console.log("unexpected error occured", err)
    });
  }

  useEffect(() => {
    fcl.currentUser.subscribe((currentUser) => setCurrentUser(currentUser));
  }, []);

  const validateAccount = (authAccountAddress) => {
    setAuthAccountAddress(authAccountAddress);
    setError(null);
    if (authAccountAddress !== "") {
      fcl.account(authAccountAddress).then(({ keys }) => {
        // used to test account validity
      }).catch(() => {
        setError("Account not valid");
      });
    }
  };

  const onSubmit = async (accountKey) => {
    const account = accounts[accountKey];
    const keys = account.enabledKeys;
    if (keys.length === 0) return;
    const payload = CadencePayloads[cadencePayload]
    const flowScanUrl = await fcl.mutate({
      cadence: payload,
      authorizations: keys.map(({ index }) =>
        buildAuthz({ address: accountKey, index }, dispatch)
      ),
    });
    account.flowScanUrl = `${flowscan}/${flowScanUrl}`;
    setAccounts({
      ...accounts,
      [accountKey]: account
    })
    console.log(flowScanUrl);
  };

  const AuthedState = () => {
    return (
      <Stack direction="row" spacing={4} align="center">
        <div>Address: {currentUser?.addr ?? "No Address"}</div>
        <Button onClick={fcl.unauthenticate}>Log Out</Button>
      </Stack>
    );
  };

  const UnauthenticatedState = () => {
    return (
      <Stack direction="row" spacing={4} align="center">
        <Button onClick={fcl.logIn}>Log In</Button>
        <Button onClick={fcl.signUp}>Sign Up</Button>
      </Stack>
    );
  };

  console.log('state', state);
  return (
    <Stack minH={"100vh"} margin={"50"}>
      <Stack>
        <Stack>
          <Stack>
            <Heading>Flow App</Heading>
          </Stack>
          <Stack maxW="container.xl">
            Proposer/Payer Address:
            {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
          </Stack>
          <Stack>
            <Stack>
              <FormControl>
                <FormLabel>Cadence Payload Type</FormLabel>
                <Select isDisabled onChange={setCadencePayload}>
                  {Object.keys(CadencePayloadTypes).map(payloadType => {
                    return (<option key={payloadType} value={payloadType} size='lg'>{CadencePayloadTypes[payloadType]}</option>)
                  })}
                </Select>
              </FormControl>
            </Stack>
            <Stack>
              <FormControl isInvalid={error}>
                <FormLabel>Authorizer Account Address</FormLabel>
                <HStack spacing={4}>
                  <Input
                    size="lg"
                    id="account"
                    placeholder="Enter Cadence payload here"
                    onChange={(e) => validateAccount(e.target.value)}
                    value={authAccountAddress}
                  />
                  <Button isDisabled={error || !authAccountAddress} onClick={addAuthAccountAddress}>Add Account</Button>
                </HStack>
                <FormErrorMessage>
                  {error}
                </FormErrorMessage>
              </FormControl>
            </Stack>
            <Stack>
              {Object.keys(accounts).map(account => {
                return (
                  <>
                    <FormControl>
                      <HStack align="baseline"><FormLabel>Select Signing Keys</FormLabel><Text>{account}</Text></HStack>
                      <AccountsTable
                        accountKeys={accounts[account].keys}
                        setSelectedKeys={(keys) => selectAccountKeys(account, keys)}
                      />
                    </FormControl>

                    <Stack direction="row" spacing={4} align="center">
                      <Button onClick={() => onSubmit(account)}>
                        Submit
                      </Button>

                      {Object.entries(state.inFlightRequests?.[cleanAddress(account)] || {}).map(
                        ([signatureRequestId, compositeKeys]) => (
                          <Stack
                            key={signatureRequestId}
                            flex="1"
                            borderWidth="1px"
                            borderRadius="lg"
                            overflow="hidden"
                            padding="4"
                          >
                            <Link
                              isExternal
                              href={
                                window.location.origin + "/signatures/" + signatureRequestId
                              }
                            >
                              Share this Link
                            </Link>
                            {compositeKeys.map(({ address, sig, keyId }) => {
                              return (
                                <Flex key={address + keyId}>
                                  <Box>{sig ? <GreenDot /> : <RedDot />} </Box>
                                  <Text>{fcl.withPrefix(address)}</Text>-<Text>{keyId}</Text>
                                </Flex>
                              );
                            })}
                          </Stack>
                        )
                      )}

                      {accounts[account].flowScanUrl &&
                        (
                          <Link isExternal href={
                            accounts[account].flowScanUrl
                          }>Transaction</Link>
                        )}
                    </Stack>
                  </>
                )
              })}
            </Stack>
          </Stack>
        </Stack>
      </Stack>

      {/*Object.entries(state.inFlightRequests).map(
        ([signatureRequestId, compositeKeys]) => (
          <Stack
            key={signatureRequestId}
            flex="1"
            borderWidth="1px"
            borderRadius="lg"
            overflow="hidden"
            padding="4"
          >
            <Link
              isExternal
              href={
                window.location.origin + "/signatures/" + signatureRequestId
              }
            >
              Share this Link
            </Link>
            {compositeKeys.map(({ address, sig, keyId }) => {
              return (
                <Flex key={address + keyId}>
                  <Box>{sig ? <GreenDot /> : <RedDot />} </Box>
                  <Text>{fcl.withPrefix(address)}</Text>-<Text>{keyId}</Text>
                </Flex>
              );
            })}
          </Stack>
        )
          )*/}
    </Stack>
  );
}
