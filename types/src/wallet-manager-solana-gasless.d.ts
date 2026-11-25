export default class WalletManagerSolanaGasless extends WalletManager<ISignerSolana> {
    /**
     * Creates a new wallet manager for the gasless solana from a default signer.
     *
     * The default signer must be derivable; non-derivable signers (e.g. private-key signers) can only be
     * registered by name via {@link addSigner}. The signer is kept as given, and the manager never disposes
     * a signer you supplied.
     *
     * @overload
     * @param {ISignerSolana} signer - The default root signer.
     * @param {SolanaGaslessWalletConfig} [config] - The configuration object.
     * @throws {InvalidSignerError} If the given signer doesn't support account derivation.
     */
    constructor(signer: ISignerSolana, config?: SolanaGaslessWalletConfig);
    /**
     * Creates a new wallet manager for the gasless solana from a seed.
     *
     * The manager wraps the seed in a seed signer at "m/44'/501'", owns it, and wipes it on {@link dispose}.
     * The seed itself is not kept.
     *
     * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
     * @overload
     * @param {string | Uint8Array} seed - A BIP-39 mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
     * @param {SolanaGaslessWalletConfig} [config] - The configuration object.
     * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
     */
    constructor(seed: string | Uint8Array, config?: SolanaGaslessWalletConfig);
    /**
     * If true, disposes the default signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    protected _shouldWipeDefaultSignerOnDisposal: boolean;
    /**
     * The solana gasless wallet configuration.
     *
     * @protected
     * @type {SolanaGaslessWalletConfig}
     */
    protected _config: SolanaGaslessWalletConfig;
    /**
     * The solana rpc client. Shared with every account this manager creates, so two accounts
     * never open two clients for the same endpoint.
     *
     * @protected
     * @type {SolanaRpc | undefined}
     */
    protected _rpc: SolanaRpc | undefined;
    /**
     * The paymaster client. Shared with every account this manager creates.
     *
     * @protected
     * @type {KoraClient}
     */
    protected _paymaster: KoraClient;
    /**
     * Returns the wallet account at a specific index (see SLIP-0010).
     *
     * Derivation is relative to the signer's own path, so use a signer at the coin-type node (m/44'/501'),
     * which is where the seed signer sits by default.
     *
     * @see https://slips.readthedocs.io/en/latest/slip-0010/
     * @example
     * // Returns the account with derivation path m/44'/501'/index'/0'
     * const account = await wallet.getAccount(1);
     * @overload
     * @param {number} [index] - The index of the account to get (default: 0).
     * @param {Object} [options] - Account options.
     * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
     * @returns {Promise<WalletAccountSolanaGasless>} The account.
     * @throws {ValueError} If the index is not valid.
     * @throws {NoSuchElementError} If a signer name is given but no signer exists with that name.
     * @throws {InvalidSignerError} If the signer doesn't support account derivation.
     * @throws {DisposalError} If the wallet manager or the given signer has been disposed.
     */
    getAccount(index?: number, options?: {
        signerName?: string;
    }): Promise<WalletAccountSolanaGasless>;
    /**
     * Returns the wallet account backed by a registered signer, without further derivation.
     * Use it for non-derivable signers, such as {@link PrivateKeySignerSolana}. The signer is left
     * untouched when the account is disposed.
     *
     * @example
     * wallet.addSigner('treasury', new PrivateKeySignerSolana(privateKey))
     * const account = await wallet.getAccount('treasury');
     * @overload
     * @param {string} signerName - The signer name registered via {@link addSigner}.
     * @returns {Promise<WalletAccountSolanaGasless>} The account.
     * @throws {NoSuchElementError} If no signer exists with the given name.
     * @throws {DisposalError} If the wallet manager or the given signer has been disposed.
     */
    getAccount(signerName: string): Promise<WalletAccountSolanaGasless>;
    /**
     * Returns the wallet account at a specific SLIP-0010 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/501'/0'/0'/1'
     * const account = await wallet.getAccountByPath("0'/0'/1'");
     * @param {string} path - The derivation path (e.g. "0'/0'/0'").
     * @param {Object} [options] - Account options.
     * @param {string} [options.signerName] - The name of a signer registered via `addSigner`. Omit to use the default signer.
     * @returns {Promise<WalletAccountSolanaGasless>} The account.
     * @throws {ValueError} If the path is not valid.
     * @throws {NoSuchElementError} If a signer name is given but no signer exists with that name.
     * @throws {InvalidSignerError} If the signer doesn't support account derivation.
     * @throws {DisposalError} If the wallet manager or the given signer has been disposed.
     */
    getAccountByPath(path: string, options?: {
        signerName?: string;
    }): Promise<WalletAccountSolanaGasless>;
    /**
     * Builds the account config, injecting the manager's shared clients so accounts reuse them
     * instead of opening their own.
     *
     * @private
     * @returns {SolanaGaslessWalletConfig} The account configuration.
     */
    private _accountConfig;
}
export type SolanaRpc = ReturnType<typeof import("@solana/rpc").createSolanaRpc>;
export type NoSuchElementError = import("@tetherto/wdk-wallet").NoSuchElementError;
export type ISignerSolana = import("@tetherto/wdk-wallet-solana/signers").ISignerSolana;
export type PrivateKeySignerSolana = import("@tetherto/wdk-wallet-solana/signers").PrivateKeySignerSolana;
export type SolanaGaslessWalletConfig = import("./wallet-account-solana-gasless.js").SolanaGaslessWalletConfig;
import WalletManager from '@tetherto/wdk-wallet';
import { DisposalError, InvalidSignerError, ValueError } from '@tetherto/wdk-wallet';
import WalletAccountSolanaGasless from './wallet-account-solana-gasless.js';
import { KoraClient } from '@solana/kora';
