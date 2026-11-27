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

import { DisposalError, MaximumFeeExceededError, NoSuchElementError, ProviderRequiredError } from '@tetherto/wdk-wallet'

import { PrivateKeySignerSolana, SeedSignerSolana } from '@tetherto/wdk-wallet-solana/signers'

import { partiallySignTransactionMessageWithSigners } from '@solana/signers'
import { assertIsFullySignedTransaction, getBase64EncodedWireTransaction, getTransactionDecoder, getTransactionEncoder } from '@solana/transactions'
import { appendTransactionMessageInstruction, setTransactionMessageFeePayer } from '@solana/transaction-messages'
import { address } from '@solana/addresses'
import { decompileTransactionMessageFetchingLookupTables, getBase64Encoder, getCompiledTransactionMessageDecoder } from '@solana/kit'

import WalletAccountReadOnlySolanaGasless from './wallet-account-read-only-solana-gasless.js'

/**
 * @template TSignedTransaction
 * @typedef {import('@tetherto/wdk-wallet').IWalletAccount<TSignedTransaction>} IWalletAccount
 */
/** @typedef {import('@tetherto/wdk-wallet').KeyPair} KeyPair */
/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */
/** @typedef {import('@tetherto/wdk-wallet').ValueError} ValueError */

/** @typedef {import('@solana/transaction-messages').TransactionMessage} TransactionMessage */
/** @typedef {import('@solana/transactions').FullySignedTransaction} FullySignedTransaction */

/** @typedef {import('@tetherto/wdk-wallet-solana').SolanaTransaction} SolanaTransaction */
/** @typedef {import('@tetherto/wdk-wallet-solana').SolanaWalletConfig} SolanaWalletConfig */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferResult} TransferResult */
/** @typedef {import('@tetherto/wdk-wallet-solana').SignerOptions} SignerOptions */

/** @typedef {import('@tetherto/wdk-wallet-solana/signers').ISignerSolana} ISignerSolana */

/** @typedef {import('./wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletConfig} SolanaGaslessWalletConfig */
/** @typedef {import('./wallet-account-read-only-solana-gasless.js').SolanaGaslessWalletPaymasterConfigOverrides} SolanaGaslessWalletPaymasterConfigOverrides */

const BIP_44_SOL_DERIVATION_PATH_PREFIX = "m/44'/501'"

const DEFAULT_ACCOUNT_PATH = "0'/0'"

/** @implements {IWalletAccount<FullySignedTransaction>} */
export default class WalletAccountSolanaGasless extends WalletAccountReadOnlySolanaGasless {
  /**
   * Creates a new solana gasless wallet account from a signer.
   *
   * The signer is wiped on {@link dispose} only if `shouldWipeSignerOnDisposal` is set.
   *
   * @overload
   * @param {ISignerSolana} signer - The solana signer, derived to an account path.
   * @param {SolanaGaslessWalletConfig & SignerOptions} config - The configuration object.
   * @throws {ValueError} If a required paymaster field is missing from the configuration.
   * @throws {ValueError} If the `paymasterUrl` option is an empty list.
   */

  /**
   * Creates a new solana gasless wallet account from a seed.
   *
   * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
   * @overload
   * @param {string | Uint8Array} seed - A BIP-39 mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
   * @param {string} path - The SLIP-0010 derivation path, relative to "m/44'/501'" (e.g. "0'/0'").
   * @param {SolanaGaslessWalletConfig} config - The configuration object.
   * @throws {ValueError} If the seed phrase is not a valid BIP-39 seed phrase.
   * @throws {ValueError} If the raw seed is not between 16 and 64 bytes.
   * @throws {ValueError} If the path is not a valid BIP-32 path.
   * @throws {ValueError} If any child path in the path is not hardened.
   * @throws {ValueError} If a required paymaster field is missing from the configuration.
   * @throws {ValueError} If the `paymasterUrl` option is an empty list.
   */

