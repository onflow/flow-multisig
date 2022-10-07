import React, { useEffect, useState } from "react";
import * as fcl from "@onflow/fcl"
import {
    Header,
    Tabs,
    TabPanel,
    TabPanels,
    TabList,
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
    Grid,
    GridItem,
} from "@chakra-ui/react";
import { MAINNET, TESTNET } from "../utils/constants";
import { GetPublicKeyAccounts, SetupFclConfiguration } from "../utils/configurations";
import { getPrimaryPublicKeys, getUserAccount } from "../utils/accountHelper";
import { abbrvKey } from "../utils/formatting";

const networks = [MAINNET, TESTNET];

export default function Dashboard() {
    const [txs, setTxs] = useState([]);
    const [signed, setSigned] = useState(['done one', 'done two'])
    const [selectedTx, setSelectedTx] = useState(null);
    const [currentUserAddr, setCurrentUserAddr] = useState(null);
    const [network, setNetwork] = useState(MAINNET);
    const [accounts, setAccounts] = useState([]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(async () => {
        fcl.unauthenticate();
        if (!network) return;
        SetupFclConfiguration(fcl, network);
        fcl.currentUser().subscribe(async currentUser => {
            console.log('current user', currentUser)
            setCurrentUserAddr(currentUser.addr ? fcl.withPrefix(currentUser.addr) : null)

            if (currentUser.addr) {
                const accts = await processUserAccounts(currentUser.addr);
                console.log('accts', accts);
                const transactions = await lookUpSignableTransactions(accts);
                setTxs(transactions)
            }
        })
    }, [network])

    const processUserAccounts = async (address) => {
        if (!address) return;

        const acct = await getUserAccount(address)
        let accountInfos = []
        console.log('acct', acct)
        const publicKeys = getPrimaryPublicKeys(acct)
        console.log('public keys', publicKeys)
        for (let i = 0; i < publicKeys.length; i++) {
            const publicKey = publicKeys[i];
            const accounts = await GetPublicKeyAccounts(network, publicKey);
            console.log('public key', publicKey, accounts)
            accountInfos = [...accountInfos, ...accounts];
        }
        console.log('filtered accounts', accountInfos)
        setAccounts(accountInfos)
        return accountInfos;
    }

    const lookUpSignableTransactions = async (accounts) => {
        let signableIds = []
        for (let i = 0; i < accounts.length; i++) {
            const { address, keyId } = accounts[i];
            const items = await fetchSignableRequestIds(address, keyId);
            const ids = (items?.data || []).map(i => i.signatureRequestId)
            console.log('ids', ids)
            signableIds = [...signableIds, ...ids]
        }
        return signableIds;
    }

    const logout = async () => fcl.unauthenticate();
    const login = async () => {
        console.log('logging in')
        try {
            fcl.authenticate()
        } catch (e) {
            console.log(e)
        }
    }

    const fetchSignableRequestIds = async (addr, keyId) => {
        const res = await fetch(`/api/pending/${addr}/${keyId}`, {
            headers: {
                'Content-Type': 'application/text'
            }
        });
        const ids = res.json();
        console.log('signable ids', ids);
        return ids;
    }

    return (
        <Stack margin="0.25rem" height={"99vh"} overflowY="hidden">
            <Grid
                templateAreas={`"header header"
                  "nav main"
                  "done main"`}
                gridTemplateRows={'50px 50% 1fr'}
                gridTemplateColumns={'1fr 6fr'}
                gap='1'
                color='blackAlpha.700'
                fontWeight='bold'
            >
                <GridItem bg='blue.100' pl='2' area={'header'} padding=".5rem">
                    <HStack>
                        <Select size={"sm"} width="120px" id="network" value={network} onChange={(e) => setNetwork(e.target.value)}>
                            {networks.map(n => (<option key={n} value={n} selected>{n}</option>))}
                        </Select>
                        {!currentUserAddr && <Button size={"sm"} onClick={() => login()}>Log In</Button>}
                        {currentUserAddr && (<HStack><Button size={"sm"} onClick={() => logout()}>Logout</Button><Text fontSize={"0.75rem"}>{currentUserAddr}</Text></HStack>)}
                    </HStack>
                </GridItem>
                <GridItem pl='2' height="95vh" bg='blue.100' area={'nav'}>
                    <Stack padding={"1rem"}>
                        <Heading bg="green.100" padding="0.5rem 1rem" size="sm" textAlign={"center"}>PENDING</Heading>
                        {txs.length === 0 && <Heading padding="0.5rem 1rem" size="sm">NO TRANSACTIONS</Heading>}
                        {txs.length > 0 && txs.map((tx) =>
                            <Stack key={tx}>
                                <Button justifyContent={"start"} height="1.5rem" disabled={tx === selectedTx} onClick={() => setSelectedTx(tx)}>{abbrvKey(tx)}</Button>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'main'} rowSpan={2}>
                    <Stack>main</Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={"done"}>
                    <Stack padding={"1rem"}>
                        <Heading bg="green.100" padding="0.5rem 1rem" width="100%" size="sm" textAlign={"center"}>SIGNED</Heading>
                        {signed.length > 0 && signed.map(s =>
                            <Stack key={s}><Text>{s}</Text></Stack>)
                        }
                    </Stack>
                </GridItem>

            </Grid>
        </Stack>
    )

}