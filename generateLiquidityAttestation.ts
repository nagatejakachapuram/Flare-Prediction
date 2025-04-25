import { run, web3 } from "hardhat";
import { TransferEventListenerInstance } from "../../typechain-types";
import {
  prepareAttestationRequestBase,
  submitAttestationRequest,
  retrieveDataAndProofBase,
} from "./Base";
import { LiquidityEventListenerInstance } from "../../typechain-types";

const LiquidityEventListener = artifacts.require("LiquidityEventListener");

const { VERIFIER_URL_TESTNET, VERIFIER_API_KEY_TESTNET, COSTON2_DA_LAYER_URL } =
  process.env;

// yarn hardhat run scripts/fdcExample/EVMTransaction.ts --network coston2

// Request data
const transactionHash =
  "0xcb85acd170053fdfdd1bd2a01880cdf8490cc3a14568bf30c0d1464f46d92985";

// Configuration constants
const attestationTypeBase = "LiquidityEvent";
const sourceIdBase = "testETH";
const verifierUrlBase = VERIFIER_URL_TESTNET;
const urlTypeBase = "eth";

async function prepareLiquidityAttestationRequest(transactionHash: string) {
  const requiredConfirmations = "1";
  const provideInput = true;
  const listEvents = true;
  const logIndices: string[] = [];

  const requestBody = {
    transactionHash: transactionHash,
    requiredConfirmations: requiredConfirmations,
    provideInput: provideInput,
    listEvents: listEvents,
    logIndices: logIndices,
  };

  const url = `${verifierUrlBase}verifier/${urlTypeBase}/LiquidityEvent/prepareRequest`;
  const apiKey = VERIFIER_API_KEY_TESTNET!;

  return await prepareAttestationRequestBase(
    url,
    apiKey,
    attestationTypeBase,
    sourceIdBase,
    requestBody
  );
}

async function retrieveLiquidityProof(
  abiEncodedRequest: string,
  roundId: number
) {
  const url = `${COSTON2_DA_LAYER_URL}api/v1/fdc/proof-by-request-round-raw`;
  console.log("Url:", url, "\n");
  return await retrieveDataAndProofBase(url, abiEncodedRequest, roundId);
}

async function deployAndVerifyLiquidityEventListener() {
  const args: any[] = [];
  const eventListener: LiquidityEventListenerInstance =
    await LiquidityEventListener.new(...args);

  try {
    await run("verify:verify", {
      address: eventListener.address,
      constructorArguments: args,
    });
  } catch (e: any) {
    console.log(e);
  }

  console.log("LiquidityEventListener deployed to", eventListener.address, "\n");
  return eventListener;
}


async function interactWithLiquidityContract(
  eventListener: LiquidityEventListenerInstance,
  proof: any
) {
  console.log("Proof hex:", proof.response_hex, "\n");

  const decodedResponse = web3.eth.abi.decodeParameter(
    "tuple(address,uint256,uint256)", 
    proof.response_hex
  );
  console.log("Decoded proof:", decodedResponse, "\n");

  const transaction = await eventListener.collectLiquidityEvents({
    merkleProof: proof.proof,
    data: decodedResponse,
  });

  console.log("Transaction:", transaction.tx, "\n");
  console.log("Liquidity Events:", await eventListener.liquidityEvents(0), "\n");
}

// Main function to tie everything together
async function main() {
  const data = await prepareLiquidityAttestationRequest(transactionHash);
  console.log("Data:", data, "\n");

  const abiEncodedRequest = data.abiEncodedRequest;
  const roundId = await submitAttestationRequest(abiEncodedRequest);

  const proof = await retrieveLiquidityProof(abiEncodedRequest, roundId);

  const eventListener: LiquidityEventListenerInstance =
    await deployAndVerifyLiquidityEventListener();

  await interactWithLiquidityContract(eventListener, proof);
}

main().then(() => {
  process.exit(0);
});