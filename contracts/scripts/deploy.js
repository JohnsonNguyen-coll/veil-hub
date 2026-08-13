import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const Token = await hre.ethers.getContractFactory("VeilConfidentialToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();

  const Clubs = await hre.ethers.getContractFactory("VeilClubs");
  const clubs = await Clubs.deploy(await token.getAddress(), deployer.address);
  await clubs.waitForDeployment();

  console.log("VeilConfidentialToken:", await token.getAddress());
  console.log("VeilClubs:", await clubs.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
