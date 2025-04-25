import "dotenv/config";
import fetch from "node-fetch";

// Config
const {
  VERIFIER_URL_TESTNET,
  JQ_VERIFIER_API_KEY_TESTNET,
  COSTON2_DA_LAYER_URL,
} = process.env;

// Ensure that the environment variables are correctly loaded
if (!VERIFIER_URL_TESTNET || !JQ_VERIFIER_API_KEY_TESTNET || !COSTON2_DA_LAYER_URL) {
  console.error("❌ Missing required environment variables. Please check your .env file.");
  process.exit(1);
}

console.log("Environment Variables:");
console.log("VERIFIER_URL_TESTNET:", VERIFIER_URL_TESTNET);
console.log("JQ_VERIFIER_API_KEY_TESTNET:", JQ_VERIFIER_API_KEY_TESTNET ? "Loaded" : "Not Loaded");
console.log("COSTON2_DA_LAYER_URL:", COSTON2_DA_LAYER_URL);

interface PrepareResponse {
  abiEncodedRequest?: string;
  statusCode?: number; // Allow for error responses to contain statusCode
  message?: string; // Error message if the request fails
}

interface SubmitResponse {
  roundId: number;
}

interface ProofResponse {
  [key: string]: any;
}
const transactionHash =
  "0x4e636c6590b22d8dcdade7ee3b5ae5572f42edb1878f09b3034b2f7c3362ef3c";

async function prepareLiquidityAttestationRequest(transactionHash: string): Promise<PrepareResponse | null> {
  const url = `${VERIFIER_URL_TESTNET!.endsWith("/") ? VERIFIER_URL_TESTNET! : VERIFIER_URL_TESTNET! + "/"}verifier/eth/EVMTransaction/prepareRequest`;

  
  console.log("🔗 Preparing liquidity attestation request...");
  console.log("Request URL:", url);
  console.log("Transaction Hash:", transactionHash);
  console.log("X-API-KEY",JQ_VERIFIER_API_KEY_TESTNET);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": `${JQ_VERIFIER_API_KEY_TESTNET}`
    },
    body: JSON.stringify({
      transactionHash,
      requiredConfirmations: "1",
      provideInput: true,
      listEvents: true,
      logIndices: [],
    }),
  });

  if (!response.ok) {
    console.error(`❌ Request failed with status: ${response.status} - ${response.statusText}`);
    const errorData = await response.json();
    console.error("Error Response:", JSON.stringify(errorData, null, 2));
    return null;
  }

  const data = (await response.json()) as PrepareResponse;

  if (data.statusCode === 401) {
    console.error("❌ Unauthorized. Invalid or missing API key.");
    return null;
  }

  if (data.statusCode !== undefined) {
    console.error(`❌ Error: ${data.message || "Unknown error"}`);
    return null;
  }

  return data;
}

async function submitAttestationRequest(abiEncodedRequest: string): Promise<number> {
  const url = `${VERIFIER_URL_TESTNET!.endsWith("/") ? VERIFIER_URL_TESTNET! : VERIFIER_URL_TESTNET! + "/"}verifier/eth/EVMTransaction/submitRequest`;

  console.log("💌 Submitting attestation request...");
  console.log("Request URL:", url);
  console.log("API Key:", process.env.JQ_VERIFIER_API_KEY_TESTNET);
  console.log("ABI Encoded Request:", abiEncodedRequest);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${JQ_VERIFIER_API_KEY_TESTNET}`,
    },
    body: JSON.stringify({ abiEncodedRequest }),
  });

  if (!response.ok) {
    console.error(`❌ Request failed with status: ${response.status} - ${response.statusText}`);
    const errorData = await response.json();
    console.error("Error Response:", JSON.stringify(errorData, null, 2));
    return -1;
  }

  const data = (await response.json()) as SubmitResponse;
  return data.roundId;
}

async function retrieveProofForLiquidity(abiEncodedRequest: string, roundId: number): Promise<ProofResponse> {
  const url = `${COSTON2_DA_LAYER_URL!.endsWith("/") ? COSTON2_DA_LAYER_URL! : COSTON2_DA_LAYER_URL! + "/"}api/v1/fdc/proof-by-request-round-raw`;

  console.log("📦 Retrieving proof for liquidity...");
  console.log("Request URL:", url);
  console.log("Round ID:", roundId);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abiEncodedRequest, roundId }),
  });

  if (!response.ok) {
    console.error(`❌ Request failed with status: ${response.status} - ${response.statusText}`);
    const errorData = await response.json();
    console.error("Error Response:", JSON.stringify(errorData, null, 2));
    return {};
  }

  const data = (await response.json()) as ProofResponse;
  return data;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("❌ Please provide a transaction hash as an argument.");
    process.exit(1);
  }

  const transactionHash = args[0];
  console.log("🔍 Preparing attestation for:", transactionHash);

  const prepared = await prepareLiquidityAttestationRequest(transactionHash);
  if (!prepared) return;

  const abiEncodedRequest = prepared.abiEncodedRequest;
  if (!abiEncodedRequest) {
    console.error("❌ Failed to get ABI Encoded Request.");
    return;
  }
  console.log("✅ ABI Encoded Request:", abiEncodedRequest);

  const roundId = await submitAttestationRequest(abiEncodedRequest);
  if (roundId === -1) return;
  console.log("🌀 Round ID:", roundId);

  const proof = await retrieveProofForLiquidity(abiEncodedRequest, roundId);
  console.log("📦 Final Proof:", JSON.stringify(proof, null, 2));
}

main().then(() => process.exit(0)).catch(console.error);
