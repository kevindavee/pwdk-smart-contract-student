import chaiAsPromised from "chai-as-promised";
import chai from "chai";
import { ethers } from "hardhat";
import { ERC721Starter, ConferenceTicket } from "../typechain";
import { deployContracts } from "./utils";

chai.use(chaiAsPromised);
const { expect } = chai;

describe("Conference Ticket", () => {
  let contract: ERC721Starter;
  let conferenceContract: ConferenceTicket;

  beforeEach(async () => {
    const { confereceTicketContract, erc721StaterContract } =
      await deployContracts("Happy Ape Bicycle Club", "HABC");

    contract = erc721StaterContract;
    conferenceContract = confereceTicketContract;
  });

  it("should mint a ticket NFT for holders", async () => {
    const [, alice] = await ethers.getSigners();
    await contract.addAddressToWhitelist(alice.address, 1);
    const price = await contract.PRIVATE_SALE_PRICE();

    await contract.connect(alice).privateMint({
      value: price,
    });

    await conferenceContract.connect(alice).mintTicket();
    const result = await conferenceContract.balanceOf(alice.address);
    expect(result.toNumber()).to.be.equal(1);
  });

  it("should not mint a ticket NFT for non-holders", async () => {
    const [, alice] = await ethers.getSigners();

    await expect(
      conferenceContract.connect(alice).mintTicket()
    ).to.eventually.be.rejectedWith("non NFT holder");
  });

  it("should not mint a more than 1 ticket to one NFT holder", async () => {
    const [, alice] = await ethers.getSigners();

    await contract.addAddressToWhitelist(alice.address, 1);
    const price = await contract.PRIVATE_SALE_PRICE();

    await contract.connect(alice).privateMint({
      value: price,
    });

    await conferenceContract.connect(alice).mintTicket();
    const result = await conferenceContract.balanceOf(alice.address);
    expect(result.toNumber()).to.be.equal(1);

    await expect(
      conferenceContract.connect(alice).mintTicket()
    ).to.eventually.be.rejectedWith("cannot hold more than 1 ticket");
  });

  it("should mint ticket NFTs for holders and 4 other addresses", async () => {
    const [owner, alice, bob, charlie, dan, edgar] = await ethers.getSigners();
    await contract.addAddressToWhitelist(alice.address, 1);
    const price = await contract.PRIVATE_SALE_PRICE();

    await contract.connect(alice).privateMint({
      value: price,
    });

    const tokensOfAlice = await contract.tokensOfOwner(alice.address);
    const hash = ethers.utils.solidityKeccak256(
      ["address", "string"],
      [alice.address, JSON.stringify(tokensOfAlice)]
    );
    const hashBinary = ethers.utils.arrayify(hash);
    const eligibilitySignature = await owner.signMessage(hashBinary);

    await conferenceContract
      .connect(alice)
      .verify(JSON.stringify(tokensOfAlice), eligibilitySignature);

    await conferenceContract
      .connect(alice)
      .mintGroupTicket([
        bob.address,
        charlie.address,
        dan.address,
        edgar.address,
      ]);
    const aliceResult = await conferenceContract.balanceOf(alice.address);
    const bobResult = await conferenceContract.balanceOf(bob.address);
    const charlieResult = await conferenceContract.balanceOf(charlie.address);
    const danResult = await conferenceContract.balanceOf(dan.address);
    const edgarResult = await conferenceContract.balanceOf(edgar.address);

    expect(aliceResult.toNumber()).to.be.equal(1);
    expect(bobResult.toNumber()).to.be.equal(1);
    expect(charlieResult.toNumber()).to.be.equal(1);
    expect(danResult.toNumber()).to.be.equal(1);
    expect(edgarResult.toNumber()).to.be.equal(1);
  });

  it("should fail the signature verification is signature invalid", async () => {
    const [owner, alice, bob] = await ethers.getSigners();
    await contract.addAddressToWhitelist(alice.address, 1);
    const price = await contract.PRIVATE_SALE_PRICE();

    await contract.connect(alice).privateMint({
      value: price,
    });

    const tokensOfAlice = await contract.tokensOfOwner(alice.address);
    const tokensOfBob = await contract.tokensOfOwner(bob.address);
    const hash = ethers.utils.solidityKeccak256(
      ["address", "string"],
      [alice.address, JSON.stringify(tokensOfBob)]
    );
    const hashBinary = ethers.utils.arrayify(hash);
    const eligibilitySignature = await owner.signMessage(hashBinary);

    await expect(
      conferenceContract
        .connect(alice)
        .verify(JSON.stringify(tokensOfAlice), eligibilitySignature)
    ).to.eventually.be.rejectedWith("Invalid signature");
  });
});
