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

import { WalletAccountReadOnly } from '@tetherto/wdk-wallet'

import { WalletAccountReadOnlySolana } from '@tetherto/wdk-wallet-solana'

import FailoverProvider from '@tetherto/wdk-failover-provider'

import { address } from '@solana/addresses'
import { appendTransactionMessageInstruction, appendTransactionMessageInstructions, createTransactionMessage, setTransactionMessageFeePayer, setTransactionMessageLifetimeUsingBlockhash } from '@solana/transaction-messages'
import { KoraClient } from '@solana/kora'
import { compileTransaction, getBase64EncodedWireTransaction } from '@solana/transactions'
import { findAssociatedTokenPda, getCreateAssociatedTokenIdempotentInstruction, getTransferInstruction, TOKEN_PROGRAM_ADDRESS } from '@solana-program/token'
import { AccountRole, createNoopSigner, pipe } from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'

import { ConfigurationError } from './errors.js'

/** @typedef {import('@tetherto/wdk-wallet').TransactionResult} TransactionResult */

/** @typedef {import('@solana/transaction-messages').TransactionMessage} TransactionMessage */
/** @typedef {ReturnType<typeof import('@solana/rpc').createSolanaRpc>} SolanaRpc */
/** @typedef {ReturnType<import('@solana/rpc-api').SolanaRpcApi['getTransaction']>} SolanaTransactionReceipt */
/** @typedef {import('@solana/rpc-types').Commitment} Commitment */
/** @typedef {import('@solana/kora').KoraClientOptions} KoraClientOptions */
/** @typedef {import('@solana/kora').GetPaymentInstructionResponse} GetPaymentInstructionResponse */

/** @typedef {import('@tetherto/wdk-wallet-solana').SolanaTransaction} SolanaTransaction */
/** @typedef {import('@tetherto/wdk-wallet-solana').SolanaWalletConfig} SolanaWalletConfig */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferOptions} TransferOptions */
/** @typedef {import('@tetherto/wdk-wallet-solana').TransferResult} TransferResult */

/**
 * @typedef {Object} PaymasterTokenConfig
 * @property {string} address - The address of the paymaster token.
 */

/**
 * @typedef {Object} SolanaGaslessWalletPaymasterConfig
 * @property {string | KoraClientOptions | (string | KoraClientOptions)[]} paymasterUrl - The paymaster RPC url, client options, or failover list.
 * @property {string} paymasterAddress - The address of the paymaster program.
 * @property {PaymasterTokenConfig} paymasterToken - The paymaster token configuration.
 */

/** @typedef {Partial<Pick<SolanaGaslessWalletPaymasterConfig, "paymasterToken"> & Pick<SolanaWalletConfig, "transferMaxFee">>} SolanaGaslessWalletPaymasterConfigOverrides */

/** @typedef {SolanaWalletConfig & SolanaGaslessWalletPaymasterConfig} SolanaGaslessWalletConfig */

const MAX_U64 = 0xffffffffffffffffn

export default class WalletAccountReadOnlySolanaGasless extends WalletAccountReadOnly {
  /**
   * Creates a new solana read-only wallet account.
   *
   * @param {string} addr - The account's address.
   * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>} config - The configuration object.
   */
  constructor (addr, config) {
    WalletAccountReadOnlySolanaGasless._validateConfig(config)

    const solanaReadOnlyAccount = new WalletAccountReadOnlySolana(addr, config)

    super(solanaReadOnlyAccount._address)

    /**
     * The read-only wallet account configuration.
     *
     * @protected
     * @type {Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>}
     */
    this._config = config

    /** @private */
    this._solanaReadOnlyAccount = solanaReadOnlyAccount

    /**
     * The commitment level for querying transaction and account states.
     * Determines the level of finality required before returning results.
     *
     * @protected
     * @type {Commitment}
     */
    this._commitment = this._solanaReadOnlyAccount._commitment

    /**
     * A Solana RPC client for HTTP requests.
     *
     * @protected
     * @type {SolanaRpc | undefined}
     */
    this._rpc = this._solanaReadOnlyAccount._rpc

    /**
     * A Kora RPC client for paymaster requests.
     *
     * @protected
     * @type {KoraClient}
     */
    this._paymaster = this._createFailoverProvider()
  }

