import {
    Box,
    Button,
    CircularProgress,
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
import { AddressKeyView } from "../../../../components/AddressKeyView";
import * as fcl from "@onflow/fcl";
import { CadenceViewer } from "../../../../components/CadenceViewer";

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
    const [user, setUser] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [signableKeys, setSignableKeys] = useState([])

    const { data } = useSWR(`/api/${signatureRequestId}`, fetcher, {
        refreshInterval: 3,
    });

    const signatures = data ? data.data : [];

    const { data: signableRecord } = useSWR(`/api/${signatureRequestId}/signable`, fetcher, {
        refreshInterval: 3,
    });

    const signableItems = signableRecord ? signableRecord.data : [];

    const getUserAccount = async (address) => {
        if (!address) return null;
        let result = null;
        try {
            return await fcl.account(address);
        } catch (e) {
            console.error(e)
            setErrorMessage(e)
        }
        return result;
    };

    useEffect(() => {
        fcl.currentUser.subscribe((currentUser) => {
            if (currentUser?.addr) {
                setCurrentUser(currentUser)
                getUserAccount(currentUser.addr).then(user => {
                    if (user) {
                        setUser(user);
                        setLoading(false)
                    } else {
                        setErrorMessage("Could not load user information")
                    }
                }).catch(e => {
                    setErrorMessage(e)
                });
            } else {
                setCurrentUser({ loggedIn: false })
            }
        })
    }, []);

    // Get the keys
    useEffect(() => {
        if (user && signatures?.length > 0) {
            setLoading(true);
            getUserAccount(signatures[0]?.address)
                .then(acct => {
                    if (acct) {
                        const keys = filerKeys(acct, user, signatures);
                        setSignableKeys(keys);
                    } else {
                        setErrorMessage("Could not retreive transaction account information")
                    }
                    setLoading(false)
                }).catch(e => {
                    setErrorMessage(e)
                });
        }
    }, [signatures, user]);

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

    const signTheMessage = (signable, keyId) => async () => {
        const result = await fcl.authz();
        const result2 = await result.resolve();
        // remove payload sigs for ledger signing
        signable.voucher.payloadSigs = [];
        console.log(JSON.stringify(signable))
        const signedResult = await result2.signingFunction(signable);
        console.log('signable', JSON.stringify(signable))
        console.log('signable Result', JSON.stringify(signedResult))
        // ledger returns keyId of 0, even though it signs correctly
        signedResult.keyId = keyId;
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

    const filerKeys = (txUser, user, signatures) => {
        let keys = [];
        if (!txUser || !user) return keys;
        const userKeys = user.keys.map(k => k.publicKey)
        const signingKeys = txUser.keys.filter(k => userKeys.includes(k.publicKey));
        const keyIds = signingKeys.map(s => s.index);
        const possibleSigs = signatures.filter(s => keyIds.includes(s.keyId));
        return possibleSigs;
    }

    const AuthedState = () => {
        return (
            <VStack>
                <Stack>Hello</Stack>
                <Stack direction="row" spacing={4} align="center">
                    <div>Address: {currentUser?.addr ?? "No Address"}</div>
                    <Button onClick={fcl.currentUser.unauthenticate}>Log Out</Button>
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
                    <Heading size="md">Sign with Ledger (v0.9.12)</Heading>
                </Stack>
                <Stack maxW="container.xl">
                    User Address:
                    {currentUser.loggedIn ? <AuthedState /> : <UnauthenticatedState />}
                </Stack>
            </Stack>
            <CadenceViewer code={signableItems[0]?.signable.voucher.cadence} args={signableItems[0]?.signable.voucher.arguments} />
            <Stack padding="1rem 0">
                <Heading size="sm">Signing Keys</Heading>
                {loading && <CircularProgress size="2rem" isIndeterminate color="green.300" />}
                {!currentUser.loggedIn && <Text color={"red.400"} fontSize="lg">Log in to get started</Text>}
                {currentUser.loggedIn && !loading && signableKeys.map(({ address, sig, keyId }) => {
                    return (
                        <HStack
                            flex="1"
                            borderWidth="1px"
                            borderRadius="lg"
                            overflow="hidden"
                            padding="0.25rem"
                            key={address + keyId}
                        >
                            <Button disabled={!currentUser.loggedIn} size="sm" width="200px" onClick={signTheMessage(signableItems[0]?.signable, keyId)}>
                                Sign the message!
                            </Button>

                            <HStack>
                                <Box>{sig ? <GreenDot /> : <RedDot />} </Box>
                                <AddressKeyView address={address} keyId={keyId} />
                            </HStack>
                        </HStack>
                    );
                })}
            </Stack>
            <Stack><Text color={"red"}>{errorMessage}</Text></Stack>
        </Stack>
    );
}
