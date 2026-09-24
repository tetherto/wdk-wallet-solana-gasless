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
     * @throws {ValueError} If no paymaster token is configured (sponsored or native-coins mode).
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
     * @deprecated Use {@link getTransaction} instead, which returns a normalized, finality-based receipt. The raw transaction remains available on its `transaction` property.
     * @param {string} hash - The transaction's hash.
     * @returns {Promise<SolanaTransactionReceipt | null>} — The receipt, or null if the transaction has not been included in a block yet.
     */
    getTransactionReceipt(hash: string): Promise<SolanaTransactionReceipt | null>;
    /**
     * Returns a normalized, finality-based receipt for a transaction.
     *
     * @param {string} hash - The transaction's signature.
     * @returns {Promise<TransactionReceipt & SolanaTransactionDetails>} The normalized receipt.
     * @throws {ValueError} If the hash is not a valid signature.
     * @throws {NoSuchElementError} If no transaction has been found for the given hash.
     */
    getTransaction(hash: string): Promise<TransactionReceipt & SolanaTransactionDetails>;
    /**
     * Blocks until a transaction reaches the requested finality target, or times out.
     *
     * Note: Solana RPC does not expose a `dropped` state. An evicted or never-landed
     * signature simply reports no status, which is indistinguishable from a not-yet-seen
     * transaction and is treated as still-pending. A dropped transaction therefore surfaces
     * as a {@link TimeoutError} rather than resolving to a `dropped` receipt.
     *
     * @param {string} hash - The transaction's signature.
     * @param {WaitForTransactionOptions} [options] - The wait options.
     * @returns {Promise<TransactionReceipt & SolanaTransactionDetails>} The terminal receipt for the finality target reached (inspect `success` to tell success from revert).
     * @throws {TimeoutError} If the target is not reached before the timeout.
     */
    waitForTransaction(hash: string, options?: WaitForTransactionOptions): Promise<TransactionReceipt & SolanaTransactionDetails>;
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
     * @throws {ValueError} If the configuration is invalid or has missing required fields.
     * @returns {void}
     */
    protected static _validateConfig (config: Omit<SolanaGaslessWalletConfig, 'transferMaxFee'>): void

    /**
     * Builds the paymaster client from the wallet configuration: an already-built {@link KoraClient}
     * (or failover wrapper) reused as-is, a paymaster url or client options, or a failover list of any
     * of these. Passing an already-built client is what lets a manager share a single instance across
     * every account it creates.
     *
     * @protected
     * @param {Omit<SolanaGaslessWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>} [config] - The configuration object.
     * @returns {KoraClient} The paymaster client.
     * @throws {ValueError} If the `paymasterUrl` option is set to an empty list.
     */
    protected static _buildPaymaster (config?: Omit<SolanaGaslessWalletConfig, 'transferMaxFee' | 'transactionMaxFee'>): KoraClient
    /**
     * Checks whether a value is an already-built {@link KoraClient} (or a failover wrapper around one),
     * as opposed to a url string or client options. Detection is by shape so a failover `Proxy` is
     * recognized too.
     *
     * @protected
     * @param {unknown} value - The value to check.
     * @returns {boolean} `true` if the value is an already-built kora client.
     */
    protected static _isKoraClient (value: unknown): boolean
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
     * @throws {ValueError} If the amount exceeds the representable range.
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
     * @throws {ValueError} If the transaction fee payer does not match the paymaster address.
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
    /**
     * Merges a caller's configuration overrides on top of the account's configuration. Keys whose
     * override value is `undefined` keep the configured value, so an option left unset in an
     * override object does not erase it.
     *
     * @protected
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} config - The configuration overrides.
     * @returns {Omit<SolanaGaslessWalletConfig, 'transferMaxFee' | 'transactionMaxFee'> & SolanaGaslessWalletPaymasterConfigOverrides} The merged configuration.
     */
    protected _mergeConfig(config: SolanaGaslessWalletPaymasterConfigOverrides): Omit<SolanaGaslessWalletConfig, "transferMaxFee" | "transactionMaxFee"> & SolanaGaslessWalletPaymasterConfigOverrides;
    /**
     * @protected
     * @param {string} [paymasterTokenAddress] - The paymaster fee token mint.
     * @returns {Promise<string>} The paymaster's associated token account for that mint.
     */
    protected _getPaymasterAssociatedTokenAccount(paymasterTokenAddress?: string): Promise<string>;
    /**
     * @protected
     * @param {object} instruction - A candidate SPL token instruction.
     * @param {string} paymasterTokenAccount - The paymaster associated token account.
     * @returns {boolean} True if the instruction is an SPL transfer whose destination is the paymaster token account.
     */
    protected _isPaymentInstruction(instruction: object, paymasterTokenAccount: string): boolean;
    /**
     * @protected
     * @param {object} paymentInstruction - The paymaster payment instruction.
     * @param {string} paymasterTokenAccount - The paymaster associated token account.
     * @returns {bigint} The transfer amount encoded in the instruction.
     * @throws {ValueError} If the instruction is not a recognized SPL transfer to the paymaster token account.
     */
    protected _getPaymentInstructionAmount(paymentInstruction: object, paymasterTokenAccount: string): bigint;
}
export type TransactionResult = import("@tetherto/wdk-wallet").TransactionResult;
export type TransactionReceipt = import("@tetherto/wdk-wallet").TransactionReceipt;
export type WaitForTransactionOptions = import("@tetherto/wdk-wallet").WaitForTransactionOptions;
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
export type SolanaTransactionDetails = import("@tetherto/wdk-wallet-solana").SolanaTransactionDetails;
export type PaymasterTokenConfig = {
    /**
     * - The address of the paymaster token.
     */
    address: string;
};
export type SolanaGaslessWalletPaymasterConfig = {
    /**
     * - The paymaster RPC url, client options, an already-built kora client, or failover list. An already-built client (or failover wrapper) is reused as-is, so a manager can share a single instance across every account it creates.
     */
    paymasterUrl: string | KoraClientOptions | KoraClient | (string | KoraClientOptions | KoraClient)[];
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
import { WalletAccountReadOnly, ValueError } from '@tetherto/wdk-wallet';
import { KoraClient } from '@solana/kora';
