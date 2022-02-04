import { useEffect, useReducer, useState } from "react";
import * as fcl from "@onflow/fcl";
import {
  Box,
  Button,
  Flex,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  Icon,
  Input,
  Link,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import { AccountsTable } from "../components/AccountsTable";
import { buildAuthz } from "../utils/authz";

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
      const relevantRequest =
        state.inFlightRequests[action.data.signatureRequestId] || [];

      return {
        ...state,
        inFlightRequests: {
          ...state.inFlightRequests,
          [action.data.signatureRequestId]: upsert(
            relevantRequest,
            action.data
          ),
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
  const [cadencePayload, setCadencePayload] = useState(`
transaction() {
      prepare(acct: AuthAccount) {
        log("hello world")
      }
    }
  `);
  const [authAccountAddress, setAuthAccountAddress] = useState("");
  const [accountKeys, setAccountKeys] = useState([]);
  const [selectedAccountKeys, setSelectedAccountKeys] = useState([]);

  const handleAuthAccountAddressChange = (e) =>
    setAuthAccountAddress(e.target.value);
  const handleCadencePayloadChange = (e) => setCadencePayload(e.target.value);

  useEffect(() => {
    fcl.currentUser.subscribe((currentUser) => setCurrentUser(currentUser));
  }, []);

  useEffect(() => {
    if (authAccountAddress !== "") {
      fcl.account(authAccountAddress).then(({ keys }) => {
        setAccountKeys(keys);
      });
    }
  }, [authAccountAddress]);

  const onSubmit = async () => {
    const txInfo = await fcl.mutate({
      cadence: cadencePayload,
      authorizations: selectedAccountKeys.map(({ index }) =>
        buildAuthz({ address: authAccountAddress, index }, dispatch)
      ),
    });
    console.log(txInfo);
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

  const isNextDisabled =
    selectedAccountKeys.reduce((acc, r) => r.weight + acc, 0) < 1000;

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
                <FormLabel>Cadence Payload</FormLabel>
                <Textarea
                  size="lg"
                  placeholder="Enter Cadence payload here"
                  onChange={handleCadencePayloadChange}
                  value={cadencePayload}
                />
                <FormHelperText>
                  Cadence syntax is not currently validated in this app
                </FormHelperText>
              </FormControl>
            </Stack>
            <Stack>
              <FormControl>
                <FormLabel>Authorizer Account Address</FormLabel>
                <Input
                  size="lg"
                  placeholder="Enter Cadence payload here"
                  onChange={handleAuthAccountAddressChange}
                  value={authAccountAddress}
                />
              </FormControl>
            </Stack>
            <Stack>
              <FormControl>
                <FormLabel>Select Signing Keys</FormLabel>
                <AccountsTable
                  accountKeys={accountKeys}
                  setSelectedKeys={setSelectedAccountKeys}
                />
              </FormControl>
            </Stack>
          </Stack>
          <Stack>
            <Stack direction="row" spacing={4} align="center">
              <p>
                <Button isDisabled={isNextDisabled} onClick={onSubmit}>
                  Submit
                </Button>
              </p>
            </Stack>
          </Stack>
        </Stack>
      </Stack>

      {Object.entries(state.inFlightRequests).map(
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
    </Stack>
  );
}
