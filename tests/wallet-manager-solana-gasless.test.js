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

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'

import WalletManagerSolanaGasless, { WalletAccountSolanaGasless } from '../index.js'

const TEST_SEED_PHRASE =
  'test walk nut penalty hip pave soap entry language right filter choice'
const TEST_RPC_URL = 'https://mock-url.com'
const TEST_PAYMASTER_URL = 'https://mock-paymaster.com'
const TEST_PAYMASTER_ADDRESS = 'CyTi1U4TQt8MddAt54cez6rTJKZWvfjXNLvd3dVeveBz'
const TEST_PAYMASTER_TOKEN = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'

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
        .rejects.toThrow("Invalid child index: -1'")
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
        .rejects.toThrow("Invalid child index: a'")
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
    
    test('should keep the child accounts\' public key accessible after disposal', async () => {
      const tempAccount = await wallet.getAccount(98)

      wallet.dispose()

      expect(Buffer.from(tempAccount.keyPair.publicKey).toString('hex')).toBe(
        '5a84997ab4e543bd48a39f6aab2db7c0816f958167a56d4a9da0fd7b58517324'
      )
    })
  })
})
