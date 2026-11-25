export default class WalletAccountSolanaGasless extends WalletAccountReadOnlySolanaGasless implements IWalletAccount<FullySignedTransaction> {
    /**
     * Creates a new solana gasless wallet account from a signer.
     *
     * The signer is wiped on {@link dispose} only if `shouldWipeSignerOnDisposal` is set.
     *
     * @overload
     * @param {ISignerSolana} signer - The solana signer, derived to an account path.
     * @param {SolanaGaslessWalletConfig & SignerOptions} config - The configuration object.
     * @throws {ValueError} If the configuration is not valid.
     */
    constructor(signer: ISignerSolana, config: SolanaGaslessWalletConfig & SignerOptions);
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
    constructor(seed: string | Uint8Array, path: string, config: SolanaGaslessWalletConfig);
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
    constructor(seed: string | Uint8Array, config: SolanaGaslessWalletConfig);
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
    static fromPrivateKey(privateKey: string | Uint8Array, config: SolanaGaslessWalletConfig): WalletAccountSolanaGasless;
    /**
     * The solana gasless wallet account configuration.
     *
     * @protected
     * @type {SolanaGaslessWalletConfig}
     */
    protected _config: SolanaGaslessWalletConfig;
    /** @private */
    private _signer;
    /** @private */
    private _shouldWipeSignerOnDisposal;
    /** @private */
    private _disposed;
    /**
     * True if the wallet account has been disposed.
     *
     * @type {boolean}
     */
    get disposed(): boolean;
    /**
     * The derivation path of this account (see SLIP-0010), or null if the account's signer is not bound to a
     * derivation position (e.g. private-key signers).
     *
     * @type {string | null}
     */
    get path(): string | null;
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
    get keyPair(): KeyPair | null;
    /**
     * Returns the account's address.
     *
     * @returns {Promise<string>} The account's address.
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     * @throws {DisposalError} If the wallet account has been disposed.
     */
    sign(message: string): Promise<string>;
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
    signTransaction(tx: SolanaTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<FullySignedTransaction>;
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
    sendTransaction(tx: SolanaTransaction | FullySignedTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<TransactionResult>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction. Either an unsigned transaction or an already-signed transaction (as returned by `signTransaction`).
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     * @note When an already-signed transaction is passed, the returned `fee` is decoded from the gasless payment instruction embedded in the signed message (matching `sendTransaction`). The `paymasterToken` option must name the same token the transaction was signed with.
     */
    quoteSendTransaction(tx: SolanaTransaction | FullySignedTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<Omit<TransactionResult, "hash">>;
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
    transfer({ token, recipient, amount }: TransferOptions, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<TransferResult>;
    /**
     * Returns a read-only copy of the account.
     *
     * @returns {Promise<WalletAccountReadOnlySolanaGasless>} The read-only account.
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlySolanaGasless>;
    /**
     * Disposes the object along with all its data (cleaning up any sensitive field from memory). The signer given at
     * construction is wiped only if the account owns it (see {@link SignerOptions}); a caller-owned signer is left for
     * the caller to dispose. Calling it again has no effect.
     */
    dispose(): void;
    /** @private */
    private _populateTransactionMessage;
    /**
     * Broadcasts an already-signed transaction directly to the network, bypassing the paymaster.
     *
     * @private
     * @param {FullySignedTransaction} signedTransaction - The signed transaction.
     * @returns {Promise<string>} The transaction's signature.
     * @throws {ProviderRequiredError} If the wallet is not connected to a provider.
     */
    private _broadcastSignedTransaction;
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
    private _getSignedTransactionFee;
    /**
     * Determines whether a value is an already-signed transaction (as returned by `signTransaction`)
     * rather than an unsigned {@link SolanaTransaction}.
     *
     * @protected
     * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction to inspect.
     * @returns {tx is FullySignedTransaction} True if the value is a signed transaction.
     */
    protected _isSignedTransaction(tx: SolanaTransaction | FullySignedTransaction): tx is FullySignedTransaction;
    /** @private */
    private _signTransactionMessage;
    /** @private */
    private _guardDisposed;
}
export type IWalletAccount<TSignedTransaction> = import("@tetherto/wdk-wallet").IWalletAccount<TSignedTransaction>;
export type KeyPair = import("@tetherto/wdk-wallet").KeyPair;
export type TransactionResult = import("@tetherto/wdk-wallet").TransactionResult;
export type TransferOptions = import("@tetherto/wdk-wallet-solana").TransferOptions;
export type TransferResult = import("@tetherto/wdk-wallet-solana").TransferResult;
export type TransactionMessage = import("@solana/transaction-messages").TransactionMessage;
export type FullySignedTransaction = import("@solana/transactions").FullySignedTransaction;
export type SolanaTransaction = import("./wallet-account-read-only-solana-gasless.js").SolanaTransaction;
export type SolanaGaslessWalletConfig = import("./wallet-account-read-only-solana-gasless.js").SolanaGaslessWalletConfig;
export type SolanaGaslessWalletPaymasterConfigOverrides = import("./wallet-account-read-only-solana-gasless.js").SolanaGaslessWalletPaymasterConfigOverrides;
export type ISignerSolana = import("@tetherto/wdk-wallet-solana/signers").ISignerSolana;
export type ValueError = import("@tetherto/wdk-wallet").ValueError;
export type SignerOptions = {
    /**
     * - If true, wipes the signer given at construction on calls to the 'dispose' method.
     */
    shouldWipeSignerOnDisposal?: boolean;
};
import { DisposalError, MaximumFeeExceededError, ProviderRequiredError } from '@tetherto/wdk-wallet';
import WalletAccountReadOnlySolanaGasless from './wallet-account-read-only-solana-gasless.js';
