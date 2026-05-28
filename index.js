// Copyright 2024 Tether Operations Limited
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
'use strict'

/** @typedef {import('@tetherto/wdk-wallet').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferResult} TransferResult */
/** @typedef {import('./src/wallet-account-solana-gasless.js').FullySignedTransaction} FullySignedTransaction */
/** @typedef {import('./src/wallet-account-read-only-solana-gasless.js').SolanaTransactionReceipt} SolanaTransactionReceipt */
/** @typedef {import('./src/wallet-account-read-only-solana-gasless.js').SolanaTransaction} SolanaTransaction */
/** @typedef {import('./src/wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletPaymasterConfig} SolanaGaslessWalletPaymasterConfig */
/** @typedef {import('./src/wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletPaymasterConfigOverrides} SolanaGaslessWalletPaymasterConfigOverrides */
/** @typedef {import('./src/wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletConfig} SolanaGaslessWalletConfig */

export { default } from './src/wallet-manager-solana-gasless.js'

export { default as WalletAccountReadOnlySolanaGasless } from './src/wallet-account-read-only-solana-gasless.js'

export { default as WalletAccountSolanaGasless } from './src/wallet-account-solana-gasless.js'
