import { useCopyToClipboard } from "react-use";
import { Stack, Link, VStack, Button, HStack, Text } from "@chakra-ui/react";
import { useState } from "react";

export const MessageLink = ({ link = "", message = "", subMessage = "", disabled = false }) => {
    const [copyTextFormUrl, setCopyTextFormUrl] = useState("Copy");
    const [myState, copyToClipboard] = useCopyToClipboard();
    const copyTextToClipboard = (text) => {
        setCopyTextFormUrl("Copied!")
        copyToClipboard(text);
        setTimeout(() => {
            setCopyTextFormUrl("Copy")
        }, 500)
    }

    if (disabled) return null;

    return (
        <Stack backgroundColor="lightgray" padding="0.5rem" width="100%" borderRadius="0.5rem" boxShadow="3px 3px 5px">
            <VStack align="flex-start">
                <HStack>
                    <Button boxShadow="1px 1px 5px" size="sm" onClick={() => copyTextToClipboard(link)}>{copyTextFormUrl}</Button>
                    <Text fontSize='15px'>{message}</Text><Text color="blue">{subMessage}</Text>
                </HStack>
                <Link isExternal href={link}>
                    {link.substring(0, 90)}...
                </Link>
            </VStack>
        </Stack>
    )
}