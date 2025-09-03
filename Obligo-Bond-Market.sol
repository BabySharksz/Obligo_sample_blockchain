// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BondMarket {
    address public broker;

    struct Bond {
        string name;
        uint price;     // price per full bond unit
        uint totalUnits; // total number of bond units available
    }

    struct Purchase {
        string bondName;
        uint unitsBought; // fractional units allowed
        uint totalCost;
        address buyer;
    }

    mapping(string => Bond) public bonds;
    mapping(address => Purchase[]) public purchaseHistory;
    mapping(address => uint) public balances;

    event BondPurchased(address buyer, string bondName, uint unitsBought, uint totalCost);
    event BalanceSeeded(address trader, uint amount);

    constructor() {
        broker = msg.sender;

        // Initialize 5 bonds with example names and prices (realistic for Indian bond market)
        bonds["GovtBondA"] = Bond("GovtBondA", 1000, 100); // price per unit, total units
        bonds["GovtBondB"] = Bond("GovtBondB", 2000, 50);
        bonds["CorporateBondC"] = Bond("CorporateBondC", 1500, 75);
        bonds["CorporateBondD"] = Bond("CorporateBondD", 2500, 60);
        bonds["MunicipalBondE"] = Bond("MunicipalBondE", 1200, 80);
    }

    // Broker seeds balances for traders
    function seedBalance(address trader, uint amount) public {
        require(msg.sender == broker, "Only broker can seed balances");
        balances[trader] = amount;
        emit BalanceSeeded(trader, amount);
    }

    // Buy bond (fractional units allowed)
    function buyBond(string memory _bondName, uint _units) public {
        Bond storage bond = bonds[_bondName];
        uint totalCost = bond.price * _units;

        require(bond.totalUnits >= _units, "Not enough units available");
        require(balances[msg.sender] >= totalCost, "Insufficient balance");

        // Deduct from buyer
        balances[msg.sender] -= totalCost;

        // Credit broker
        balances[broker] += totalCost;

        // Reduce available units
        bond.totalUnits -= _units;

        // Record purchase
        purchaseHistory[msg.sender].push(Purchase(_bondName, _units, totalCost, msg.sender));

        emit BondPurchased(msg.sender, _bondName, _units, totalCost);
    }

    // View all purchases of a trader
    function getPurchases(address trader) public view returns (Purchase[] memory) {
        return purchaseHistory[trader];
    }

    // Get balance of a wallet
    function getBalance(address wallet) public view returns (uint) {
        return balances[wallet];
    }

    // Get bond details
    function getBond(string memory _bondName) public view returns (string memory, uint, uint) {
        Bond memory bond = bonds[_bondName];
        return (bond.name, bond.price, bond.totalUnits);
    }
}