  /**
   * Returns the account's native SOL balance.
   *
   * @returns {Promise<bigint>} The sol balance (in lamports).
   */
  async getBalance () {
    return await this._solanaReadOnlyAccount.getBalance()
  }

  /**
   * Returns the account balance for a specific SPL token.
   *
   * @param {string} tokenAddress - The mint address of the token.
   * @returns {Promise<bigint>} The token balance (in base unit).
   */
  async getTokenBalance (tokenAddress) {
    return await this._solanaReadOnlyAccount.getTokenBalance(tokenAddress)
  }

  /**
   * Returns the account balances for a list of SPL tokens.
   *
   * @param {string[]} tokenAddresses - The mint addresses of the tokens.
   * @returns {Promise<Record<string, bigint>>} A mapping of token addresses to their balances (in base units).
   */
  async getTokenBalances (tokenAddresses) {
    return await this._solanaReadOnlyAccount.getTokenBalances(tokenAddresses)
  }

  /**
   * Returns the account's balance for the paymaster token provided in the wallet account configuration.
   *
   * @returns {Promise<bigint>} The paymaster token balance (in base unit).
   * @throws {Error} If no paymaster token is configured (sponsored or native-coins mode).
   */
  async getPaymasterTokenBalance () {
    const { paymasterToken } = this._config

    if (!paymasterToken) {
      throw new Error('Paymaster token is not configured.')
    }

    return await this.getTokenBalance(paymasterToken.address)
  }

  /**
   * Quotes the costs of a send transaction operation.
   *
   * @param {SolanaTransaction} tx - The transaction.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
   */
  async quoteSendTransaction (tx, config = {}) {
    let transactionMessage = tx

    // Handle native token transfer { to, value } transaction
    if (tx.to !== undefined && tx.value !== undefined) {
      transactionMessage = await this._buildNativeTransferTransactionMessage(tx.to, tx.value)
    }

    if (Array.isArray(transactionMessage.instructions)) {
      transactionMessage = await this._ensureLifetime(transactionMessage)
      await this._assertFeePayer(transactionMessage)
      transactionMessage = setTransactionMessageFeePayer(address(this._config.paymasterAddress), transactionMessage)
    }

    const { payment_amount: fee } = await this._getTransactionPaymentInfo(transactionMessage, config)

    return { fee: BigInt(fee) }
  }

  /**
   * Quotes the costs of a transfer operation.
   *
   * @param {TransferOptions} options - The transfer's options.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
   */
  async quoteTransfer ({ token, recipient, amount }, config = {}) {
    const transactionMessage = await this._buildSPLTransferTransactionMessage(token, recipient, amount)

    const { payment_amount: fee } = await this._getTransactionPaymentInfo(transactionMessage, config)

    return { fee: BigInt(fee) }
  }

  /**
   * Retrieves a transaction receipt by its signature
   *
   * @param {string} hash - The transaction's hash.
   * @returns {Promise<SolanaTransactionReceipt | null>} — The receipt, or null if the transaction has not been included in a block yet.
   */
  async getTransactionReceipt (hash) {
    return await this._solanaReadOnlyAccount.getTransactionReceipt(hash)
  }

  /**
   * Verifies a message's signature.
   *
   * @param {string} message - The original message.
   * @param {string} signature - The signature to verify.
   * @returns {Promise<boolean>} True if the signature is valid.
   */
  async verify (message, signature) {
    return await this._solanaReadOnlyAccount.verify(message, signature)
  }

