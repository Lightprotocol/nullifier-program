/// Create a nullifier and verify double-spend prevention.
///
/// Run: npm run ts:create-nullifier

import "dotenv/config";
import * as crypto from "crypto";
import { Keypair, LAMPORTS_PER_SOL, ComputeBudgetProgram, Transaction } from "@solana/web3.js";
import { createRpc, confirmTx, sleep } from "@lightprotocol/stateless.js";
import { createNullifierIx, deriveNullifierAddress } from "../src";
import { homedir } from "os";
import { readFileSync } from "fs";

/// devnet:
/// const RPC_URL = `https://devnet.helius-rpc.com?api-key=${process.env.API_KEY!}`;
/// const rpc = createRpc(RPC_URL);
/// localnet:
const rpc = createRpc();

const payer = Keypair.fromSecretKey(
  new Uint8Array(
    JSON.parse(readFileSync(`${homedir()}/.config/solana/id.json`, "utf8")),
  ),
);

async function main() {
  await rpc.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
  await sleep(2000);
  console.log("Payer:", payer.publicKey.toBase58());

  // Generate random 32-byte identifier
  const id = new Uint8Array(crypto.randomBytes(32));

  // Build nullifier instruction
  const ix = await createNullifierIx(rpc, payer.publicKey, id);

  // Send transaction
  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({
    units: 1_000_000,
  });
  const tx = new Transaction().add(computeIx, ix);
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
  } catch {
    console.log("Double-spend correctly rejected");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
