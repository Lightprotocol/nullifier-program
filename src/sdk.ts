/**
 * Nullifier Program SDK
 *
 * Build nullifier instructions for any Rpc-compatible client.
 */

import {
  PublicKey,
  TransactionInstruction,
  AccountMeta,
} from "@solana/web3.js";
import {
  bn,
  batchAddressTree,
  deriveAddressSeedV2,
  deriveAddressV2,
  PackedAccounts,
  Rpc,
  selectStateTreeInfo,
  SystemAccountMetaConfig,
} from "@lightprotocol/stateless.js";

/** Program ID */
export const PROGRAM_ID = new PublicKey(
  "BneoNEQRnAKyNXa6hEiXPygNG8HkbRzCeoeohmBNHkF9",
);

/** Address tree (V2 batch tree) */
export const ADDRESS_TREE = new PublicKey(batchAddressTree);

/** create instruction discriminator */
const DISCRIMINATOR = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);

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
  remainingAccounts: AccountMeta[];
}

/**
 * Fetches validity proof and packs accounts for a nullifier creation.
 */
export async function fetchProof(
  rpc: Rpc,
  id: Uint8Array,
): Promise<ProofResult> {
  const address = deriveNullifierAddress(id);

  const config = SystemAccountMetaConfig.new(PROGRAM_ID);
  const packed = new PackedAccounts();
  packed.addSystemAccountsV2(config);

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

  const addressMerkleTreePubkeyIndex = packed.insertOrGet(ADDRESS_TREE);

  const stateTreeInfos = await rpc.getStateTreeInfos();
  const stateTreeInfo = selectStateTreeInfo(stateTreeInfos);
  const outputStateTreeIndex = packed.insertOrGet(stateTreeInfo.queue);

  return {
    proof: proofResult.compressedProof,
    addressTreeInfo: {
      rootIndex: proofResult.rootIndices[0],
      addressMerkleTreePubkeyIndex,
      addressQueuePubkeyIndex: addressMerkleTreePubkeyIndex,
    },
    outputStateTreeIndex,
    remainingAccounts: packed.toAccountMetas().remainingAccounts,
  };
}

/**
 * Builds the create_account instruction from proof data.
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

  const accounts: AccountMeta[] = [
    { pubkey: payer, isSigner: true, isWritable: true },
    ...proofResult.remainingAccounts,
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
  // ValidityProof is an enum with variant 0 = Some(CompressedProof)
  // CompressedProof: a: [u8; 32], b: [u8; 64], c: [u8; 32]
  return Buffer.concat([
    Buffer.from([0]), // enum variant for Some
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