  /**
   * Builds a transaction message for native SOL transfer.
   * Creates a transfer instruction for sending SOL.
   *
   * @protected
   * @param {string} to - The recipient's address.
   * @param {number | bigint} value - The amount of SOL to send (in lamports).
   * @returns {Promise<TransactionMessage>} The constructed transaction message.
   */
  async _buildNativeTransferTransactionMessage (to, value) {
    const addr = await this.getAddress()

    const paymasterPublicKey = address(this._config.paymasterAddress)
    const fromPublicKey = address(addr)
    const toPublicKey = address(to)

    // Create transfer instruction
    const transferInstruction = getTransferSolInstruction({
      source: createNoopSigner(fromPublicKey),
      destination: toPublicKey,
      amount: BigInt(value)
    })

    // Get latest blockhash
    const { value: latestBlockhash } = await this._rpc
      .getLatestBlockhash({ commitment: this._commitment })
      .send()

    // Build transaction message using pipe
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(paymasterPublicKey, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstruction(transferInstruction, tx)
    )

    return transactionMessage
  }

  /**
   * Validates the configuration to ensure all required fields are present.
   *
   * @protected
   * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>} config - The configuration to validate.
   * @throws {ConfigurationError} If the configuration is invalid or has missing required fields.
   * @returns {void}
   */
  static _validateConfig (config) {
    let { paymasterUrl, paymasterAddress, paymasterToken } = config
    const missingFields = []

    if (!Array.isArray(paymasterUrl)) {
      paymasterUrl = typeof paymasterUrl === 'string' ? paymasterUrl : paymasterUrl?.rpcUrl
      if (!paymasterUrl) {
        missingFields.push('paymasterUrl')
      }
    }

    if (!paymasterAddress) {
      missingFields.push('paymasterAddress')
    }

    if (!paymasterToken) {
      missingFields.push('paymasterToken')
    }

    if (missingFields.length > 0) {
      throw new ConfigurationError(`Missing required paymaster token configuration fields: ${missingFields.join(', ')}.`)
    }
  }

  /**
   * Creates a FailoverProvider from the configured providers. If only one provider is supplied, it is wrapped and returned.
   *
   * @protected
   * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>} [config] - The configuration object.
   * @returns {KoraClient} A wrapped KoraClient instance.
   * @throws {ConfigurationError} If the `paymasterUrl` option is set to an empty array.
   */
  _createFailoverProvider (config = this._config) {
    const { paymasterUrl, retries = 3 } = config

    if (Array.isArray(paymasterUrl)) {
      if (!paymasterUrl.length) {
        throw new Error("The 'paymasterUrl' option cannot be set to an empty list.")
      }

      const failoverProvider = new FailoverProvider({ retries })

      for (const entry of paymasterUrl) {
        const opts = typeof entry === 'string'
          ? { rpcUrl: entry }
          : entry
        const option = new KoraClient(opts)
        failoverProvider.addProvider(option)
      }

      return failoverProvider.initialize()
    }

    const opts = typeof paymasterUrl === 'string'
      ? { rpcUrl: paymasterUrl }
      : paymasterUrl
    return new KoraClient(opts)
  }