  /**
   * Creates the first solana gasless wallet account (m/44'/501'/0'/0') from a seed.
   *
   * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
   * @overload
   * @param {string | Uint8Array} seed - A BIP-39 mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
   * @param {SolanaGaslessWalletConfig} config - The configuration object.
   * @throws {ValueError} If the seed phrase is not a valid BIP-39 seed phrase.
   * @throws {ValueError} If the raw seed is not between 16 and 64 bytes.
   * @throws {ValueError} If a required paymaster field is missing from the configuration.
   * @throws {ValueError} If the `paymasterUrl` option is an empty list.
   */
  constructor (seedOrSigner, pathOrConfig, config) {
    const isSeed = typeof seedOrSigner === 'string' || seedOrSigner instanceof Uint8Array
    const hasPath = typeof pathOrConfig === 'string'
    const [signer, configuration] = isSeed
      ? [
          new SeedSignerSolana(seedOrSigner, `${BIP_44_SOL_DERIVATION_PATH_PREFIX}/${hasPath ? pathOrConfig : DEFAULT_ACCOUNT_PATH}`),
          hasPath ? config : pathOrConfig
        ]
      : [seedOrSigner, pathOrConfig]

    try {
      super(undefined, configuration)
    } catch (error) {
      if (isSeed) {
        signer.dispose()
      }

      throw error
    }

    /** @private */
    this._signer = signer

    /** @private */
    this._shouldWipeSignerOnDisposal = isSeed || Boolean(configuration.shouldWipeSignerOnDisposal)

    /** @private */
    this._disposed = false
  }

  /**
   * Creates a new solana gasless wallet account from a raw private key. The account owns the signer it creates
   * and wipes it on {@link dispose}.
   *
   * @param {string | Uint8Array} privateKey - A 32-byte Ed25519 private key (hex string or bytes), or a 64-byte secret key (base58 string or bytes).
   * @param {SolanaGaslessWalletConfig} config - The configuration object.
   * @returns {WalletAccountSolanaGasless} The wallet account.
   * @throws {ValueError} If the private key is neither a 32-byte key (hex or bytes) nor a 64-byte secret key (base58 or bytes).
   * @throws {ValueError} If the secret key's public half does not match its private half.
   * @throws {ValueError} If a required paymaster field is missing from the configuration.
   * @throws {ValueError} If the `paymasterUrl` option is an empty list.
   */
  static fromPrivateKey (privateKey, config) {
    const signer = new PrivateKeySignerSolana(privateKey)

    try {
      return new WalletAccountSolanaGasless(signer, { ...config, shouldWipeSignerOnDisposal: true })
    } catch (error) {
      signer.dispose()

      throw error
    }
  }

  /**
   * True if the wallet account has been disposed.
   *
   * @type {boolean}
   */
  get disposed () {
    return this._disposed
  }

  /**
   * The derivation path of this account (see SLIP-0010), or null if the account's signer is not bound to a
   * derivation position (e.g. private-key signers).
   *
   * @type {string | null}
   */
  get path () {
    return this._signer.path
  }

  /**
   * The account's key pair, or null if the account's signer does not allow
   * retrieving key material (e.g. hardware signers).
   *
   * The uint8 arrays are the signer's own, so any external change will reflect to the signer's internal representation. For this reason,
   * it's strongly recommended to treat the key pair as a read-only view of the keys. While it's still technically possible to alter their
   * content, client code should never do so.
   *
   * @type {KeyPair | null}
   */
  get keyPair () {
    return this._signer.keyPair
  }

  /**
   * Returns the account's address.
   *
   * @returns {Promise<string>} The account's address.
   */
  async getAddress () {
    return await this._signer.getAddress()
  }

  /**
   * Signs a message.
   *
   * @param {string} message - The message to sign.
   * @returns {Promise<string>} The message's signature.
   * @throws {DisposalError} If the wallet account has been disposed.
   */
  async sign (message) {
    this._guardDisposed()

    return await this._signer.sign(message)
  }

  /**
   * Signs a transaction.
   *
   * @param {SolanaTransaction} tx - The transaction to sign.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<FullySignedTransaction>} The signed transaction.
   * @throws {DisposalError} If the wallet account has been disposed.
   * @throws {MaximumFeeExceededError} If the transaction's cost exceeds the maximum transaction fee option.
   * @throws {ValueError} If the transaction doesn't include the account among its signers.
   */
  async signTransaction (tx, config = {}) {
    this._guardDisposed()

    const mergedConfig = this._mergeConfig(config)

    const { fee, transactionMessage } = await this._populateTransactionMessage(tx, config)

    if (mergedConfig.transactionMaxFee !== undefined && fee > mergedConfig.transactionMaxFee) {
      throw new MaximumFeeExceededError('Exceeded maximum fee cost for transaction operation.')
    }

    const encodedTransaction = await this._signTransactionMessage(transactionMessage)

    const { signed_transaction: signedTransaction } = await this._paymaster.signTransaction({
      transaction: encodedTransaction,
      signer_key: this._config.paymasterAddress
    })

    const fullySignedTransaction = getTransactionDecoder().decode(getBase64Encoder().encode(signedTransaction))

    assertIsFullySignedTransaction(fullySignedTransaction)

    return fullySignedTransaction
  }

