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

import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

import WalletManagerSolanaGasless, {
  DisposalError,
  InvalidSignerError,
  NoSuchElementError,
  ValueError,
  WalletAccountSolanaGasless
} from '../index.js'

import { PrivateKeySignerSolana, SeedSignerSolana } from '../src/signers/index.js'

const TEST_SEED_PHRASE =
  'test walk nut penalty hip pave soap entry language right filter choice'
const TEST_RPC_URL = 'https://mock-url.com'
const TEST_PAYMASTER_URL = 'https://mock-paymaster.com'
const TEST_PAYMASTER_ADDRESS = 'CyTi1U4TQt8MddAt54cez6rTJKZWvfjXNLvd3dVeveBz'
const TEST_PAYMASTER_TOKEN = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

const TEST_PRIVATE_KEY = '384c61286f76b885903cb4f9562d6dccaf37a6732600cebd675733203426a4fc'

const TEST_PRIVATE_KEY_ADDRESS = 'H3BsGWDPR1QL88RhLeWYRvzKH7GUGbe9oarC7LBKeedo'

const TEST_CONFIG = {
  provider: TEST_RPC_URL,
  commitment: 'confirmed',
  paymasterUrl: TEST_PAYMASTER_URL,
  paymasterAddress: TEST_PAYMASTER_ADDRESS,
  paymasterToken: {
    address: TEST_PAYMASTER_TOKEN
  }
}

