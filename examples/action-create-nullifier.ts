// Create a nullifier and verify double-spend prevention.
//
// Prerequisites:
//   - Solana keypair at ~/.config/solana/id.json (funded on devnet)
//   - .env file with API_KEY=<helius-api-key>
//
// Run: npm run ts:create-nullifier

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as crypto from "crypto";
import { web3 } from "@coral-xyz/anchor";
import { createRpc, Rpc, confirmTx } from "@lightprotocol/stateless.js";
import { createNullifierIx, deriveNullifierAddress } from "../src";

function loadKeypair(): web3.Keypair {
  const keypairPath = path.join(
    os.homedir(),
    ".config",
    "solana",
    "id.json"
  );
  const secretKey = JSON.parse(fs.readFileSync(keypairPath, "utf-8"));
  return web3.Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

function createDevnetRpc(): Rpc {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY required in .env");
  }
  const rpcUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  const photonUrl = `https://devnet.helius-rpc.com/?api-key=${apiKey}`;
  return createRpc(rpcUrl, photonUrl, photonUrl);
}

async function main() {
  const rpc = createDevnetRpc();
  const payer = loadKeypair();
  console.log("Payer:", payer.publicKey.toBase58());

  // Generate random 32-byte identifier
  const id = new Uint8Array(crypto.randomBytes(32));

  // Build nullifier instruction
  const ix = await createNullifierIx(rpc, payer.publicKey, id);

  // Send transaction
  const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  });
  const tx = new web3.Transaction().add(computeIx, ix);
  tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
  tx.feePayer = payer.publicKey;
  tx.sign(payer);

  const sig = await rpc.sendTransaction(tx, [payer]);
  await confirmTx(rpc, sig);
  console.log("Tx:", sig);

  const address = deriveNullifierAddress(id);
  console.log("Nullifier address:", address.toBase58());

  // Wait for indexer to process
  const slot = await rpc.getSlot();
  await rpc.confirmTransactionIndexed(slot);

  // Double-spend should fail
  try {
    await createNullifierIx(rpc, payer.publicKey, id);
    console.error("ERROR: duplicate nullifier should have failed");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
