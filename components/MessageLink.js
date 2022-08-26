import { useCopyToClipboard } from "react-use";
import { Link, VStack, Button, HStack, Text } from "@chakra-ui/react";
import { useState } from "react";

export const MessageLink = ({ link = "", message = "", subMessage = "" }) => {
    const [copyTextFormUrl, setCopyTextFormUrl] = useState("Copy");
    const [myState, copyToClipboard] = useCopyToClipboard();
    const copyTextToClipboard = (text) => {
        setCopyTextFormUrl("Copied!")
        copyToClipboard(text);
        setTimeout(() => {
            setCopyTextFormUrl("Copy")
        }, 500)
      }

    return (
        <VStack align="flex-start">
        <HStack>
          <Button size="sm" onClick={() => copyTextToClipboard(link)}>{copyTextFormUrl}</Button>
          <Text fontSize='15px'>{message}</Text><Text color="blue">{subMessage}</Text>
        </HStack>
        <Link isExternal href={link}>
          {link.substring(0, 90)}...
        </Link>
      </VStack>
    )
}