describe('WalletManagerSolanaGasless', () => {
  let wallet

  beforeEach(() => {
    wallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, TEST_CONFIG)
  })

  afterEach(() => {
    wallet.dispose()
  })

  describe('getAccount', () => {
    test('should return the account at index 0 by default', async () => {
      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)

      expect(account.path).toBe("m/44'/501'/0'/0'")
    })

    test('should return the account at the given index', async () => {
      const account = await wallet.getAccount(3)

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)

      expect(account.path).toBe("m/44'/501'/3'/0'")
    })

    test('should return an account when configured with failover providers', async () => {
      const wallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, {
        ...TEST_CONFIG,
        provider: [
          'https://mock-url-1.com',
          'https://mock-url-2.com'
        ]
      })

      const account = await wallet.getAccount()

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)
    })

    test('should throw if the index is a negative number', async () => {
      await expect(wallet.getAccount(-1))
        .rejects.toThrow('The index must be an integer between 0 and 2^31 - 1.')
    })

    test('should throw if the index is not an integer', async () => {
      await expect(wallet.getAccount(1.5))
        .rejects.toThrow(new ValueError('The index must be an integer between 0 and 2^31 - 1.'))
    })

    test('should throw if the index is 2^31 or higher', async () => {
      await expect(wallet.getAccount(2 ** 31))
        .rejects.toThrow('The index must be an integer between 0 and 2^31 - 1.')
    })

    test('should return the same account to concurrent calls and dispose the extra derived signer', async () => {
      const derive = jest.spyOn(wallet.getSigner(), 'derive')

      const [account1, account2] = await Promise.all([wallet.getAccount(7), wallet.getAccount(7)])

      const [first, second] = await Promise.all(derive.mock.results.map(({ value }) => value))

      expect(account1).toBe(account2)
      expect(derive).toHaveBeenCalledTimes(2)
      expect(first.disposed).toBe(false)
      expect(second.disposed).toBe(true)
    })

    test('should derive the account at the given index below a registered signer', async () => {
      const signer = new SeedSignerSolana(TEST_SEED_PHRASE, "m/44'/501'/1'")

      wallet.addSigner('savings', signer)

      const account = await wallet.getAccount(2, { signerName: 'savings' })

      expect(account.path).toBe("m/44'/501'/1'/2'/0'")

      signer.dispose()
    })

    test('should return the account of a registered signer', async () => {
      const signer = new PrivateKeySignerSolana(TEST_PRIVATE_KEY)

      wallet.addSigner('treasury', signer)

      const account = await wallet.getAccount('treasury')

      expect(account.path).toBeNull()
      expect(await account.getAddress()).toBe(TEST_PRIVATE_KEY_ADDRESS)

      signer.dispose()
    })

    test('should return the same account on repeated calls with a signer name', async () => {
      const signer = new PrivateKeySignerSolana(TEST_PRIVATE_KEY)

      wallet.addSigner('treasury', signer)

      const account = await wallet.getAccount('treasury')

      expect(await wallet.getAccount('treasury')).toBe(account)

      signer.dispose()
    })

    test('should throw if no signer exists with the given name', async () => {
      await expect(wallet.getAccount('unknown'))
        .rejects.toThrow(new NoSuchElementError('No signer found with name "unknown".'))
    })

    test('should throw if the registered signer has been disposed', async () => {
      const signer = new PrivateKeySignerSolana(TEST_PRIVATE_KEY)

      wallet.addSigner('treasury', signer)

      signer.dispose()

      await expect(wallet.getAccount('treasury'))
        .rejects.toThrow(new DisposalError('The given signer has been disposed.'))
    })

    test('should throw if the wallet manager has been disposed', async () => {
      wallet.dispose()

      await expect(wallet.getAccount('treasury'))
        .rejects.toThrow(new DisposalError('The wallet manager has been disposed.'))
    })
  })

  describe('getAccountByPath', () => {
    test('should return the account with the given path', async () => {
      const account = await wallet.getAccountByPath("1'/2'/3'")

      expect(account).toBeInstanceOf(WalletAccountSolanaGasless)

      expect(account.path).toBe("m/44'/501'/1'/2'/3'")
    })

    test('should throw if the path is invalid', async () => {
      await expect(wallet.getAccountByPath("a'/b'/c'"))
        .rejects.toThrow('The derivation path is not a valid BIP-32 path.')
    })

    test('should derive the account below a registered signer', async () => {
      const signer = new SeedSignerSolana(TEST_SEED_PHRASE, "m/44'/501'/1'")

      wallet.addSigner('savings', signer)

      const account = await wallet.getAccountByPath("2'/3'", { signerName: 'savings' })

      expect(account.path).toBe("m/44'/501'/1'/2'/3'")
      expect(await account.getAddress()).toBe('8amX85XP5NgSMZZySgHWCkg5jvakRz8bX2UL8tPZBpXD')
      expect(account).not.toBe(await wallet.getAccountByPath("2'/3'"))

      signer.dispose()
    })

    test('should throw if the signer does not support account derivation', async () => {
      const signer = new PrivateKeySignerSolana(TEST_PRIVATE_KEY)

      wallet.addSigner('treasury', signer)

      await expect(wallet.getAccountByPath("0'/0'", { signerName: 'treasury' }))
        .rejects.toThrow(new InvalidSignerError('The signer does not support account derivation.'))

      signer.dispose()
    })

    test('should dispose the derived signer if the account cannot be created', async () => {
      const { paymasterAddress, ...config } = TEST_CONFIG

      const invalidWallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, config)

      const derive = jest.spyOn(invalidWallet.getSigner(), 'derive')

      await expect(invalidWallet.getAccountByPath("0'/0'"))
        .rejects.toThrow('Missing required paymaster token configuration fields: paymasterAddress.')

      const signer = await derive.mock.results[0].value

      expect(signer.disposed).toBe(true)

      invalidWallet.dispose()
    })

    test('should throw if the wallet manager has been disposed', async () => {
      wallet.dispose()

      await expect(wallet.getAccountByPath("0'/0'"))
        .rejects.toThrow(new DisposalError('The wallet manager has been disposed.'))
    })
  })

  describe('constructor', () => {
    test('should derive accounts from a derivable default signer', async () => {
      const signer = new SeedSignerSolana(TEST_SEED_PHRASE)

      const signerWallet = new WalletManagerSolanaGasless(signer, TEST_CONFIG)

      const account = await signerWallet.getAccount(0)

      expect(account.path).toBe("m/44'/501'/0'/0'")
      expect(await account.getAddress()).toBe('3uXqWpwgqKVdiHAwF6Vmu4G4vdQzpR66xjPkz1G7zMKE')

      signerWallet.dispose()
      signer.dispose()
    })

    test('should not expose a seed when created from a signer', () => {
      const signer = new SeedSignerSolana(TEST_SEED_PHRASE)

      const signerWallet = new WalletManagerSolanaGasless(signer, TEST_CONFIG)

      expect(signerWallet.seed).toBeUndefined()

      signerWallet.dispose()
      signer.dispose()
    })

    test('should throw if the default signer does not support account derivation', () => {
      const signer = new PrivateKeySignerSolana(TEST_PRIVATE_KEY)

      expect(() => new WalletManagerSolanaGasless(signer, TEST_CONFIG))
        .toThrow(new InvalidSignerError('The default signer must be derivable. Non-derivable signers (e.g. private-key signers) can only be registered by name via addSigner.'))

      signer.dispose()
    })

    test('should throw if the paymaster url list is empty', () => {
      expect(() => new WalletManagerSolanaGasless(TEST_SEED_PHRASE, { ...TEST_CONFIG, paymasterUrl: [] }))
        .toThrow("The 'paymasterUrl' option cannot be set to an empty list.")
    })

    test('should throw if the seed phrase is invalid', () => {
      expect(() => new WalletManagerSolanaGasless('invalid seed phrase', TEST_CONFIG))
        .toThrow(new ValueError('The seed phrase is invalid.'))
    })
  })

  describe('dispose', () => {
    let wallet

    beforeEach(() => {
      wallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, TEST_CONFIG)
    })

    afterEach(() => {
      wallet.dispose()
    })

    test('should clear the accounts cache after the wallet manager is disposed', async () => {
      await wallet.getAccount(99)
      await wallet.getAccount(100)

      expect(Object.values(wallet._accounts)).toHaveLength(2)

      wallet.dispose()

      expect(Object.values(wallet._accounts)).toHaveLength(0)
    })

    test('should clear the child accounts\' private key after the wallet manager is disposed', async () => {
      const tempAccount = await wallet.getAccount(99)

      expect(Buffer.from(tempAccount.keyPair.privateKey).toString('hex')).toBe(
          '384c61286f76b885903cb4f9562d6dccaf37a6732600cebd675733203426a4fc'
        )

      wallet.dispose()

      expect(tempAccount.keyPair.privateKey).toBeNull()
    })
    
    test('should not dispose a default signer the caller supplied', () => {
      const signer = new SeedSignerSolana(TEST_SEED_PHRASE)

      const signerWallet = new WalletManagerSolanaGasless(signer, TEST_CONFIG)

      signerWallet.dispose()

      expect(signer.disposed).toBe(false)

      signer.dispose()
    })

    test('should dispose the default signer if the wallet manager created it from a seed', () => {
      const signer = wallet.getSigner()

      wallet.dispose()

      expect(signer.disposed).toBe(true)
    })

    test('should not dispose a registered signer, nor its account\'s key', async () => {
      const signer = new PrivateKeySignerSolana(TEST_PRIVATE_KEY)

      wallet.addSigner('treasury', signer)

      const account = await wallet.getAccount('treasury')

      wallet.dispose()

      expect(signer.disposed).toBe(false)
      expect(Buffer.from(account.keyPair.privateKey).toString('hex')).toBe(TEST_PRIVATE_KEY)

      signer.dispose()
    })

    test('should keep the child accounts\' public key accessible after disposal', async () => {
      const tempAccount = await wallet.getAccount(98)

      wallet.dispose()

      expect(Buffer.from(tempAccount.keyPair.publicKey).toString('hex')).toBe(
        '5a84997ab4e543bd48a39f6aab2db7c0816f958167a56d4a9da0fd7b58517324'
      )
    })
  })
})
