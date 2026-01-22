import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface NetworkConfig {
  usdc: string;
  ccipRouter: string;
  linkToken: string;
  chainSelector: bigint;
}

const NETWORK_CONFIGS: { [key: string]: NetworkConfig } = {
  polygon: {
    usdc: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    ccipRouter: "0x849c5ED5a80F5B408Dd4969b78c2C8fdf0565Bfe",
    linkToken: "0xb0897686c545045aFc77CF20eC7A532E3120E0F1",
    chainSelector: 4051577828743386545n,
  },
  arbitrum: {
    usdc: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    ccipRouter: "0x141fa059441E0ca23ce184B6A78bafD2A517DdE8",
    linkToken: "0xf97f4df75117a78c1A5a0DBb814Af92458539FB4",
    chainSelector: 4949039107694359620n,
  },
  polygonMumbai: {
    usdc: "0x9999f7Fea5938fD3b1E26A12c3f2fb024e194f97",
    ccipRouter: "0x1035CabC275068e0F4b745A29CEDf38E13aF41b1",
    linkToken: "0x326C977E6efc84E512bB9C30f76E30c160eD06FB",
    chainSelector: 12532609583862916517n,
  },
  arbitrumSepolia: {
    usdc: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
    ccipRouter: "0x2a9C5afB0d0e4BAb2BCdaE109EC4b0c4Be15a165",
    linkToken: "0xb1D4538B4571d411F07960EF2838Ce337FE1E80E",
    chainSelector: 3478487238524512106n,
  },
  hardhat: {
    usdc: "0x0000000000000000000000000000000000000001",
    ccipRouter: "0x0000000000000000000000000000000000000002",
    linkToken: "0x0000000000000000000000000000000000000003",
    chainSelector: 31337n,
  },
};

async function main() {
  const networkName = network.name;
  console.log(`\n🚀 Deploying Veritas contracts to ${networkName}...\n`);

  const config = NETWORK_CONFIGS[networkName];
  if (!config) {
    throw new Error(`Network ${networkName} not configured`);
  }

  const [deployer] = await ethers.getSigners();
  console.log(`📍 Deploying with account: ${deployer.address}`);
  console.log(`💰 Account balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

  // 1. Deploy SoulboundBadge
  console.log("1️⃣  Deploying VeritasSoulboundBadge...");
  const SoulboundBadge = await ethers.getContractFactory("VeritasSoulboundBadge");
  const soulboundBadge = await SoulboundBadge.deploy(
    "Veritas Reputation Badge",
    "VRB",
    "https://api.veritas.market/metadata/badges/"
  );
  await soulboundBadge.waitForDeployment();
  const soulboundBadgeAddress = await soulboundBadge.getAddress();
  console.log(`   ✅ VeritasSoulboundBadge deployed to: ${soulboundBadgeAddress}`);

  // 2. Deploy ReputationEngine
  console.log("\n2️⃣  Deploying ReputationEngine...");
  const ReputationEngine = await ethers.getContractFactory("ReputationEngine");
  const reputationEngine = await ReputationEngine.deploy(
    soulboundBadgeAddress,
    config.chainSelector
  );
  await reputationEngine.waitForDeployment();
  const reputationEngineAddress = await reputationEngine.getAddress();
  console.log(`   ✅ ReputationEngine deployed to: ${reputationEngineAddress}`);

  // 3. Deploy Escrow
  console.log("\n3️⃣  Deploying VeritasEscrow...");
  const Escrow = await ethers.getContractFactory("VeritasEscrow");
  const escrow = await Escrow.deploy(
    reputationEngineAddress,
    deployer.address, // Fee recipient
    [config.usdc] // Initial supported tokens
  );
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`   ✅ VeritasEscrow deployed to: ${escrowAddress}`);

  // 4. Deploy CrossChainBridge (skip for local network)
  let bridgeAddress = "";
  if (networkName !== "hardhat" && networkName !== "localhost") {
    console.log("\n4️⃣  Deploying VeritasCrossChainBridge...");
    const Bridge = await ethers.getContractFactory("VeritasCrossChainBridge");
    const bridge = await Bridge.deploy(
      config.ccipRouter,
      config.linkToken,
      config.usdc,
      reputationEngineAddress,
      config.chainSelector,
      deployer.address
    );
    await bridge.waitForDeployment();
    bridgeAddress = await bridge.getAddress();
    console.log(`   ✅ VeritasCrossChainBridge deployed to: ${bridgeAddress}`);
  }

  // 5. Configure roles
  console.log("\n5️⃣  Configuring roles...");
  
  // Grant MINTER_ROLE to ReputationEngine
  const MINTER_ROLE = await soulboundBadge.MINTER_ROLE();
  await soulboundBadge.grantRole(MINTER_ROLE, reputationEngineAddress);
  console.log("   ✅ Granted MINTER_ROLE to ReputationEngine");

  // Grant ESCROW_ROLE to Escrow contract
  const ESCROW_ROLE = await reputationEngine.ESCROW_ROLE();
  await reputationEngine.grantRole(ESCROW_ROLE, escrowAddress);
  console.log("   ✅ Granted ESCROW_ROLE to Escrow contract");

  // Grant CROSS_CHAIN_ROLE to Bridge
  if (bridgeAddress) {
    const CROSS_CHAIN_ROLE = await reputationEngine.CROSS_CHAIN_ROLE();
    await reputationEngine.grantRole(CROSS_CHAIN_ROLE, bridgeAddress);
    console.log("   ✅ Granted CROSS_CHAIN_ROLE to Bridge contract");
  }

  // 6. Save deployment addresses
  const deployments = {
    network: networkName,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    chainSelector: config.chainSelector.toString(),
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      VeritasSoulboundBadge: soulboundBadgeAddress,
      ReputationEngine: reputationEngineAddress,
      VeritasEscrow: escrowAddress,
      VeritasCrossChainBridge: bridgeAddress || "Not deployed",
    },
    externalContracts: {
      USDC: config.usdc,
      CCIPRouter: config.ccipRouter,
      LINK: config.linkToken,
    },
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deployments, null, 2));
  console.log(`\n📄 Deployment addresses saved to: ${deploymentPath}`);

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:                    ${networkName}`);
  console.log(`Chain ID:                   ${deployments.chainId}`);
  console.log(`VeritasSoulboundBadge:      ${soulboundBadgeAddress}`);
  console.log(`ReputationEngine:           ${reputationEngineAddress}`);
  console.log(`VeritasEscrow:              ${escrowAddress}`);
  console.log(`VeritasCrossChainBridge:    ${bridgeAddress || "N/A"}`);
  console.log("=".repeat(60));
  console.log("\n✅ Deployment complete!\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
