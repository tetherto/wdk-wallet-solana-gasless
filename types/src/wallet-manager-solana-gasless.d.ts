export default class WalletManagerSolanaGasless extends WalletManager {
    /**
     * Creates a new wallet manager for the gasless solana.
     *
     * @param {string | Uint8Array} seed - The wallet's [BIP-39](https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki) seed phrase.
     * @param {SolanaGaslessWalletConfig} [config] - The configuration object.
     */
    constructor(seed: string | Uint8Array, config?: SolanaGaslessWalletConfig);
    /**
     * The solana gasless wallet configuration.
     *
     * @protected
     * @type {SolanaGaslessWalletConfig}
     */
    protected _config: SolanaGaslessWalletConfig;
    /**
     * Returns the wallet account at a specific index (see [SLIP-0010](https://slips.readthedocs.io/en/latest/slip-0010/)).
     *
     * @example
     * // Returns the account with derivation path m/44'/501'/index'/0'
     * const account = await wallet.getAccount(1);
     * @param {number} [index] - The index of the account to get (default: 0).
     * @returns {Promise<WalletAccountSolanaGasless>} The account.
     */
    getAccount(index?: number): Promise<WalletAccountSolanaGasless>;
    /**
     * Returns the wallet account at a specific SLIP-0010 derivation path.
     *
     * @example
     * // Returns the account with derivation path m/44'/501'/0'/0'/1'
     * const account = await wallet.getAccountByPath("0'/0'/1'");
     * @param {string} path - The derivation path (e.g. "0'/0'/0'").
     * @returns {Promise<WalletAccountSolanaGasless>} The account.
     */
    getAccountByPath(path: string): Promise<WalletAccountSolanaGasless>;
}
export type SolanaGaslessWalletConfig = import("./wallet-account-solana-gasless.js").SolanaGaslessWalletConfig;
import WalletManager from '@tetherto/wdk-wallet';
import WalletAccountSolanaGasless from './wallet-account-solana-gasless.js';
