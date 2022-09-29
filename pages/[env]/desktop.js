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
    GridItem
} from "@chakra-ui/react";
import { send as httpSent } from "@onflow/transport-http";

export default function Desktop() {
    const [txs, setTxs] = useState(['bob', 'sue']);
    const [signed, setSigned] = useState(['done one', 'done two'])
    const [selectedTx, setSelectedTx] = useState(null);
    const [publicKey, setPublicKey] = useState(null);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(async () => {
        fcl.config({
            "accessNode.api": "https://rest-mainnet.onflow.org",
            "discovery.wallet": "http://localhost:3001/local/authn",
            "sdk.transport": httpSent,
            "0xFUNGIBLETOKENADDRESS": "0xf233dcee88fe0abe",
            "0xFLOWTOKENADDRESS": "0x1654653399040a61",
            "app.detail.icon": "https://flow-multisig-git-service-account-onflow.vercel.app/icon.png",
            "app.detail.title": "Multisig Webapp",
          })
        console.log('set new discovery wallet ')
    }, [])

    const login = async () => {
        console.log('logging in')
        try {
            fcl.logIn()
        }catch(e){
            console.log(e)
        }
        
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
                <GridItem pl='2' area={'header'} padding=".5rem">
                    <Button onClick={() => login()}>{publicKey ? `Logged In` : `Login`}</Button>
                </GridItem>
                <GridItem pl='2' height="95vh" bg='blue.100' area={'nav'}>
                    <Stack padding={"1rem"}>
                        <Heading size="md">PENDING</Heading>
                        {txs.length === 0 && <Heading size="md">NO TRANSACTIONS</Heading>}
                        {txs.length > 0 && txs.map((tx) =>
                            <Stack key={tx}>
                                <Button height="1.5rem" disabled={tx === selectedTx} onClick={() => setSelectedTx(tx)}>{tx}</Button>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={'main'} rowSpan={2}>
                    <Stack>main</Stack>
                </GridItem>
                <GridItem pl='2' bg='blue.100' area={"done"}>
                    <Stack padding={"1rem"}>
                    <Heading justifyContent={"center"} width="100%" size="md">SIGNED</Heading>
                    {signed.length > 0 && signed.map(s =>
                        <Stack key={s}><Text>{s}</Text></Stack>)
                    }
                    </Stack>
                </GridItem>

            </Grid>
        </Stack>
    )

}