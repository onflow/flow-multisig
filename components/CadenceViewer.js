import {
    Heading,
    Text,
    Stack,
    HStack,
    Textarea,
} from "@chakra-ui/react";
export const CadenceViewer = ({ code, args }) => {
    return (
        <>
            <Stack padding="0.5rem 0">
                <Heading size="md">Cadence Code</Heading>
                <Textarea size="sm"
                    isReadOnly
                    placeholder='Cadence Script'
                    resize={'vertical'}
                    value={code}
                />
            </Stack>
            <Stack padding="0.5rem 0">
                <Heading size="md">Cadence Arguments</Heading>
                {args && args.map((arg, i) => {
                    return (
                        <HStack alignItems={"baseline"} key={i}><Text fontSize={"0.75rem"} >{arg.type}</Text><Text>{arg.value}</Text></HStack>
                    )
                })}
            </Stack>
        </>
    )
}