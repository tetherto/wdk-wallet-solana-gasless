export default class WalletAccountSolanaGasless extends WalletAccountReadOnlySolanaGasless implements IWalletAccount<FullySignedTransaction> {
    /**
     * Creates a new solana gasless wallet account.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {string} path - The SLIP-0010 derivation path (e.g. "0'/0'/0'").
     * @param {SolanaGaslessWalletConfig} config - The configuration object.
     */
    constructor(seed: string | Uint8Array, path: string, config: SolanaGaslessWalletConfig);
    /**
     * The solana gasless wallet account configuration.
     *
     * @protected
     * @type {SolanaGaslessWalletConfig}
     */
    protected _config: SolanaGaslessWalletConfig;
    /** @private */
    private _ownerAccount;
    /** @private */
    private _signer;
    /**
     * The derivation path's index of this account.
     *
     * @type {number}
     */
    get index(): number;
    /**
     * The derivation path of this account.
     *
     * @type {string}
     */
    get path(): string;
    /**
     * The account's key pair.
     *
     * Returns the raw key pair bytes in standard Solana format.
     * - privateKey: 32-byte Ed25519 secret key (Uint8Array)
     * - publicKey: 32-byte Ed25519 public key (Uint8Array)
     *
     * @type {KeyPair}
     */
    get keyPair(): KeyPair;
    /**
     * The address of this account.
     *
     * @returns {Promise<string>} The address.
     */
    getAddress(): Promise<string>;
    /**
     * Signs a message.
     *
     * @param {string} message - The message to sign.
     * @returns {Promise<string>} The message's signature.
     */
    sign(message: string): Promise<string>;
    /**
     * Signs a transaction.
     *
     * @param {SolanaTransaction} tx - The transaction to sign.
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<FullySignedTransaction>} The signed transaction.
     * @throws {Error} If the transaction's cost exceeds the maximum transaction fee option.
     */
    signTransaction(tx: SolanaTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<FullySignedTransaction>;
    /**
     * Sends a transaction.
     *
     * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction. Either an unsigned transaction or an already-signed transaction (as returned by `signTransaction`).
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<TransactionResult>} The transaction's result.
     * @throws {Error} If the transaction's cost exceeds the maximum transaction fee option.
     * @note When an already-signed transaction is passed, it is broadcast directly to the network. The paymaster has already co-signed it at sign time, so it is not contacted again, and the fee/max-fee check (already enforced during `signTransaction`) is skipped. The returned `fee` is `0n`, as the gasless payment amount is locked into the signed message and cannot be recomputed.
     */
    sendTransaction(tx: SolanaTransaction | FullySignedTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<TransactionResult>;
    /**
     * Quotes the costs of a send transaction operation.
     *
     * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction. Either an unsigned transaction or an already-signed transaction (as returned by `signTransaction`).
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<Omit<TransactionResult, 'hash'>>} The transaction's quotes.
     * @note When an already-signed transaction is passed, the gasless payment amount is locked into the signed message and cannot be recomputed, so the returned `fee` is `0n` (matching `sendTransaction`).
     */
    quoteSendTransaction(tx: SolanaTransaction | FullySignedTransaction, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<Omit<TransactionResult, "hash">>;
    /**
     * Transfers a token to another address. Native SOL transfers are not supported here.
     *
     * @param {TransferOptions} options - The transfer's options.
     * @param {SolanaGaslessWalletPaymasterConfigOverrides} [config] - If set, overrides the given configuration options.
     * @returns {Promise<TransferResult>} The transfer's result.
     * @throws {Error} If the transfer's cost exceeds the maximum transfer fee option.
     */
    transfer({ token, recipient, amount }: TransferOptions, config?: SolanaGaslessWalletPaymasterConfigOverrides): Promise<TransferResult>;
    /**
     * Returns a read-only copy of the account.
     *
     * @returns {Promise<WalletAccountReadOnlySolanaGasless>} The read-only account.
     */
    toReadOnlyAccount(): Promise<WalletAccountReadOnlySolanaGasless>;
    /**
     * Disposes the wallet account, erasing the private key from the memory.
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
     */
    private _broadcastSignedTransaction;
    /**
     * Determines whether a value is an already-signed transaction (as returned by `signTransaction`)
     * rather than an unsigned {@link SolanaTransaction}.
     *
     * @protected
     * @param {SolanaTransaction | FullySignedTransaction} tx - The transaction to inspect.
     * @returns {boolean} True if the value is a signed transaction.
     */
    protected _isSignedTransaction(tx: SolanaTransaction | FullySignedTransaction): boolean;
    /** @private */
    private _getSigner;
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
import WalletAccountReadOnlySolanaGasless from './wallet-account-read-only-solana-gasless.js';
