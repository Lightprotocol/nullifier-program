/**
 * Nullifier Program SDK
 *
 * Build nullifier instructions for any Rpc-compatible client.
 */

import {
  PublicKey,
  TransactionInstruction,
  AccountMeta,
  SystemProgram,
} from "@solana/web3.js";
import {
  bn,
  batchAddressTree,
  deriveAddressSeedV2,
  deriveAddressV2,
  Rpc,
  selectStateTreeInfo,
  LightSystemProgram,
  defaultStaticAccountsStruct,
} from "@lightprotocol/stateless.js";

/** Program ID */
export const PROGRAM_ID = new PublicKey(
  "NFLx5WGPrTHHvdRNsidcrNcLxRruMC92E4yv7zhZBoT",
);

/** Address tree (V2 batch tree) */
export const ADDRESS_TREE = new PublicKey(batchAddressTree);

/** create_nullifier instruction discriminator */
const DISCRIMINATOR = Buffer.from([171, 144, 50, 154, 87, 170, 57, 66]);

/** CPI authority PDA for our program */
const CPI_AUTHORITY = PublicKey.findProgramAddressSync(
  [Buffer.from("cpi_authority")],
  PROGRAM_ID,
)[0];

/**
 * Derives the nullifier address for a given ID.
 */
export function deriveNullifierAddress(id: Uint8Array): PublicKey {
  const nullifierSeed = new TextEncoder().encode("nullifier");
  const seed = deriveAddressSeedV2([nullifierSeed, id]);
  return deriveAddressV2(seed, ADDRESS_TREE, PROGRAM_ID);
}

/**
 * Result from fetchProof - contains all data needed to build the instruction.
 */
export interface ProofResult {
  proof: {
    a: number[];
    b: number[];
    c: number[];
  };
  addressTreeInfo: {
    rootIndex: number;
    addressMerkleTreePubkeyIndex: number;
    addressQueuePubkeyIndex: number;
  };
  outputStateTreeIndex: number;
  outputQueue: PublicKey;
  addressTree: PublicKey;
}

/**
 * Fetches validity proof and packs accounts for a nullifier creation.
 */
export async function fetchProof(
  rpc: Rpc,
  id: Uint8Array,
): Promise<ProofResult> {
  const address = deriveNullifierAddress(id);

  const proofResult = await rpc.getValidityProofV0(
    [],
    [
      {
        tree: ADDRESS_TREE,
        queue: ADDRESS_TREE,
        address: bn(address.toBytes()),
      },
    ],
  );

  if (!proofResult.compressedProof) {
    throw new Error("No proof returned - address may already exist");
  }

  // Get output state tree
  const stateTreeInfos = await rpc.getStateTreeInfos();
  const stateTreeInfo = selectStateTreeInfo(stateTreeInfos);

  // For V2, address tree index is 0 (first in packed accounts after system accounts)
  // Output queue index is 1 (second in packed accounts)
  return {
    proof: proofResult.compressedProof,
    addressTreeInfo: {
      rootIndex: proofResult.rootIndices[0],
      addressMerkleTreePubkeyIndex: 0,
      addressQueuePubkeyIndex: 0,
    },
    outputStateTreeIndex: 1,
    outputQueue: stateTreeInfo.queue,
    addressTree: ADDRESS_TREE,
  };
}

/**
 * Builds the create_nullifier instruction from proof data.
 */
export function buildInstruction(
  payer: PublicKey,
  id: Uint8Array,
  proofResult: ProofResult,
): TransactionInstruction {
  const data = Buffer.concat([
    DISCRIMINATOR,
    encodeProof(proofResult.proof),
    encodeAddressTreeInfo(proofResult.addressTreeInfo),
    Buffer.from([proofResult.outputStateTreeIndex]),
    Buffer.from(id),
  ]);

  const sys = defaultStaticAccountsStruct();

  // Build accounts explicitly to match Rust program expectations
  // Order: signer, then remaining accounts for CpiAccounts
  const accounts: AccountMeta[] = [
    // Signer (from Anchor accounts struct)
    { pubkey: payer, isSigner: true, isWritable: true },
    // System accounts for CpiAccounts (V2 layout)
    { pubkey: LightSystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: CPI_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: sys.registeredProgramPda, isSigner: false, isWritable: false },
    { pubkey: sys.accountCompressionAuthority, isSigner: false, isWritable: false },
    { pubkey: sys.accountCompressionProgram, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    // Packed accounts: address tree, output queue
    { pubkey: proofResult.addressTree, isSigner: false, isWritable: true },
    { pubkey: proofResult.outputQueue, isSigner: false, isWritable: true },
  ];

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: accounts,
    data,
  });
}

/**
 * Creates a nullifier instruction in one call.
 */
export async function createNullifierIx(
  rpc: Rpc,
  payer: PublicKey,
  id: Uint8Array,
): Promise<TransactionInstruction> {
  const proofResult = await fetchProof(rpc, id);
  return buildInstruction(payer, id, proofResult);
}

// Encoding helpers

function encodeProof(proof: { a: number[]; b: number[]; c: number[] }): Buffer {
  // ValidityProof is Option<CompressedProof> - Borsh: 0 = None, 1 = Some
  // CompressedProof: a: [u8; 32], b: [u8; 64], c: [u8; 32]
  return Buffer.concat([
    Buffer.from([1]), // Borsh Option variant: 1 = Some
    Buffer.from(proof.a),
    Buffer.from(proof.b),
    Buffer.from(proof.c),
  ]);
}

function encodeAddressTreeInfo(info: {
  rootIndex: number;
  addressMerkleTreePubkeyIndex: number;
  addressQueuePubkeyIndex: number;
}): Buffer {
  // PackedAddressTreeInfo: root_index: u16, address_merkle_tree_pubkey_index: u8, address_queue_pubkey_index: u8
  const buf = Buffer.alloc(4);
  buf.writeUInt16LE(info.rootIndex, 0);
  buf.writeUInt8(info.addressMerkleTreePubkeyIndex, 2);
  buf.writeUInt8(info.addressQueuePubkeyIndex, 3);
  return buf;
}
