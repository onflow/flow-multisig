import React, { useEffect, useReducer, useState, useMemo } from "react";
import {
    Tab,
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

export default function Desktop() {
    const [txs, setTxs] = useState(['bob', 'sue']);
    const [selectedTx, setSelectedTx] = useState(null);
    const [publicKey, setPublicKey] = useState(null);

    useEffect(() => {

    }, [])

    return (
        <Stack height={"100%"}>
            <Grid
                templateAreas={`"header header"
                  "nav main"
                  "done main"`}
                gridTemplateRows={'50px *'}
                gridTemplateColumns={'1fr 6fr'}
                gap='2'
                color='blackAlpha.700'
                fontWeight='bold'
            >
                <GridItem area={'header'} padding=".5rem">
                    <Button>{publicKey ? `Logged In` : `Login`}</Button>
                </GridItem>
                <GridItem height="95vh" bg='blue.100' area={'nav'}>
                    <Stack padding={"1rem"}>
                        {txs.length === 0 && <Text>No Transactions</Text>}
                        {txs.length > 0 && txs.map((tx) =>
                            <Stack key={tx}>
                                <Button disabled={tx === selectedTx} onClick={() => setSelectedTx(tx)}>{tx}</Button>
                            </Stack>)
                        }
                    </Stack>
                </GridItem>
                <GridItem bg='blue.100' area={"done"}>Done</GridItem>
                <GridItem bg='blue.100' area={'main'}>
                    <Stack>main</Stack>
                </GridItem>
            </Grid>
        </Stack>
    )

}