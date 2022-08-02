import { Table, Tbody, Td, Tfoot, Th, Tr } from "@chakra-ui/react";
import { abbrvKey } from "../utils/formatting";

export const KeysTableStatus = ({ keys, account }) => {
    const total = keys.reduce((p, k) => k.sig ? p + k.weight : p, 0);
    const accountKeys = (account?.keys || []).reduce((p, d) => ({...p, [d.index]: abbrvKey(d.publicKey)}), {})
    return (
        <Table variant='simple' size='sm'>
            <Tbody><Tr><Td>Weight</Td><Td>KeyId</Td><Td>Public Key</Td></Tr>
                {keys.map(key => {
                    return (<Tr backgroundColor={key?.sig ? 'lightGreen' : 'white'} key={`tr-${key.index}`} >
                        <Td>{key.weight}</Td>
                        <Td key={key.keyId}>{key.keyId}</Td>
                        <Td>{abbrvKey(accountKeys[key.keyId])}</Td>
                    </Tr>)
                })}
            </Tbody>
            <Tfoot border={"3px"}>
                <Tr><Th size="lg">{total}</Th><Th colspan="2">Total Weight</Th></Tr>
            </Tfoot>
        </Table>
    )
}