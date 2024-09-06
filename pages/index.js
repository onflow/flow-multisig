export default function MainPage() {
  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <h1 className="text-2xl font-bold">Pick your network!</h1>
      <div className="flex flex-col space-y-2">
        <a
          href="./mainnet/"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Mainnet
        </a>
        <a
          href="./testnet/"
          className="text-blue-600 hover:text-blue-800 underline"
        >
          Testnet
        </a>
      </div>
    </div>
  );
}
