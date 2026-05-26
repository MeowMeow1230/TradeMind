const hre = require("hardhat");

async function main() {
  const AgentIdentity = await hre.ethers.getContractFactory("AgentIdentity");
  const contract = await AgentIdentity.deploy();
  await contract.waitForDeployment();
  console.log("AgentIdentity deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