  /**
   * Builds a transaction message for SPL token transfer.
   * Creates instructions for ATA creation (if needed) and token transfer.
   *
   * @protected
   * @param {string} token - The SPL token mint address (base58-encoded public key).
   * @param {string} recipient - The recipient's wallet address (base58-encoded public key).
   * @param {number | bigint} amount - The amount to transfer in token's base units (must be ≤ 2^64-1).
   * @returns {Promise<TransactionMessage>} The constructed transaction message.
   * @todo Support Token-2022 (Token Extensions Program).
   * @todo Support transfer with memo for tokens that require it.
   */
  async _buildSPLTransferTransactionMessage (token, recipient, amount) {
    if (typeof amount === 'bigint' && amount > MAX_U64) {
      throw new Error('Amount exceeds u64 maximum value')
    }
    if (typeof amount === 'number' && amount > Number.MAX_SAFE_INTEGER) {
      throw new Error('Amount exceeds safe integer range')
    }

    const addr = await this.getAddress()

    const ownerPublicKey = address(addr)
    const paymasterPublicKey = address(this._config.paymasterAddress)
    const tokenMint = address(token)
    const recipientPublicKey = address(recipient)

    // Get associated token addresses
    const [fromATA, toATA] = await Promise.all([ownerPublicKey, recipientPublicKey].map(async (owner) => {
      const [ata] = await findAssociatedTokenPda({
        mint: tokenMint,
        owner,
        tokenProgram: TOKEN_PROGRAM_ADDRESS
      })
      return ata
    }))

    const instructions = []

    const recipientATAInfo = await this._rpc
      .getAccountInfo(toATA, { commitment: this._commitment, encoding: 'base64' })
      .send()

    // If recipient's ATA doesn't exist, add creation instruction (idempotent)
    if (!recipientATAInfo.value) {
      const createATAInstruction = getCreateAssociatedTokenIdempotentInstruction({
        ata: toATA,
        mint: tokenMint,
        owner: recipientPublicKey,
        payer: paymasterPublicKey
      })
      instructions.push(createATAInstruction)
    }

    // Add transfer instruction
    const transferInstruction = getTransferInstruction({
      source: fromATA,
      mint: tokenMint,
      destination: toATA,
      authority: createNoopSigner(ownerPublicKey),
      amount: BigInt(amount)
    })

    instructions.push(transferInstruction)

    // Get latest blockhash
    const { value: latestBlockhash } = await this._rpc
      .getLatestBlockhash({ commitment: this._commitment })
      .send()

    // Build transaction message using pipe
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayer(paymasterPublicKey, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
      (tx) => appendTransactionMessageInstructions(instructions, tx)
    )

    return transactionMessage
  }

  /**
   * Ensures the transaction has either a blockhash lifetime or a durable nonce lifetime.
   *
   * @protected
   * @param {SolanaTransaction} tx - The transaction.
   * @returns {Promise<SolanaTransaction>} The transaction with lifetime.
   */
  async _ensureLifetime (tx) {
    return await this._solanaReadOnlyAccount._ensureLifetime(tx)
  }

  /**
   * Asserts that any explicit transaction fee payer matches the paymaster address.
   *
   * @protected
   * @param {SolanaTransaction} tx - The transaction.
   * @returns {Promise<void>} Resolves when the transaction has no explicit fee payer or it matches the paymaster address.
   * @throws {Error} If the transaction fee payer does not match the paymaster address.
   */
  async _assertFeePayer (tx) {
    if (tx.feePayer) {
      const feePayerAddress = typeof tx.feePayer === 'string' ? tx.feePayer : tx.feePayer.address
      if (feePayerAddress !== this._config.paymasterAddress) {
        throw new Error(`Transaction fee payer (${feePayerAddress}) does not match paymaster address (${this._config.paymasterAddress})`)
      }
    }
  }

  /**
   * Fetch the payment info for a given transaction message.
   *
   * @protected
   * @param {TransactionMessage} transactionMessage - The transaction message to fetch the payment info.
   * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
   * @returns {Promise<GetPaymentInstructionResponse>} The payment info.
   */
  async _getTransactionPaymentInfo (transactionMessage, config = {}) {
    const mergedConfig = { ...this._config, ...config }

    const addr = await this.getAddress()

    const draft = getBase64EncodedWireTransaction(compileTransaction(transactionMessage))

    const { payment_instruction: paymentInstruction, ...payment } = await this._paymaster.getPaymentInstruction({
      transaction: draft,
      fee_token: mergedConfig.paymasterToken.address,
      source_wallet: addr,
      token_program_id: TOKEN_PROGRAM_ADDRESS
    })

    const upgradedPaymentInstruction = {
      ...paymentInstruction,
      accounts: (paymentInstruction.accounts || []).map((account) => {
        if (account.address !== addr) return account
        return { ...account, role: AccountRole.READONLY_SIGNER }
      })
    }

    return { ...payment, payment_instruction: upgradedPaymentInstruction }
  }
}
