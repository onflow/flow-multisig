import {
    Box,
    Button,
    Flex,
    Heading,
    HStack,
    Icon,
    Stack,
    Text,
    VStack,
} from "@chakra-ui/react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useSWR from "swr";

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

    // Deal with dat flash and/or bad sig request id.
    if (!signatures || signatures.length === 0) {
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

    const signTheMessage = (signable) => async () => {
        const result = await fcl.authz();
        const result2 = await result.resolve();
        // remove payload sigs for ledger signing
        signable.voucher.payloadSigs = [];
        console.log(JSON.stringify(signable))
        const signedResult = await result2.signingFunction(signable);
        console.log('signable', JSON.stringify(signable))
        console.log('signable Result', JSON.stringify(signedResult))
        // ledger returns keyId of 0, even though it signs correctly
        signedResult.keyId = signable.keyId;
        signedResult.addr = signable.addr;
        console.log("Ledger signing message", signable, signedResult);
        await fetch(`/api/${signatureRequestId}`, {
            method: "post",
            body: JSON.stringify(signedResult),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((r) => r.json());
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

    const UnauthenticatedState = () => {
        return (
            <VStack>
                <Stack direction="row" spacing={4} align="center">
                    <Button onClick={fcl.logIn}>Log In</Button>
                </Stack>
            </VStack>
        );
    };

    return (
        <Stack margin="4" alignContent="left">
            <Stack maxW="container.xl" align="start">
                <Stack>
                    <Heading>Sign with Ledger</Heading>
                </Stack>
                <Stack maxW="container.xl">
                    User Address:
                    {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
                </Stack>
            </Stack>
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
                            <Button width="200px" onClick={signTheMessage(signable)}>
                                Sign the message!
                            </Button>

                            <HStack>
                                <Box>{sig ? <GreenDot /> : <RedDot />} </Box>
                                <Text>{fcl.withPrefix(address)}</Text> <Text>keyId: {keyId}</Text>
                            </HStack>
                        </HStack>
                    );
                })}
            </Stack>
        </Stack>
    );
}
