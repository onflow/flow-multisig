import { Table, Tbody, Td, Tfoot, Th, Tr } from "@chakra-ui/react";
import { abbrvKey } from "../utils/formatting";

export const KeysTableStatus = ({ keys, account }) => {
    const total = keys.reduce((p, k) => k.sig ? p + k.weight : p, 0);
    const accountKeys = (account?.keys || []).reduce((p, d) => ({ ...p, [d.index]: abbrvKey(d.publicKey) }), {})
    return (
        <Table variant='simple' size='sm' boxShadow="1px 1px 3px">
            <Tbody><Tr><Td>Weight</Td><Td>KeyId</Td><Td>Public Key</Td></Tr>
                {[...keys].sort((a, b) => a.keyId > b.keyId ? 1 : -1).map((key, i) => {
                    return (
                        <Tr key={`tr-${key.index}-${i}`} backgroundColor={key?.sig ? 'lightGreen' : 'white'} >
                            <Td key={`${key.weight}-${i}`}>{key.weight}</Td>
                            <Td key={key.keyId}>{key.keyId}</Td>
                            <Td>{abbrvKey(accountKeys[key.keyId])}</Td>
                        </Tr>)
                })}
            </Tbody>
            <Tfoot border={"3px"}>
                <Tr><Th size="lg">{total}</Th><Th colSpan="2">Total Weight</Th></Tr>
            </Tfoot>
        </Table>
    )
}