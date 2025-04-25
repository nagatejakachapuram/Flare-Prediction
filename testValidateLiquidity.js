import dotenv from "dotenv";
dotenv.config();

import {
  prepareEVMTransactionRequest,
  submitRequestAndGetRoundId,
  retrieveProof,
  decodeTransactionResponse
} from "./attestationService.js";

const txHash = "0xcb85acd170053fdfdd1bd2a01880cdf8490cc3a14568bf30c0d1464f46d92985";

async function main() {
  const abiEncodedRequest = await prepareEVMTransactionRequest(txHash);
  const roundId = await submitRequestAndGetRoundId(abiEncodedRequest);
  const proof = await retrieveProof(abiEncodedRequest, roundId);

  console.log("Response Hex:", proof.response_hex);

  const decoded = decodeTransactionResponse(proof.response_hex, [
    {
      inputs: [
        {
          components: [
            { name: "request", type: "bytes" },
            { name: "response", type: "bytes" },
          ],
          name: "attestation",
          type: "tuple",
        },
      ],
      name: "verifyProof",
      type: "function",
    },
  ]);

  console.log("Decoded Logs:", decoded.logs);
}

main();
