import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { PROXY_URL, setupConfig } from "./config";
import { config } from "@onflow/fcl";

export default function Layout({ children }) {
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const [savedValue, setSavedValue] = useState("");

  const env = router.query.env || router.pathname.split("/")[1];
  useEffect(() => {
    const getAccessNode = async () => {
      const accessNode = await config().get("accessNode.api");
      const url = accessNode.replace(PROXY_URL, "")
      setInputValue(url);
      setSavedValue(url);
    };
    if (["mainnet", "testnet"].includes(env)) {
      setupConfig(env);
      getAccessNode();
    } else {
      console.log("No valid environment detected for FCL setup");
    }
  }, [env]);

  const handleSave = () => {
    // if input is http then need to route through proxy
    const newUrl = inputValue.startsWith("http://") ? `${PROXY_URL}${inputValue}` : inputValue;
    console.log("Saving:", newUrl);
    config().put("accessNode.api", newUrl);
    setSavedValue(inputValue);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="flex flex-row items-center justify-between w-full px-8 py-2">
        <div className="flex flex-row items-center">
          <input
            className="border border-gray-300 rounded-md px-2 py-1"
            size="50"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter Access Node API URL"
          />
          <button
            className="bg-blue-500 text-white mx-2 px-3 py-1 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSave}
            disabled={inputValue === savedValue}
          >
            Save
          </button>
        </div>
        <h1 className="text-xl font-bold whitespace-nowrap">Multisig Webapp</h1>
      </div>
      <div>{children}</div>
    </div>
  );
}
