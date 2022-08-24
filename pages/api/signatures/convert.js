import { fromBER } from "asn1js"
import * as kms from '@google-cloud/kms';

const toArrayBuffer = (buffer) => {
  const ab = new ArrayBuffer(buffer.length)
  const view = new Uint8Array(ab)
  for (let i = 0; i < buffer.length; ++i) {
    view[i] = buffer[i]
  }
  return ab
}

const getHex = (value) => {
  const buf = Buffer.from(value.valueBlock.valueHex)
  return buf.slice(Math.max(buf.length - 32, 0))
}

const parseSignature = (sig) => {
  const buf = Buffer.from(sig, "base64");
  const { result } = fromBER(toArrayBuffer(buf))
  const values = (result).valueBlock.value

  const r = getHex(values[0])
  const s = getHex(values[1])
  return Buffer.concat([r, s]).toString("hex");
}

export default async function handler({ body, method, query }, res) {
  const client = new kms.KeyManagementServiceClient();
  switch (method) {

    case "POST":
      const { signature: sig = "" } = body;
      if (sig === "") res.status(500).json({ error: "signature empty" });

      let newSig = null;
      let error = null;
      try {
        newSig = parseSignature(sig);
      } catch (e) {
        console.error(e.toString())
        error = e.toString()
      }

      return res.status(200).json({
        data: newSig,
        error
      });

    default:
      return res.status(405);
  }
}
