export default class WalletAccountReadOnlySolanaGasless extends WalletAccountReadOnly {
    /**
     * Creates a new solana read-only wallet account.
     *
     * @param {string} addr - The account's address.
     * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} config - The configuration object.
     */
    constructor(addr: string, config: Omit<SolanaGaslessWalletConfig, "transferMaxFee" | "transactionMaxFee">);
    /**
     * The read-only wallet account configuration.
     *
     * @protected
     * @type {Omit<SolanaGaslessWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>}
     */
    protected _config: Omit<SolanaGaslessWalletConfig, "transferMaxFee" | "transactionMaxFee">;
    /** @private */
    private _solanaReadOnlyAccount;
    /**
     * The commitment level for querying transaction and account states.
     * Determines the level of finality required before returning results.
     *
     * @protected
     * @type {Commitment}
     */
    protected _commitment: Commitment;
    /**
     * A Solana RPC client for HTTP requests.
     *
     * @protected
     * @type {SolanaRpc | undefined}
     */
    protected _rpc: SolanaRpc | undefined;
    /**
     * A Kora RPC client for paymaster requests.
     *
     * @protected
     * @type {KoraClient}
     */
    protected _paymaster: KoraClient;
    /**
     * Returns the account's native SOL balance.
     *
     * @returns {Promise<bigint>} The sol balance (in lamports).
     */
    getBalance(): Promise<bigint>;
    /**
     * Returns the account balance for a specific SPL token.
     *
     * @param {string} tokenAddress - The mint address of the token.
     * @returns {Promise<bigint>} The token balance (in base unit).
     */
    getTokenBalance(tokenAddress: string): Promise<bigint>;
    /**
     * Returns the account balances for a list of SPL tokens.
     *
     * @param {string[]} tokenAddresses - The mint addresses of the tokens.
     * @returns {Promise<Record<string, bigint>>} A mapping of token addresses to their balances (in base units).
     */
    getTokenBalances(tokenAddresses: string[]): Promise<Record<string, bigint>>;
    /**
     * Returns the account's balance for the paymaster token provided in the wallet account configuration.
     *
     * @returns {Promise<bigint>} The paymaster token balance (in base unit).
     * @throws {Error} If no paymaster token is configured (sponsored or native-coins mode).
     */
    getPaymasterTokenBalance(): Promise<bigint>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {SolanaTransaction} tx - The transaction.
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     */
    quoteSendTransaction(tx: SolanaTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Quotes the costs of a transfer operation.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<Omit<TransferResult, 'hash'>>} The transfer's quotes.
     */
    quoteTransfer(options: TransferOptions, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<Omit<TransferResult, "hash">>;
    /**
     * Retrieves a transaction receipt by its signature
     *
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<SolanaTransactionReceipt | null>} — The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<SolanaTransactionReceipt | null>;
    /**
     * Verifies a message's signature.
     *
     * @param {string} message - The original message.
     * @param {string} signature - The signature to verify.
     * @returns {Promise<boolean>} True if the signature is valid.
     */
    verify(message: string, signature: string): Promise<boolean>;
    /**
     * Validates the configuration to ensure all required fields are present.
     *
     * @protected
     * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>} config - The configuration to validate.
     * @throws {ConfigurationError} If the configuration is invalid or has missing required fields.
     * @returns {void}
     */
    protected static _validateConfig (config: Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>): void

    /**
     * Creates a FailoverProvider from the configured providers. If only one provider is supplied, it is wrapped and returned.
     *
     * @protected
     * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>} [config] - The configuration object.
     * @returns {KoraClient} A wrapped KoraClient instance.
     * @throws {ConfigurationError} If the `paymasterUrl` option is set to an empty array.
     */
    protected _createFailoverProvider (config?: Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>): KoraClient
    /**
     * Builds a transaction message for native SOL transfer.
     * Creates a transfer instruction for sending SOL.
     *
     * @protected
     * @param {string} to - The recipient's address.
     * @param {number | bigint} value - The amount of SOL to send (in lamports).
     * @returns {Promise<TransactionMessage>} The constructed transaction message.
     */
    protected _buildNativeTransferTransactionMessage(to: string, value: number | bigint): Promise<TransactionMessage>;
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
    protected _buildSPLTransferTransactionMessage(token: string, recipient: string, amount: number | bigint): Promise<TransactionMessage>;
    /**
     * Ensures the transaction has either a blockhash lifetime or a durable nonce lifetime.
     *
     * @protected
     * @param {SolanaTransaction} tx - The transaction.
     * @returns {Promise<SolanaTransaction>} The transaction with lifetime.
     */
    protected _ensureLifetime(tx: SolanaTransaction): Promise<SolanaTransaction>;
    /**
     * Asserts that any explicit transaction fee payer matches the paymaster address.
     *
     * @protected
     * @param {SolanaTransaction} tx - The transaction.
     * @returns {Promise<void>} Resolves when the transaction has no explicit fee payer or it matches the paymaster address.
     * @throws {Error} If the transaction fee payer does not match the paymaster address.
     */
    protected _assertFeePayer(tx: SolanaTransaction): Promise<void>;
    /**
     * Fetch the payment info for a given transaction message.
     *
     * @protected
     * @param {TransactionMessage} transactionMessage - The transaction message to fetch the payment info.
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<GetPaymentInstructionResponse>} The payment info.
     */
    protected _getTransactionPaymentInfo(transactionMessage: TransactionMessage, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<GetPaymentInstructionResponse>;
}
export type TransactionResult = import("@tetherto/wdk-wallet").TransactionResult;
export type TransactionMessage = import("@solana/transaction-messages").TransactionMessage;
export type SolanaRpc = ReturnType<typeof import("@solana/rpc").createSolanaRpc>;
export type SolanaTransactionReceipt = ReturnType<import("@solana/rpc-api").SolanaRpcApi["getTransaction"]>;
export type Commitment = import("@solana/rpc-types").Commitment;
export type KoraClientOptions = import("@solana/kora").KoraClientOptions;
export type GetPaymentInstructionResponse = import("@solana/kora").GetPaymentInstructionResponse;
export type SolanaTransaction = import("@tetherto/wdk-wallet-solana").SolanaTransaction;
export type SolanaWalletConfig = import("@tetherto/wdk-wallet-solana").SolanaWalletConfig;
export type TransferOptions = import("@tetherto/wdk-wallet-solana").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-solana").TransferResult;
import { ConfigurationError } from './errors.js';
export type PaymasterTokenConfig = {
    /**
     * - The address of the paymaster token.
     */
    address: string;
};
export type SolanaGaslessWalletPaymasterConfig = {
    /**
     * - The paymaster RPC url, client options, or failover list.
     */
    paymasterUrl: string | KoraClientOptions | (string | KoraClientOptions)[];
    /**
     * - The address of the paymaster program.
     */
    paymasterAddress: string;
    /**
     * - The paymaster token configuration.
     */
    paymasterToken: PaymasterTokenConfig;
};
export type SolanaGaslessWalletPaymasterConfigOverrides = Partial<Pick<SolanaGaslessWalletPaymasterConfig, "paymasterToken"> & Pick<SolanaWalletConfig, "transferMaxFee" | "transactionMaxFee">>;
export type SolanaGaslessWalletConfig = SolanaWalletConfig & SolanaGaslessWalletPaymasterConfig;
import { WalletAccountReadOnly } from '@tetherto/wdk-wallet';
import { KoraClient } from '@solana/kora';
