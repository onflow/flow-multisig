import {
  Box,
  Heading,
  Flex,
  Icon,
  Text,
  Stack,
  FormControl,
  Input,
  FormErrorMessage,
  Button,
  VStack,
  HStack,
  useClipboard,
  Link,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { encodeVoucherToEnvelope } from "../../../../utils/fclCLI";
import { decode } from "rlp";
import useSWR from "swr";
import QRCode from "react-qr-code";
import { AddressKeyView } from "../../../../components/AddressKeyView";

import * as fcl from "@onflow/fcl";

const fetcher = (...args) => fetch(...args).then((res) => res.json());

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

export default function SignatureRequestPage() {
  const [rlpStatusMessage, setRLPStatusMessage] = useState("");
  const router = useRouter();
  const { signatureRequestId } = router.query;

  const [currentUser, setCurrentUser] = useState({
    loggedIn: false,
  });
  useEffect(() => {
    fcl.currentUser.subscribe((currentUser) => setCurrentUser(currentUser));
  }, []);

  const { data } = useSWR(`/api/${signatureRequestId}`, fetcher, {
    refreshInterval: 3,
  });

  const signatures = data ? data.data : [];

  // Get the keys
  useEffect(
    () => async () => {
      if (currentUser && signatures?.length > 0) {
        console.log("currentUser", currentUser, signatures?.length);
      }
    },
    [currentUser, signatures]
  );

  // The voucher is the same for all these. Doesn't matter which we pick here.
  const cliRLP = signatures.length
    ? encodeVoucherToEnvelope({
        ...signatures[0].signable.voucher,
        envelopeSigs: [],
        payloadSigs: [],
      })
    : "";

  const { hasCopied, onCopy } = useClipboard(cliRLP);

  const onRLPChange = async (e) => {
    setRLPStatusMessage("");
    try {
      if (!e.target.value || e.target.value.length === 0) {
        return setRLPStatusMessage("");
      }
      // This just confirms it is a valid encoding.
      decode("0x" + e.target.value);

      setRLPStatusMessage("Updating signature.....");
      await fetch(`/api/${signatureRequestId}/envelope`, {
        method: "post",
        body: JSON.stringify({ envelope: e.target.value }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((r) => r.json());

      setRLPStatusMessage("Signature Updated.");
    } catch (e) {
      console.error(e);
      setRLPStatusMessage("Could not decode");
    }
  };

  const signTheMessage = (signable) => async () => {
    console.log("signable", signable);

    const result = await fcl.authz();
    const resolveResults = await result
      .resolve({}, signable)
      .then((result) => (Array.isArray(result) ? result : [result]))
      // Filter down to the addr/keyId pair the user clicked.
      .then((result) =>
        result.filter(
          (item) => item.addr === signable.addr && item.keyId === signable.keyId
        )
      );

    for (const resolveKey in resolveResults) {
      const { addr, keyId, signingFunction } = resolveResults[resolveKey];

      console.log(
        `Attempting to get signature for addr ${addr} with keyId ${keyId}`
      );
      const signedResult = await signingFunction(signable);
      await fetch(`/api/${signatureRequestId}`, {
        method: "post",
        body: JSON.stringify({
          addr,
          keyId,
          ...signedResult,
        }),
        headers: {
          "Content-Type": "application/json",
        },
      }).then((r) => r.json());
    }
  };

  const AuthedState = () => {
    return (
      <VStack>
        <Stack>Hello</Stack>
        <Stack direction="row" spacing={4} align="center">
          <div>Address: {currentUser?.addr ?? "No Address"}</div>
          <Button onClick={fcl.unauthenticate}>Log Out</Button>
        </Stack>
      </VStack>
    );
  };

  const getNetwork = () => {
    let network = "mainnet";
    if (window.location.href.indexOf("testnet")) network = "testnet";
    return network;
  };

  const BloctoRedirectUrl = (signatureRequestId) => {
    const network = getNetwork();
    return `${window.location.origin}/${network}/blocto/${signatureRequestId}`;
  };

  const UnauthenticatedState = () => {
    return (
      <VStack>
        <Stack direction="row" spacing={4} align="center">
          <Button onClick={fcl.logIn}>Log In</Button>
          <Button onClick={fcl.signUp}>Sign Up</Button>
          <Link href={BloctoRedirectUrl(signatureRequestId)}>
            Sign
          </Link>
        </Stack>
      </VStack>
    );
  };

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

  return (
    <Stack margin="4" alignContent="left">
      <Stack>
        <Heading>Key status</Heading>
        {signatures.map(({ address, sig, keyId, signable }) => {
          return (
            <HStack
              flex="1"
              borderWidth="1px"
              borderRadius="lg"
              overflow="hidden"
              padding="4"
              key={address + keyId}
            >
              <HStack>
                <Box>{sig ? <GreenDot /> : <RedDot />} </Box>
                <AddressKeyView address={address} keyId={keyId} />
              </HStack>
            </HStack>
          );
        })}
      </Stack>
      <Stack paddingTop="4">
        <HStack>
          <Heading>CLI Entry</Heading>
          <Button onClick={onCopy}>{hasCopied ? "Copied!" : "Copy"}</Button>
        </HStack>
        <Text>{cliRLP}</Text>
      </Stack>
      <Stack paddingTop={"20px"}>
                <Heading>CLI Command for signing</Heading>   
                <Stack>
                  <Text>1. Paste the above rlp in file sign-cli.rlp in the same directory as flow.json </Text>
                  <Text>{`2. replace ####### with the account entry in your flow.json that will be signing. The account address needs to be 0x${signatures[0].address}.`} </Text>
                  <Stack>
                    <Text>3. Cli command: </Text>
                    <pre>
                    flow transactions sign ./sign-cli.rlp --signer ####### --filter payload --yes --save ./sign-cli-signed.rlp
                    </pre>
                    <Text>4. paste the contents in sign-cli-signed.rlp to the text field below</Text>
                    </Stack>
                </Stack>
            </Stack>
            <Stack paddingTop="4">
        <FormControl id="selected-account-payload">
          <Heading>Paste signed rlp here</Heading>
          <Input size="lg" onChange={onRLPChange} />
          {rlpStatusMessage}
          {!!rlpStatusMessage ? (
            <FormErrorMessage>{rlpStatusMessage}</FormErrorMessage>
          ) : (
            <div> </div>
          )}
        </FormControl>
      </Stack>

    </Stack>
  );
}
