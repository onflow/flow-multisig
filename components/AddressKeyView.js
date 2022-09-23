import React from "react";
import * as fcl from "@onflow/fcl";
import { HStack, Text } from "@chakra-ui/react";

export const AddressKeyView = ({ address, keyId, weight }) => {

  return (
    <HStack alignItems={"baseline"}>
      <Text fontSize="12px" paddingRight={"2px"}>Addr:</Text>
      <Text>{`${fcl.withPrefix(
        address
      )}`}</Text>
      <Text fontSize="12px" paddingLeft={"10px"} paddingRight={"2px"}>KeyId:</Text>
      <Text>{`${keyId} `}</Text>
      {weight && <Text fontSize="12px" paddingLeft={"10px"} paddingRight={"2px"}>Weight:</Text>}
      <Text>{`${weight || ""} `}</Text>
    </HStack>
  );
}
