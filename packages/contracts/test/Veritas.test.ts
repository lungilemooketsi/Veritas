import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { 
  VeritasSoulboundBadge,
  ReputationEngine,
  VeritasEscrow
} from "../typechain-types";

describe("Veritas Marketplace", function () {
  let soulboundBadge: VeritasSoulboundBadge;
  let reputationEngine: ReputationEngine;
  let escrow: VeritasEscrow;
  let mockUSDC: any;
  
  let owner: SignerWithAddress;
  let seller: SignerWithAddress;
  let buyer: SignerWithAddress;
  let disputeResolver: SignerWithAddress;

  const INITIAL_USDC_BALANCE = ethers.parseUnits("10000", 6);
  const TRADE_AMOUNT = ethers.parseUnits("100", 6);

  beforeEach(async function () {
    [owner, seller, buyer, disputeResolver] = await ethers.getSigners();

    // Deploy Mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUSDC = await MockERC20.deploy("USD Coin", "USDC", 6);
    await mockUSDC.waitForDeployment();

    // Mint USDC to buyer
    await mockUSDC.mint(buyer.address, INITIAL_USDC_BALANCE);

    // Deploy SoulboundBadge
    const SoulboundBadge = await ethers.getContractFactory("VeritasSoulboundBadge");
    soulboundBadge = await SoulboundBadge.deploy(
      "Veritas Reputation Badge",
      "VRB",
      "https://api.veritas.market/metadata/badges/"
    );

    // Deploy ReputationEngine
    const ReputationEngine = await ethers.getContractFactory("ReputationEngine");
    reputationEngine = await ReputationEngine.deploy(
      await soulboundBadge.getAddress(),
      31337n // Local chain ID
    );

    // Deploy Escrow
    const Escrow = await ethers.getContractFactory("VeritasEscrow");
    escrow = await Escrow.deploy(
      await reputationEngine.getAddress(),
      owner.address,
      [await mockUSDC.getAddress()]
    );

    // Configure roles
    const MINTER_ROLE = await soulboundBadge.MINTER_ROLE();
    await soulboundBadge.grantRole(MINTER_ROLE, await reputationEngine.getAddress());

    const ESCROW_ROLE = await reputationEngine.ESCROW_ROLE();
    await reputationEngine.grantRole(ESCROW_ROLE, await escrow.getAddress());

    const DISPUTE_RESOLVER_ROLE = await escrow.DISPUTE_RESOLVER_ROLE();
    await escrow.grantRole(DISPUTE_RESOLVER_ROLE, disputeResolver.address);
  });

  describe("SoulboundBadge (EIP-5192)", function () {
    it("should mint a badge and mark it as locked", async function () {
      const MINTER_ROLE = await soulboundBadge.MINTER_ROLE();
      await soulboundBadge.grantRole(MINTER_ROLE, owner.address);

      await soulboundBadge.mintBadge(
        seller.address,
        1, // Bronze tier
        10,
        400,
        31337n
      );

      const tokenId = 1;
      expect(await soulboundBadge.ownerOf(tokenId)).to.equal(seller.address);
      expect(await soulboundBadge.locked(tokenId)).to.be.true;
    });

    it("should prevent token transfers", async function () {
      const MINTER_ROLE = await soulboundBadge.MINTER_ROLE();
      await soulboundBadge.grantRole(MINTER_ROLE, owner.address);

      await soulboundBadge.mintBadge(seller.address, 1, 10, 400, 31337n);

      await expect(
        soulboundBadge.connect(seller).transferFrom(seller.address, buyer.address, 1)
      ).to.be.revertedWithCustomError(soulboundBadge, "SoulboundTokenNonTransferable");
    });

    it("should prevent approvals", async function () {
      const MINTER_ROLE = await soulboundBadge.MINTER_ROLE();
      await soulboundBadge.grantRole(MINTER_ROLE, owner.address);

      await soulboundBadge.mintBadge(seller.address, 1, 10, 400, 31337n);

      await expect(
        soulboundBadge.connect(seller).approve(buyer.address, 1)
      ).to.be.revertedWithCustomError(soulboundBadge, "SoulboundTokenNonTransferable");
    });

    it("should support EIP-5192 interface", async function () {
      // EIP-5192 interface ID
      const EIP5192_INTERFACE_ID = "0xb45a3c0e";
      expect(await soulboundBadge.supportsInterface(EIP5192_INTERFACE_ID)).to.be.true;
    });
  });

  describe("Escrow Trading", function () {
    beforeEach(async function () {
      // Approve escrow to spend buyer's USDC
      await mockUSDC.connect(buyer).approve(
        await escrow.getAddress(),
        INITIAL_USDC_BALANCE
      );
    });

    it("should create a trade and lock funds", async function () {
      const tx = await escrow.connect(buyer).createTrade(
        seller.address,
        await mockUSDC.getAddress(),
        TRADE_AMOUNT,
        "Test item",
        0 // Default expiry
      );

      const receipt = await tx.wait();
      const event = receipt?.logs.find(
        (log: any) => log.fragment?.name === "TradeCreated"
      );

      expect(event).to.not.be.undefined;

      // Check escrow balance
      const escrowBalance = await mockUSDC.balanceOf(await escrow.getAddress());
      expect(escrowBalance).to.equal(TRADE_AMOUNT);
    });

    it("should complete full trade flow", async function () {
      // 1. Create trade
      const tx = await escrow.connect(buyer).createTrade(
        seller.address,
        await mockUSDC.getAddress(),
        TRADE_AMOUNT,
        "Test item",
        0
      );
      const receipt = await tx.wait();
      
      // Get tradeId from event
      const tradeCreatedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "TradeCreated"
      );
      const tradeId = (tradeCreatedEvent as any)?.args[0];

      // 2. Seller accepts
      await escrow.connect(seller).acceptTrade(tradeId);

      // 3. Seller marks as delivered
      await escrow.connect(seller).markDelivered(tradeId, "ipfs://proof");

      // 4. Buyer confirms delivery
      const sellerBalanceBefore = await mockUSDC.balanceOf(seller.address);
      await escrow.connect(buyer).confirmDelivery(tradeId, 500); // 5-star rating

      // 5. Verify seller received funds (minus fee)
      const platformFee = (TRADE_AMOUNT * 250n) / 10000n; // 2.5%
      const sellerAmount = TRADE_AMOUNT - platformFee;
      
      const sellerBalanceAfter = await mockUSDC.balanceOf(seller.address);
      expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(sellerAmount);
    });

    it("should handle disputes correctly", async function () {
      // Create and progress trade to delivered state
      const tx = await escrow.connect(buyer).createTrade(
        seller.address,
        await mockUSDC.getAddress(),
        TRADE_AMOUNT,
        "Disputed item",
        0
      );
      const receipt = await tx.wait();
      const tradeCreatedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "TradeCreated"
      );
      const tradeId = (tradeCreatedEvent as any)?.args[0];

      await escrow.connect(seller).acceptTrade(tradeId);
      await escrow.connect(seller).markDelivered(tradeId, "ipfs://proof");

      // Raise dispute
      await escrow.connect(buyer).raiseDispute(
        tradeId,
        "Item not as described",
        "ipfs://evidence"
      );

      // Resolve dispute in buyer's favor
      const buyerBalanceBefore = await mockUSDC.balanceOf(buyer.address);
      await escrow.connect(disputeResolver).resolveDispute(tradeId, buyer.address);
      const buyerBalanceAfter = await mockUSDC.balanceOf(buyer.address);

      expect(buyerBalanceAfter - buyerBalanceBefore).to.equal(TRADE_AMOUNT);
    });
  });

  describe("Reputation System", function () {
    beforeEach(async function () {
      await mockUSDC.connect(buyer).approve(
        await escrow.getAddress(),
        INITIAL_USDC_BALANCE
      );
    });

    it("should update reputation after trade completion", async function () {
      // Complete a trade
      const tx = await escrow.connect(buyer).createTrade(
        seller.address,
        await mockUSDC.getAddress(),
        TRADE_AMOUNT,
        "Test item",
        0
      );
      const receipt = await tx.wait();
      const tradeCreatedEvent = receipt?.logs.find(
        (log: any) => log.fragment?.name === "TradeCreated"
      );
      const tradeId = (tradeCreatedEvent as any)?.args[0];

      await escrow.connect(seller).acceptTrade(tradeId);
      await escrow.connect(seller).markDelivered(tradeId, "ipfs://proof");
      await escrow.connect(buyer).confirmDelivery(tradeId, 450); // 4.5 stars
      
      // Seller rates buyer
      await escrow.connect(seller).rateBuyer(tradeId, 500); // 5 stars

      // Check reputation
      const [
        totalTrades,
        successfulTrades,
        averageRating,
        disputesWon,
        disputesLost,
        memberSince,
        highestBadge
      ] = await reputationEngine.getReputation(seller.address);

      expect(successfulTrades).to.equal(1);
      expect(averageRating).to.equal(450); // 4.5 stars as rated by buyer
    });

    it("should track progress to next tier", async function () {
      // Register user
      await reputationEngine.registerUser(seller.address);

      const [
        currentTier,
        nextTier,
        tradesNeeded,
        currentTrades,
        ratingNeeded,
        currentRating
      ] = await reputationEngine.getProgressToNextTier(seller.address);

      expect(currentTier).to.equal(0); // None
      expect(nextTier).to.equal(1); // Bronze
      expect(tradesNeeded).to.equal(10); // Bronze requires 10 trades
    });
  });
});
