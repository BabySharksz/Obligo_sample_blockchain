import { useEffect, useState } from "react";
import { ethers } from "ethers";
import abi from "./BondMarket.json"; // ABI from Remix

const CONTRACT_ADDRESS = "0x311AeC9aA0C7F6e416b203901f274E015d8e8C91";

interface Bond {
  name: string;
  price: number;
  totalUnits: number;
}

interface Purchase {
  bondName: string;
  unitsBought: number;
  totalCost: number;
  buyer: string;
}

function App() {
  const [account, setAccount] = useState<string | null>(null);
  const [contract, setContract] = useState<any>(null);
  const [balance, setBalance] = useState("0");
  const [bond, setBond] = useState("GovtBondA");
  const [units, setUnits] = useState(1);
  const [brokerBalance, setBrokerBalance] = useState("0");
  const [broker, setBroker] = useState<string | null>(null);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const bondsList = ["GovtBondA", "GovtBondB", "CorporateBondC", "CorporateBondD", "MunicipalBondE"];

  // Connect wallet
  async function connectWallet() {
    if (!window.ethereum) return alert("Install MetaMask!");
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const address = await signer.getAddress();

    const bondMarket = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
    const brokerAddr = await bondMarket.broker();

    setAccount(address);
    setContract(bondMarket);
    setBroker(brokerAddr);

    await updateBalances(bondMarket, address, brokerAddr);
    await fetchBonds(bondMarket);
    await fetchPurchases(bondMarket, address);
  }

  // Detect account change in MetaMask
  useEffect(() => {
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts: string[]) => {
        if (accounts.length > 0) connectWallet();
        else setAccount(null);
      });
    }
  }, []);

  // Update balances
  async function updateBalances(contract: any, address: string, brokerAddr: string) {
    const bal = await contract.getBalance(address);
    const brokerBal = await contract.getBalance(brokerAddr);
    setBalance(bal.toString());
    setBrokerBalance(brokerBal.toString());
  }

  // Fetch bond info
  async function fetchBonds(contract: any) {
    const bondData: Bond[] = [];
    for (let b of bondsList) {
      const res = await contract.getBond(b);
      bondData.push({ name: res[0], price: Number(res[1]), totalUnits: Number(res[2]) });
    }
    setBonds(bondData);
  }

  // Fetch purchase history for current account
  async function fetchPurchases(contract: any, address: string) {
    const data = await contract.getPurchases(address);
    const formatted: Purchase[] = data.map((p: any) => ({
      bondName: p.bondName,
      unitsBought: Number(p.unitsBought),
      totalCost: Number(p.totalCost),
      buyer: p.buyer,
    }));
    setPurchases(formatted);
  }

  // Buy bond
  async function buyBond() {
    if (!contract || !account) return;
    try {
      const tx = await contract.buyBond(bond, units);
      await tx.wait();
      alert(`Bought ${units} unit(s) of ${bond}!`);
      await updateBalances(contract, account, broker!);
      await fetchBonds(contract);
      await fetchPurchases(contract, account);
    } catch (err: any) {
      console.error(err);
      alert("Transaction failed: " + (err.reason || err.message));
    }
  }

  // Seed balance
  async function seedBalanceForTrader() {
    if (!contract || !account || account.toLowerCase() !== broker?.toLowerCase()) return;
    try {
      const trader = prompt("Enter trader wallet address:");
      const amount = prompt("Enter amount to seed:");
      if (!trader || !amount) return;

      const tx = await contract.seedBalance(trader, Number(amount));
      await tx.wait();
      alert(`Seeded Rs ${amount} to ${trader}`);
      await updateBalances(contract, account, broker!);
    } catch (err: any) {
      console.error(err);
      alert("Seeding failed: " + (err.reason || err.message));
    }
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>💹 Bond Market</h1>
      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <>
          <p>Logged in as: {account}</p>
          <p>Your Balance: {balance} Rs</p>
          <p>Broker Balance: {brokerBalance} Rs</p>

          {account.toLowerCase() === broker?.toLowerCase() && (
            <button onClick={seedBalanceForTrader}>Seed Balance for Trader</button>
          )}

          <h3>Available Bonds</h3>
          <ul>
            {bonds.map((b) => (
              <li key={b.name}>
                {b.name} - Price: Rs {b.price}, Units Left: {b.totalUnits}
              </li>
            ))}
          </ul>

          <h3>Buy Bond</h3>
          <select value={bond} onChange={(e) => setBond(e.target.value)}>
            {bondsList.map((b) => (
              <option key={b}>{b}</option>
            ))}
          </select>
          <input
            type="number"
            min="0.01"
            step="0.01"
            value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
          />
          <button onClick={buyBond}>Buy</button>

          <h3>My Purchases</h3>
          <ul>
            {purchases.map((p, i) => (
              <li key={i}>
                {p.unitsBought} unit(s) of {p.bondName} for Rs {p.totalCost}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export default App;
