import { Table, Tbody, Td, Tr } from "@chakra-ui/react";
import { abbrvKey } from "../utils/formatting";

export const KeysTableSelector = ({ keys, selectedKey, setKey }) => {

    const selectKey = (keyId) => {
        if (setKey) setKey(keyId)
    }
    if (!keys || keys.length === 0) {
        return null
    }

    return (
        <Table variant='simple' size='sm'>
            <Tbody><Tr><Td>KeyId</Td><Td>Weight</Td><Td>Public Key</Td></Tr>
            {keys.map((key, i) => {
                return (<Tr cursor={"pointer"} backgroundColor={selectedKey === key.index ? 'lightGreen' : 'white'} key={`tr-${key.index}-${i}`} onClick={() => selectKey(key.index)} >
                    <Td key={key.index}>{key.index}</Td>
                    <Td>{key.weight}</Td>
                    <Td>{abbrvKey(key.publicKey)}</Td>
                </Tr>)
            })}
            </Tbody>
        </Table>
    )
}