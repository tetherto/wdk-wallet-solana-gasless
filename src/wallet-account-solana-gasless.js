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

import { WalletAccountSolana } from '@tetherto/wdk-wallet-solana'

import { createKeyPairSignerFromPrivateKeyBytes, partiallySignTransactionMessageWithSigners } from '@solana/signers'
import { assertIsFullySignedTransaction, getBase64EncodedWireTransaction, getTransactionDecoder } from '@solana/transactions'
import { appendTransactionMessageInstruction, setTransactionMessageFeePayer } from '@solana/transaction-messages'
import { address } from '@solana/addresses'
import { AccountRole, getBase64Encoder, pipe } from '@solana/kit'

import WalletAccountReadOnlySolanaGasless from './wallet-account-read-only-solana-gasless.js'

/** @typedef {import("@tetherto/wdk-wallet").IWalletAccount} IWalletAccount */
/** @typedef {import('@tetherto/wdk-wallet').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */

/** @typedef {import('@solana/transaction-messages').TransactionMessage} TransactionMessage */
/** @typedef {import('@solana/transactions').FullySignedTransaction} FullySignedTransaction */

/** @typedef {import('@tetherto/wdk-wallet-solana').SolanaTransaction} SolanaTransaction */
/** @typedef {import('@tetherto/wdk-wallet-solana').SolanaWalletConfig} SolanaWalletConfig */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferResult} TransferResult */

/** @typedef {import('./wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletConfig} SolanaGaslessWalletConfig */
/** @typedef {import('./wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletPaymasterConfigOverrides} SolanaGaslessWalletPaymasterConfigOverrides */

/** @implements {IWalletAccount} */
export default class WalletAccountSolanaGasless extends WalletAccountReadOnlySolanaGasless {
  /**
   * Creates a new solana gasless wallet account.
   *
   * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
   * @param {string} path - The SLIP-0010 derivation path (e.g. "0'/0'/0'").
   * @param {SolanaGaslessWalletConfig} config - The configuration object.
   */
  constructor (seed, path, config) {
    const ownerAccount = new WalletAccountSolana(seed, path, config)

    super(ownerAccount._address, config)

    /** @private */
    this._ownerAccount = ownerAccount

    /** @private */
    this._signer = undefined
  }

  /**
   * The derivation path's index of this account.
   *
   * @type {number}
   */
  get index () {
    return this._ownerAccount.index
  }

  /**
   * The derivation path of this account.
   *
   * @type {string}
   */
  get path () {
    return this._ownerAccount.path
  }

  /**
   * The account's key pair.
   *
   * Returns the raw key pair bytes in standard Solana format.
   * - privateKey: 32-byte Ed25519 secret key (Uint8Array)
   * - publicKey: 32-byte Ed25519 public key (Uint8Array)
   *
   * @type {KeyPair}
   */
  get keyPair () {
    return this._ownerAccount.keyPair
  }

  /**
   * The address of this account.
   *
   * @returns {Promise<string>} The address.
   */
  async getAddress () {
    return await this._ownerAccount.getAddress()
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   */
  async sign (message) {
    return await this._ownerAccount.sign(message)
  }

  /**
   * Signs a transaction.
   *
   * @param {SolanaTransaction} tx - The transaction to sign.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<FullySignedTransaction>} The signed transaction.
   */
  async signTransaction (tx, config = {}) {
    const { transactionMessage } = await this._populateTransactionMessage(tx, config)

    const partiallySignedTransactionMessage = await partiallySignTransactionMessageWithSigners(transactionMessage)

    const encodedTransaction = getBase64EncodedWireTransaction(partiallySignedTransactionMessage)

    const { signed_transaction: signedTransaction } = await this._paymaster.signTransaction({
      transaction: encodedTransaction
    })

    const fullySignedTransaction = getTransactionDecoder().decode(getBase64Encoder().encode(signedTransaction))

    assertIsFullySignedTransaction(fullySignedTransaction)

    return fullySignedTransaction
  }

  /**
   * Sends a transaction.
   *
   * @param {SolanaTransaction} tx - The transaction.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<TransactionResult>} The transaction's result.
   */
  async sendTransaction (tx, config = {}) {
    const { fee, transactionMessage } = await this._populateTransactionMessage(tx, config)

    const partiallySignedTransactionMessage = await partiallySignTransactionMessageWithSigners(transactionMessage)

    const encodedTransaction = getBase64EncodedWireTransaction(partiallySignedTransactionMessage)

    const { signature: hash } = await this._paymaster.signAndSendTransaction({ transaction: encodedTransaction })

    return { hash, fee }
  }

  /**
   * Transfers a token to another address. Native SOL transfers are not supported here.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<TransferResult>} The transfer's result.
   */
  async transfer ({ token, recipient, amount }, config = {}) {
    const mergedConfig = { ...this._config, ...config }

    const tx = await this._buildSPLTransferTransactionMessage(token, recipient, amount)

    const { fee, transactionMessage } = await this._populateTransactionMessage(tx, mergedConfig)

    if (mergedConfig.transferMaxFee !== undefined && fee >= mergedConfig.transferMaxFee) {
      throw new Error('Exceeded maximum fee cost for transfer operation.')
    }

    const partiallySignedTransactionMessage = await partiallySignTransactionMessageWithSigners(transactionMessage)

    const encodedTransaction = getBase64EncodedWireTransaction(partiallySignedTransactionMessage)

    const { signature: hash } = await this._paymaster.signAndSendTransaction({ transaction: encodedTransaction })

    return { hash, fee }
  }

  /**
   * Returns a read-only copy of the account.
   *
   * @returns {Promise<WalletAccountReadOnlySolanaGasless>} The read-only account.
   */
  async toReadOnlyAccount () {
    const addr = await this._ownerAccount.getAddress()

    const readOnlyAccount = new WalletAccountReadOnlySolanaGasless(addr, this._config)

    return readOnlyAccount
  }

  /**
   * Disposes the wallet account, erasing the private key from the memory.
   */
  dispose () {
    this._signer = undefined
    this._ownerAccount.dispose()
  }

  /** @private */
  async _populateTransactionMessage (tx, config = {}) {
    let draft = tx.to !== undefined && tx.value !== undefined
      ? await this._buildNativeTransferTransactionMessage(tx.to, tx.value)
      : tx

    if (Array.isArray(draft.instructions)) {
      draft = await this._ensureLifetime(draft)
      await this._assertFeePayer(draft)
    }

    const signer = await this._getSigner()

    const paymasterPublicKey = address(this._config.paymasterAddress)
    draft = setTransactionMessageFeePayer(paymasterPublicKey, draft)

    const { payment_amount: fee, payment_instruction: paymentInstruction } = await this._getTransactionPaymentInfo(draft, config)

    const transactionMessage = pipe(
      draft,
      (tx) => appendTransactionMessageInstruction(paymentInstruction, tx),
      (tx) => ({
        ...tx,
        instructions: tx.instructions.map(({ accounts = [], ...ix }) => ({
          ...ix,
          accounts: accounts.map((account) => {
            if (account.address === signer.address && [AccountRole.READONLY_SIGNER, AccountRole.WRITABLE_SIGNER].includes(account.role)) {
              return { ...account, signer }
            }

            return account
          })
        }))
      })
    )

    return { fee: BigInt(fee), transactionMessage }
  }

  /** @private */
  async _getSigner () {
    if (!this._signer) {
      this._signer = await createKeyPairSignerFromPrivateKeyBytes(this._ownerAccount.keyPair.privateKey)
    }

    return this._signer
  }
}
