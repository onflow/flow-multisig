import React from "react";
import * as fcl from "@onflow/fcl";
import { HStack, Text } from "@chakra-ui/react";

export const AddressKeyView = ({ address, keyId }) => {

  return (
    <HStack>
      <Text fontSize="18px" paddingRight={"2px"}>Addr:</Text>
      <Text>{`${fcl.withPrefix(
        address
      )}`}</Text>
      <Text fontSize="18px" paddingLeft={"10px"} paddingRight={"2px"}>KeyId:</Text>
      <Text>{`${keyId} `}{keyId === 1 ? `(Ledger)` : null}</Text>
    </HStack>
  );
}
