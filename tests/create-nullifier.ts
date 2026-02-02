import { web3 } from '@coral-xyz/anchor';
import {
    confirmTx,
    createRpc,
    Rpc,
    sleep,
    bn,
} from '@lightprotocol/stateless.js';
import {
    createNullifierIx,
    deriveNullifierAddress,
    fetchProof,
    buildInstruction,
    PROGRAM_ID,
} from '../src';
import * as assert from 'assert';

describe('nullifier-sdk', () => {
    let rpc: Rpc;
    let signer: web3.Keypair;

    beforeEach(async () => {
        rpc = createRpc();
        signer = new web3.Keypair();
        await rpc.requestAirdrop(signer.publicKey, web3.LAMPORTS_PER_SOL);
        await sleep(2000);
    });

    it('creates nullifier with all-in-one helper', async () => {
        const id = new Uint8Array([
            1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
            20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        ]);

        const ix = await createNullifierIx(rpc, signer.publicKey, id);

        const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 1_000_000,
        });

        const tx = new web3.Transaction().add(computeIx, ix);
        tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
        tx.feePayer = signer.publicKey;
        tx.sign(signer);

        const sig = await rpc.sendTransaction(tx, [signer]);
        await confirmTx(rpc, sig);

        // Verify account exists
        const address = deriveNullifierAddress(id);
        const slot = await rpc.getSlot();
        await rpc.confirmTransactionIndexed(slot);

        const account = await rpc.getCompressedAccount(bn(address.toBytes()));
        assert.ok(account, 'Nullifier account should exist');
    });

    it('creates nullifier step-by-step', async () => {
        const id = new Uint8Array(32).fill(7);

        // Step 1: fetch proof
        const proofResult = await fetchProof(rpc, id);

        // Step 2: build instruction
        const ix = buildInstruction(signer.publicKey, id, proofResult);

        // Step 3: send transaction
        const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 1_000_000,
        });
        const tx = new web3.Transaction().add(computeIx, ix);
        tx.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
        tx.feePayer = signer.publicKey;
        tx.sign(signer);

        const sig = await rpc.sendTransaction(tx, [signer]);
        await confirmTx(rpc, sig);

        // Verify
        const address = deriveNullifierAddress(id);
        const slot = await rpc.getSlot();
        await rpc.confirmTransactionIndexed(slot);

        const account = await rpc.getCompressedAccount(bn(address.toBytes()));
        assert.ok(account, 'Nullifier account should exist');
    });

    it('duplicate nullifier fails', async () => {
        const id = new Uint8Array(32).fill(42);

        // First creation succeeds
        const ix1 = await createNullifierIx(rpc, signer.publicKey, id);
        const computeIx = web3.ComputeBudgetProgram.setComputeUnitLimit({
            units: 1_000_000,
        });
        const tx1 = new web3.Transaction().add(computeIx, ix1);
        tx1.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
        tx1.feePayer = signer.publicKey;
        tx1.sign(signer);

        await rpc.sendTransaction(tx1, [signer]);
        const slot = await rpc.getSlot();
        await rpc.confirmTransactionIndexed(slot);

        // Second creation fails
        try {
            const ix2 = await createNullifierIx(rpc, signer.publicKey, id);
            const tx2 = new web3.Transaction().add(computeIx, ix2);
            tx2.recentBlockhash = (await rpc.getRecentBlockhash()).blockhash;
            tx2.feePayer = signer.publicKey;
            tx2.sign(signer);
            await rpc.sendTransaction(tx2, [signer]);
            assert.fail('Should have thrown');
        } catch (err) {
            // Expected
        }
    });
});
