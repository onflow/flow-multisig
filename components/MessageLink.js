import { useCopyToClipboard } from "react-use";
import { useState } from "react";

export const MessageLink = ({ link = "", message = "", subMessage = "", disabled = false, bg = "bg-gray-200" }) => {
    const [copyTextFormUrl, setCopyTextFormUrl] = useState("Copy");
    const [, copyToClipboard] = useCopyToClipboard();
    const copyTextToClipboard = (text) => {
        setCopyTextFormUrl("Copied!")
        copyToClipboard(text);
        setTimeout(() => {
            setCopyTextFormUrl("Copy")
        }, 500)
    }

    if (disabled) return null;

    return (
        <div className={`${bg} p-2 w-full rounded-lg shadow-md`}>
            <div className="flex flex-col items-start">
                <div className="flex items-center">
                    <button 
                        className="shadow-sm text-sm px-2 py-1 bg-blue-500 text-white rounded mr-2"
                        onClick={() => copyTextToClipboard(link)}
                    >
                        {copyTextFormUrl}
                    </button>
                    <span className="text-sm">{message}</span>
                    <span className="text-sm text-blue-500 ml-1">{subMessage}</span>
                </div>
                <a 
                    className="text-blue-600 hover:underline mt-1" 
                    href={link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                >
                    {link.substring(0, 90)}...
                </a>
            </div>
        </div>
    )
}