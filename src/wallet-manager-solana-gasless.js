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

import WalletManager, { DisposalError, InvalidSignerError, ValueError } from '@tetherto/wdk-wallet'

import { WalletAccountReadOnlySolana } from '@tetherto/wdk-wallet-solana'

import { SeedSignerSolana } from '@tetherto/wdk-wallet-solana/signers'

import WalletAccountSolanaGasless from './wallet-account-solana-gasless.js'
import WalletAccountReadOnlySolanaGasless from './wallet-account-read-only-solana-gasless.js'

/** @typedef {ReturnType<typeof import('@solana/rpc').createSolanaRpc>} SolanaRpc */
/** @typedef {import('@solana/kora').KoraClient} KoraClient */

/** @typedef {import('@tetherto/wdk-wallet').NoSuchElementError} NoSuchElementError */

/** @typedef {import('@tetherto/wdk-wallet-solana/signers').ISignerSolana} ISignerSolana */
/** @typedef {import('@tetherto/wdk-wallet-solana/signers').PrivateKeySignerSolana} PrivateKeySignerSolana */

/** @typedef {import('./wallet-account-solana-gasless.js').SolanaGaslessWalletConfig} SolanaGaslessWalletConfig */

/** @extends {WalletManager<ISignerSolana>} */
export default class WalletManagerSolanaGasless extends WalletManager {
  /**
   * Creates a new wallet manager for the gasless solana from a default signer.
   *
   * The default signer must be derivable; non-derivable signers (e.g. private-key signers) can only be
   * registered by name via {@link addSigner}. The signer is kept as given, and the manager never disposes
   * a signer you supplied.
   *
   * @overload
   * @param {ISignerSolana} signer - The default root signer.
   * @param {SolanaGaslessWalletConfig} config - The configuration object.
   * @throws {InvalidSignerError} If the given signer doesn't support account derivation.
   */

  /**
   * Creates a new wallet manager for the gasless solana from a seed.
   *
   * The manager wraps the seed in a seed signer at "m/44'/501'", owns it, and wipes it on {@link dispose}.
   * The seed itself is not kept.
   *
   * @see https://github.com/bitcoin/bips/blob/master/bip-0039.mediawiki
   * @overload
   * @param {string | Uint8Array} seed - A BIP-39 mnemonic seed phrase, or a raw BIP-32 master seed (16-64 bytes).
   * @param {SolanaGaslessWalletConfig} config - The configuration object.
   * @throws {ValueError} If the seed is not a valid seed or BIP-39 seed phrase.
   */
  constructor (seedOrSigner, config = {}) {
    const isSeed = typeof seedOrSigner === 'string' || seedOrSigner instanceof Uint8Array

    super(isSeed ? new SeedSignerSolana(seedOrSigner) : seedOrSigner, config)

    /**
     * If true, disposes the default signer on calls to the 'dispose' method.
     *
     * @protected
     * @type {boolean}
     */
    this._shouldWipeDefaultSignerOnDisposal = isSeed

    /**
     * The solana gasless wallet configuration.
     *
     * @protected
     * @type {SolanaGaslessWalletConfig}
     */
    this._config = config

    /**
     * The solana rpc client. Shared with every account this manager creates, so two accounts
     * never open two clients for the same endpoint.
     *
     * @protected
     * @type {SolanaRpc | undefined}
     */
    this._rpc = WalletAccountReadOnlySolana._buildRpc(config)

    /**
     * The paymaster client. Shared with every account this manager creates.
     *
     * @protected
     * @type {KoraClient}
     */
    this._paymaster = WalletAccountReadOnlySolanaGasless._buildPaymaster(config)
  }

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

  async getAccount (indexOrSignerName = 0, options = {}) {
    if (typeof indexOrSignerName === 'string') {
      const signerName = indexOrSignerName

      if (this.disposed) {
        throw new DisposalError('The wallet manager has been disposed.')
      }

      if (!this._accounts[signerName]) {
        const signer = this.getSigner(signerName)

        if (signer.disposed) {
          throw new DisposalError('The given signer has been disposed.')
        }

        this._accounts[signerName] = new WalletAccountSolanaGasless(signer, this._accountConfig())
      }

      return this._accounts[signerName]
    }

    if (!Number.isInteger(indexOrSignerName) || indexOrSignerName < 0 || indexOrSignerName >= 2 ** 31) {
      throw new ValueError('The index must be an integer between 0 and 2^31 - 1.')
    }

    return await this.getAccountByPath(`${indexOrSignerName}'/0'`, options)
  }

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
  async getAccountByPath (path, options = {}) {
    if (this.disposed) {
      throw new DisposalError('The wallet manager has been disposed.')
    }

    const { signerName } = options

    const key = signerName === undefined ? path : `${signerName}:${path}`

    if (!this._accounts[key]) {
      const rootSigner = this.getSigner(signerName)

      if (!rootSigner.isDerivable) {
        throw new InvalidSignerError('The signer does not support account derivation.')
      }

      const signer = await rootSigner.derive(path)

      // A concurrent call may have cached this account while we were deriving.
      if (this._accounts[key]) {
        signer.dispose()
      } else {
        try {
          this._accounts[key] = new WalletAccountSolanaGasless(signer, { ...this._accountConfig(), shouldWipeSignerOnDisposal: true })
        } catch (error) {
          signer.dispose()

          throw error
        }
      }
    }

    return this._accounts[key]
  }

  /**
   * Disposes the wallet accounts, erasing their private keys from memory, and the default signer if the manager
   * created it from a seed. Signers you supplied, as the default or via {@link addSigner}, are never disposed.
   * Calling it again has no effect.
   */
  dispose () {
    if (this.disposed) {
      return
    }

    if (this._shouldWipeDefaultSignerOnDisposal) {
      this._defaultSigner.dispose()
    }

    super.dispose()
  }

  /**
   * Builds the account config, injecting the manager's shared clients so accounts reuse them
   * instead of opening their own.
   *
   * @private
   * @returns {SolanaGaslessWalletConfig} The account configuration.
   */
  _accountConfig () {
    return { ...this._config, provider: this._rpc, paymasterUrl: this._paymaster }
  }
}