  /**
   * Sends a transaction.
   *
   * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction. Either an unsigned transaction or an already-signed transaction (as returned by `signTransaction`).
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<TransactionResult>} The transaction's result.
   * @throws {DisposalError} If the wallet account has been disposed.
   * @throws {MaximumFeeExceededError} If the transaction's cost exceeds the maximum transaction fee option.
   * @throws {ValueError} If the transaction doesn't include the account among its signers.
   * @note When an already-signed transaction is passed, the paymaster has already co-signed it at sign time, so it is not contacted again and the transaction is broadcast directly to the network. The returned `fee` is decoded from the gasless payment instruction embedded in the signed message, and the `transactionMaxFee` check is re-applied before broadcasting. The `paymasterToken` option must name the same token the transaction was signed with.
   */
  async sendTransaction (tx, config = {}) {
    this._guardDisposed()

    if (this._isSignedTransaction(tx)) {
      const mergedConfig = this._mergeConfig(config)

      const fee = await this._getSignedTransactionFee(tx, mergedConfig.paymasterToken.address)

      if (mergedConfig.transactionMaxFee !== undefined && fee > mergedConfig.transactionMaxFee) {
        throw new MaximumFeeExceededError('Exceeded maximum fee cost for transaction operation.')
      }

      const hash = await this._broadcastSignedTransaction(tx)

      return { hash, fee }
    }

    const mergedConfig = this._mergeConfig(config)

    const { fee, transactionMessage } = await this._populateTransactionMessage(tx, config)

    if (mergedConfig.transactionMaxFee !== undefined && fee > mergedConfig.transactionMaxFee) {
      throw new MaximumFeeExceededError('Exceeded maximum fee cost for transaction operation.')
    }

    const encodedTransaction = await this._signTransactionMessage(transactionMessage)

    const { signature: hash } = await this._paymaster.signAndSendTransaction({
      transaction: encodedTransaction,
      signer_key: this._config.paymasterAddress
    })

    return { hash, fee }
  }

  /**
   * Quotes the costs of a send transaction operation.
   *
   * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction. Either an unsigned transaction or an already-signed transaction (as returned by `signTransaction`).
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   * @note When an already-signed transaction is passed, the returned `fee` is decoded from the gasless payment instruction embedded in the signed message (matching `sendTransaction`). The `paymasterToken` option must name the same token the transaction was signed with.
   */
  async quoteSendTransaction (tx, config = {}) {
    if (this._isSignedTransaction(tx)) {
      const mergedConfig = this._mergeConfig(config)
      const fee = await this._getSignedTransactionFee(tx, mergedConfig.paymasterToken.address)

      return { fee }
    }

    return await super.quoteSendTransaction(tx, config)
  }

  /**
   * Transfers a token to another address. Native SOL transfers are not supported here.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<TransferResult>} The transfer's result.
   * @throws {DisposalError} If the wallet account has been disposed.
   * @throws {MaximumFeeExceededError} If the transfer's cost exceeds the maximum transfer fee option.
   * @throws {ValueError} If the transaction doesn't include the account among its signers.
   */
  async transfer ({ token, recipient, amount }, config = {}) {
    this._guardDisposed()

    const mergedConfig = this._mergeConfig(config)

    const tx = await this._buildSPLTransferTransactionMessage(token, recipient, amount)

    const { fee, transactionMessage } = await this._populateTransactionMessage(tx, mergedConfig)

    if (mergedConfig.transferMaxFee !== undefined && fee > mergedConfig.transferMaxFee) {
      throw new MaximumFeeExceededError('Exceeded maximum fee cost for transfer operation.')
    }

    const encodedTransaction = await this._signTransactionMessage(transactionMessage)

    const { signature: hash } = await this._paymaster.signAndSendTransaction({
      transaction: encodedTransaction,
      signer_key: this._config.paymasterAddress
    })

    return { hash, fee }
  }

  /**
   * Returns a read-only copy of the account.
   *
   * @returns {Promise<WalletAccountReadOnlySolanaGasless>} The read-only account.
   */
  async toReadOnlyAccount () {
    const addr = await this.getAddress()

    const readOnlyAccount = new WalletAccountReadOnlySolanaGasless(addr, this._config)

    return readOnlyAccount
  }

