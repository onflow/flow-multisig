import React from "react";
import * as fcl from "@onflow/fcl";

export const AddressKeyView = ({ address, keyId, weight }) => {
  return (
    <div className="flex items-baseline">
      {address && (
        <>
          <span className="text-xs pr-0.5">Addr:</span>
          <span>{fcl.withPrefix(address)}</span>
        </>
      )}
      <span className="text-xs pl-2.5 pr-0.5">KeyId:</span>
      <span>{keyId}</span>
      {weight && <span className="text-xs pl-2.5 pr-0.5">Weight:</span>}
      <span>{weight || ""}</span>
    </div>
  );
}
