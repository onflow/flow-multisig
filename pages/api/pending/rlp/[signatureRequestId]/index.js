import { supabase } from "../../../../../utils/supabaseClient";

export default async function handler({ body, method, query }, res) {

  console.log('signature request id')
  switch (method) {
    case "GET":
      const { data, error, status } = await supabase
        .from("payloadSigs")
        .select("rlp")
        .match(query);

      // Could not find row.
      if (status === 406) {
        return res.status(404).send(error);
      }
      return res.status(200).send(data[0].rlp);
    }
}