  /**
   * Disposes the object along with all its data (cleaning up any sensitive field from memory). The signer given at
   * construction is wiped only if the account owns it (see {@link SignerOptions}); a caller-owned signer is left for
   * the caller to dispose. Calling it again has no effect.
   */
  dispose () {
    if (this._disposed) {
      return
    }

    if (this._shouldWipeSignerOnDisposal) {
      this._signer.dispose()
    }

    this._disposed = true
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

    const paymasterPublicKey = address(this._config.paymasterAddress)
    draft = setTransactionMessageFeePayer(paymasterPublicKey, draft)

    const { payment_amount: fee, payment_instruction: paymentInstruction } = await this._getTransactionPaymentInfo(draft, config)

    const transactionMessage = appendTransactionMessageInstruction(paymentInstruction, draft)

    return { fee: BigInt(fee), transactionMessage }
  }

  /**
   * Broadcasts an already-signed transaction directly to the network, bypassing the paymaster.
   *
   * @private
   * @param {FullySignedTransaction} signedTransaction - The signed transaction.
   * @returns {Promise<string>} The transaction's signature.
   * @throws {ProviderRequiredError} If the wallet is not connected to a provider.
   */
  async _broadcastSignedTransaction (signedTransaction) {
    if (!this._rpc) {
      throw new ProviderRequiredError('The wallet must be connected to a provider to send transactions.')
    }

    const encodedTransaction = getBase64EncodedWireTransaction(signedTransaction)

    return await this._rpc.sendTransaction(encodedTransaction, { encoding: 'base64' }).send()
  }

  /**
   * Decodes the gasless payment fee embedded in an already-signed transaction by locating the
   * SPL token transfer instruction that pays the paymaster's associated token account. The Kora
   * payment amount is encoded as a `u64` in that instruction, so the fee can be recovered from
   * the signed message without contacting the paymaster.
   *
   * @private
   * @param {FullySignedTransaction} signedTransaction - The signed transaction.
   * @param {string} [paymasterTokenAddress] - The paymaster fee token mint used by the signed transaction.
   * @returns {Promise<bigint>} The gasless payment amount (in the paymaster token's base units).
   * @throws {ProviderRequiredError} If the wallet is not connected to a provider.
   * @throws {NoSuchElementError} If the signed transaction carries no payment instruction for the given paymaster token.
   */
  async _getSignedTransactionFee (signedTransaction, paymasterTokenAddress = this._config.paymasterToken.address) {
    if (!this._rpc) {
      throw new ProviderRequiredError('The wallet must be connected to a provider to quote transactions.')
    }

    const compiledTransactionMessage = getCompiledTransactionMessageDecoder().decode(signedTransaction.messageBytes)

    const { instructions } = await decompileTransactionMessageFetchingLookupTables(compiledTransactionMessage, this._rpc)

    const paymasterTokenAccount = await this._getPaymasterAssociatedTokenAccount(paymasterTokenAddress)

    const paymentInstruction = instructions.find((instruction) =>
      this._isPaymentInstruction(instruction, paymasterTokenAccount))

    if (!paymentInstruction) {
      throw new NoSuchElementError('No gasless payment instruction found for the given paymaster token.')
    }

    return this._getPaymentInstructionAmount(paymentInstruction, paymasterTokenAccount)
  }

  /**
   * Determines whether a value is an already-signed transaction (as returned by `signTransaction`)
   * rather than an unsigned {@link SolanaTransaction}.
   *
   * @protected
   * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction to inspect.
   * @returns {tx is FullySignedTransaction} True if the value is a signed transaction.
   */
  _isSignedTransaction (tx) {
    return tx !== null &&
      typeof tx === 'object' &&
      tx.messageBytes !== undefined &&
      tx.signatures !== undefined
  }

  /** @private */
  async _signTransactionMessage (transactionMessage) {
    const compiledTransaction = await partiallySignTransactionMessageWithSigners(transactionMessage)

    const unsignedBytes = Uint8Array.from(getTransactionEncoder().encode(compiledTransaction))

    const signedBytes = await this._signer.signTransaction(unsignedBytes)

    return getBase64EncodedWireTransaction(getTransactionDecoder().decode(signedBytes))
  }

  /** @private */
  _guardDisposed () {
    if (this._disposed) {
      throw new DisposalError('The wallet account has been disposed.')
    }
  }
}
