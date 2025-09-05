const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, mine, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

async function deployCrowdfundFixture() {
	const [owner, alice, bob] = await ethers.getSigners();
	const Crowdfund = await ethers.getContractFactory("Crowdfund");
	const crowdfund = await Crowdfund.deploy();
	await crowdfund.waitForDeployment();
	return { crowdfund, owner, alice, bob };
}

describe("Crowdfund", function () {
	describe("createCampaign", function () {
		it("creates a campaign with valid params", async function () {
			const { crowdfund, owner } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 10;
			const endAt = startAt + 3600;
			await expect(crowdfund.connect(owner).createCampaign(ethers.parseEther("1"), startAt, endAt, "ipfs://meta"))
				.to.emit(crowdfund, "CampaignCreated");
		});

		it("reverts if start >= end", async function () {
			const { crowdfund } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 10;
			await expect(
				crowdfund.createCampaign(1n, startAt, startAt, "uri")
			).to.be.revertedWith("Start must be before end");
		});

		it("reverts if end in the past", async function () {
			const { crowdfund } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			await expect(
				crowdfund.createCampaign(1n, now - 10, now - 5, "uri")
			).to.be.revertedWith("Start must be now or future");
		});
	});

	describe("rewards", function () {
		it("creator can add a reward before start", async function () {
			const { crowdfund, owner } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 100;
			const endAt = startAt + 3600;
			await crowdfund.createCampaign(ethers.parseEther("1"), startAt, endAt, "uri");
			await crowdfund.connect(owner).addReward(1, "R1", "Reward 1", ethers.parseEther("0.1"), 10);
			const rewards = await crowdfund.getRewards(1);
			expect(rewards.length).to.eq(1);
			expect(rewards[0].title).to.eq("R1");
		});

		it("non-creator cannot add reward", async function () {
			const { crowdfund, alice } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 100;
			const endAt = startAt + 200;
			await crowdfund.createCampaign(1n, startAt, endAt, "uri");
			await expect(
				crowdfund.connect(alice).addReward(1, "R1", "Reward 1", 1n, 0)
			).to.be.revertedWith("Only creator can add rewards");
		});

		it("cannot add reward after pledging begins", async function () {
			const { crowdfund, alice } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 100;
			const endAt = startAt + 1000;
			await crowdfund.createCampaign(1n, startAt, endAt, "uri");
			await time.increaseTo(startAt);
			await crowdfund.connect(alice).pledge(1, 999, { value: 1 });
			await expect(
				crowdfund.addReward(1, "R1", "Reward 1", 1n, 0)
			).to.be.revertedWith("Cannot add reward after campaign start");
		});
	});

	describe("pledge", function () {
		it("accepts ETH in active window and updates balances", async function () {
			const { crowdfund, alice } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 100;
			const endAt = startAt + 1000;
			await crowdfund.createCampaign(ethers.parseEther("1"), startAt, endAt, "uri");
			await time.increaseTo(startAt);
			await expect(crowdfund.connect(alice).pledge(1, 999, { value: ethers.parseEther("0.2") }))
				.to.emit(crowdfund, "Pledged");
			const contrib = await crowdfund.getUserContribution(1, alice.address);
			expect(contrib).to.eq(ethers.parseEther("0.2"));
		});

		it("enforces reward minimum and quantity", async function () {
			const { crowdfund, alice } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 100;
			const endAt = startAt + 1000;
			await crowdfund.createCampaign(ethers.parseEther("1"), startAt, endAt, "uri");
			await crowdfund.addReward(1, "R1", "Reward 1", ethers.parseEther("0.5"), 1);
			await time.increaseTo(startAt);
			await expect(
				crowdfund.connect(alice).pledge(1, 0, { value: ethers.parseEther("0.1") })
			).to.be.revertedWith("Contribution below reward minimum");
			await expect(crowdfund.connect(alice).pledge(1, 0, { value: ethers.parseEther("0.6") }))
				.to.emit(crowdfund, "RewardClaimed");
			await expect(
				crowdfund.connect(alice).pledge(1, 0, { value: ethers.parseEther("0.6") })
			).to.be.revertedWith("Reward sold out");
		});
	});

	describe("withdraw & refund", function () {
		it("creator withdraws when goal reached after end", async function () {
			const { crowdfund, owner, alice } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 10;
			const endAt = startAt + 20;
			await crowdfund.createCampaign(ethers.parseEther("1"), startAt, endAt, "uri");
			await time.increaseTo(startAt);
			await crowdfund.connect(alice).pledge(1, 999, { value: ethers.parseEther("1.0") });
			await time.increaseTo(endAt + 1);
			await expect(crowdfund.connect(owner).withdraw(1)).to.emit(crowdfund, "Withdrawn");
		});

		it("contributors get refund when goal not reached", async function () {
			const { crowdfund, alice } = await loadFixture(deployCrowdfundFixture);
			const now = await time.latest();
			const startAt = now + 10;
			const endAt = startAt + 20;
			await crowdfund.createCampaign(ethers.parseEther("10"), startAt, endAt, "uri");
			await time.increaseTo(startAt);
			await crowdfund.connect(alice).pledge(1, 999, { value: ethers.parseEther("1.0") });
			await time.increaseTo(endAt + 1);
			await expect(crowdfund.connect(alice).refund(1)).to.emit(crowdfund, "Refunded");
		});
	});
});


