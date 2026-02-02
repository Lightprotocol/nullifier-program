#!/usr/bin/env bash

# Builds the verifiable solana-verify crate
# Note: solana-verify images are amd64-only, runs under Rosetta on Apple Silicon
solana-verify build --library-name light_nullifier_program
