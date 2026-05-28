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
const TEST_PAYMASTER_ADDRESS = 'HmWPZeFgxZAJQYgwh5ipYwjbVTHtjEHB3dnJ5xcQBHX9'
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

      wallet.dispose()
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
})
