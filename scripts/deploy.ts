const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
	const Crowdfund = await ethers.getContractFactory("Crowdfund");

    console.log("Deploying Crowdfund contract...");
	const crowdfund = await Crowdfund.deploy();
    if (!crowdfund) {
        throw new Error("Oops! Crowdfund contract not deployed");
    }

	await crowdfund.waitForDeployment();
	const address = await crowdfund.getAddress();
	console.log("Crowdfund deployed to:", address);

	try {
		const dir = path.join(__dirname, "..", "frontend", "src", "constants");
		fs.mkdirSync(dir, { recursive: true });
		const out = path.join(dir, "deployments.localhost.json");
		fs.writeFileSync(out, JSON.stringify({ Crowdfund: { address } }, null, 2));
		console.log("Saved deployment file:", out);
	} catch (err) {
		console.warn("Failed writing deployment for frontend:", err);
	}
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
});