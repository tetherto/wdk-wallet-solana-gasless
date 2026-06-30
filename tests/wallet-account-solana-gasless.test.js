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

import { describe, test, expect, beforeEach, afterEach, jest } from '@jest/globals'

import { getBase64EncodedWireTransaction, getTransactionDecoder, isFullySignedTransaction } from '@solana/transactions'
import { AccountRole, getBase64Encoder } from '@solana/kit'

const TEST_SEED_PHRASE =
  'test walk nut penalty hip pave soap entry language right filter choice'
const TEST_RPC_URL = 'https://dummyurl.com'
const TEST_PAYMASTER_URL = 'https://dummypaymaster.com'
const TEST_PAYMASTER_ADDRESS = 'HmWPZeFgxZAJQYgwh5ipYwjbVTHtjEHB3dnJ5xcQBHX9'
const TEST_PAYMASTER_TOKEN = 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB'
const TEST_PAYMASTER_TOKEN_OVERRIDE = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
const TEST_ACCOUNT_ADDRESS = '3uXqWpwgqKVdiHAwF6Vmu4G4vdQzpR66xjPkz1G7zMKE'
const DUMMY_SIGNATURE = 'dummy-signature-123'

const TEST_CONFIG = {
  provider: TEST_RPC_URL,
  commitment: 'processed',
  paymasterUrl: TEST_PAYMASTER_URL,
  paymasterAddress: TEST_PAYMASTER_ADDRESS,
  paymasterToken: {
    address: TEST_PAYMASTER_TOKEN
  }
}

function createMockRpc () {
  return {
    getAccountInfo: jest.fn(),
    getLatestBlockhash: jest.fn().mockReturnValue({
      send: jest.fn().mockResolvedValue({
        value: {
          blockhash: '6JbYxigC1rn83PMHZait5FHHpC3YqUMacnVJWFwfoayQ',
          lastValidBlockHeight: 1000000n
        }
      })
    })
  }
}

function createMockRpcWithRecipientAta () {
  const rpc = createMockRpc()
  rpc.getAccountInfo.mockReturnValue({
    send: jest.fn().mockResolvedValue({
      value: {
        owner: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
        lamports: 2039280n,
        data: [Buffer.alloc(165).toString('base64'), 'base64']
      }
    })
  })
  return rpc
}

function createMockPaymaster (accountAddress = TEST_ACCOUNT_ADDRESS) {
  return {
    getPaymentInstruction: jest.fn().mockResolvedValue({
      payment_amount: '5000',
      payment_instruction: {
        programAddress: '11111111111111111111111111111111',
        accounts: [
          {
            address: accountAddress,
            role: AccountRole.READONLY_SIGNER
          }
        ],
        data: new Uint8Array()
      }
    }),
    signTransaction: jest.fn().mockImplementation(async ({ transaction }) => {
      const decoded = getTransactionDecoder().decode(getBase64Encoder().encode(transaction))
      const fakePaymasterSignature = new Uint8Array(64).fill(1)
      const fullySigned = {
        ...decoded,
        signatures: { ...decoded.signatures, [TEST_PAYMASTER_ADDRESS]: fakePaymasterSignature }
      }
      return {
        signed_transaction: getBase64EncodedWireTransaction(fullySigned),
        signer_pubkey: TEST_PAYMASTER_ADDRESS
      }
    }),
    signAndSendTransaction: jest.fn().mockResolvedValue({
      signature: DUMMY_SIGNATURE
    }),
    getBlockhash: jest.fn().mockResolvedValue({
      blockhash: 'HhqkdqemrKDK5Wd4oiCtzfpBWfdGS79YhLtzAck5Nz7T'
    })
  }
}

let mockRpc
let mockPaymaster

const actualSolanaRpc = await import('@solana/rpc')
const actualKora = await import('@solana/kora')

jest.unstable_mockModule('@solana/rpc', () => ({
  ...actualSolanaRpc,
  createSolanaRpc: jest.fn(() => mockRpc)
}))

jest.unstable_mockModule('@solana/kora', () => ({
  ...actualKora,
  KoraClient: jest.fn(() => mockPaymaster)
}))

const {
  default: WalletManagerSolanaGasless,
  WalletAccountReadOnlySolanaGasless,
  WalletAccountSolanaGasless
} = await import('../index.js')

describe('WalletAccountSolanaGasless', () => {
  let wallet
  let account

  beforeEach(async () => {
    mockRpc = createMockRpc()
    mockPaymaster = createMockPaymaster()
    wallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, TEST_CONFIG)
    account = await wallet.getAccount(0)
  })

  afterEach(() => {
    account.dispose()
    account = undefined
    wallet.dispose()
    wallet = undefined
  })

  describe('constructor', () => {
      test('should throw if invalid words in seed phrase', () => {
        expect(() => {
          new WalletAccountSolanaGasless(
            'invalid word that does not exist test test test test test test test',
            "0'/0'/0'",
            TEST_CONFIG
          )
        }).toThrow('The seed phrase is invalid')
      })

      test('should accept valid BIP-39 seed phrase as string', () => {
        const account = new WalletAccountSolanaGasless(
          TEST_SEED_PHRASE,
          "0'/0'/0'",
          TEST_CONFIG
        )

        expect(account).toBeInstanceOf(WalletAccountSolanaGasless)
      })
  })

  describe('address', () => {
      test('should return a valid Solana address', async () => {
        const address = await account.getAddress()
        expect(address).toBe(TEST_ACCOUNT_ADDRESS)
      })

      test('should return different addresses for different account indices', async () => {
        const account0 = await wallet.getAccount(0)
        const account1 = await wallet.getAccount(1)
        const account2 = await wallet.getAccount(2)

        expect(await account0.getAddress()).toBe(TEST_ACCOUNT_ADDRESS)
        expect(await account1.getAddress()).toBe(
          'CfGcujEkPVDx7yGyn1PUjxn2e353MXbLk8ixzwuJUktK'
        )
        expect(await account2.getAddress()).toBe(
          'Grwp8oDHgAD8PVSS51pWGCY5QRM3hqiH8QcbPRAEUABq'
        )
      })

      test('should return different addresses for different derivation paths', async () => {
        const accountPath1 = await wallet.getAccountByPath("0'/0'/0'")
        const accountPath2 = await wallet.getAccountByPath("0'/0'/1'")
        const accountPath3 = await wallet.getAccountByPath("1'/0'/0'")

        expect(await accountPath1.getAddress()).toBe(
          'DPGHHHMaayXkaThUJCUnUAJCdgc9sxNh1UEGa6vJximM'
        )
        expect(await accountPath2.getAddress()).toBe(
          'jbhYXhWfRPqPvaKqaWCJEgBdZMquFxUvjWaWLEH3YCz'
        )
        expect(await accountPath3.getAddress()).toBe(
          '57hwCai22XueypvXcXKotkuAQYj2eukFcY5ymWB7Arvg'
        )
      })
    })

  describe('keyPair', () => {
      test('should have consistent keyPair', () => {
        const keyPair = account.keyPair
        expect(Buffer.from(keyPair.publicKey).toString('hex')).toBe(
          '2b2c715c2cf24db57e95a44df34cb424de2460e86c4f6ebe7ba62b574830de19'
        )
        expect(Buffer.from(keyPair.privateKey).toString('hex')).toBe(
          'de705bcaa34a2ea50c0b7e6e584006f2458652fa9d6e20994ac146852490c76f'
        )
      })

      test('should have different key pairs for different accounts', async () => {
        const account0 = await wallet.getAccount(0)
        const account1 = await wallet.getAccount(1)

        expect(Buffer.from(account0.keyPair.publicKey).toString('hex')).toBe(
          '2b2c715c2cf24db57e95a44df34cb424de2460e86c4f6ebe7ba62b574830de19'
        )
        expect(Buffer.from(account1.keyPair.publicKey).toString('hex')).toBe(
          'ad3e499bc158a797574c53bcca546939f0de16242b85ed39a848092c4d9d5274'
        )
      })
    })

  describe('path', () => {
      test('should follow SLIP-0010 Solana derivation path format', () => {
        expect(account.path).toBe("m/44'/501'/0'/0'")
      })

      test('should have correct path for account index 5', async () => {
        const account5 = await wallet.getAccount(5)
        expect(account5.path).toBe("m/44'/501'/5'/0'")
      })

      test('should have correct path for custom derivation', async () => {
        const customAccount = await wallet.getAccountByPath("1'/2'/3'")
        expect(customAccount.path).toBe("m/44'/501'/1'/2'/3'")
      })
    })

  describe('index', () => {
      test('should return correct index for account 0', async () => {
        const account0 = await wallet.getAccount(0)
        expect(account0.index).toBe(0)
      })

      test('should return correct index for account 999', async () => {
        const account999 = await wallet.getAccount(999)
        expect(account999.index).toBe(999)
      })
    })

  describe('dispose', () => {
      test('should clear private key from memory', async () => {
        const tempWallet = new WalletManagerSolanaGasless(
          TEST_SEED_PHRASE,
          TEST_CONFIG
        )
        const tempAccount = await tempWallet.getAccount(99)

        expect(Buffer.from(tempAccount.keyPair.privateKey).toString('hex')).toBe(
          '384c61286f76b885903cb4f9562d6dccaf37a6732600cebd675733203426a4fc'
        )

        tempAccount.dispose()

        expect(tempAccount.keyPair.privateKey).toBeNull()
      })

      test('should dispose all accounts when wallet manager is disposed', async () => {
        const tempWallet = new WalletManagerSolanaGasless(
          TEST_SEED_PHRASE,
          TEST_CONFIG
        )

        const account0 = await tempWallet.getAccount(0)
        const account1 = await tempWallet.getAccount(1)

        expect(Buffer.from(account0.keyPair.privateKey).toString('hex')).toBe(
          'de705bcaa34a2ea50c0b7e6e584006f2458652fa9d6e20994ac146852490c76f'
        )
        expect(Buffer.from(account1.keyPair.privateKey).toString('hex')).toBe(
          '4642fc818f6525a2c5ae784cc98f44d639492c21271c5f7f0ac30ee95a3357bb'
        )

        tempWallet.dispose()

        expect(account0.keyPair.privateKey).toBeNull()
        expect(account1.keyPair.privateKey).toBeNull()
      })

      test('should keep public key accessible after disposal', async () => {
        const tempWallet = new WalletManagerSolanaGasless(
          TEST_SEED_PHRASE,
          TEST_CONFIG
        )
        const tempAccount = await tempWallet.getAccount(98)

        tempAccount.dispose()

        expect(Buffer.from(tempAccount.keyPair.publicKey).toString('hex')).toBe(
          '5a84997ab4e543bd48a39f6aab2db7c0816f958167a56d4a9da0fd7b58517324'
        )
      })
    })

  describe('sign', () => {
      test('should produce consistent signature for a message', async () => {
        const signature = await account.sign('Test message')

        expect(signature).toBe(
          '90d1d5dc7430f3efa9fa037ba2179458fad9a8bfdf42ba74fff4581ce9e0ac2fba1562483b072e9eee709ef8d59448b379d9a61e634b37a3c13858bab7754f08'
        )
      })

      test('should produce different signatures for different messages', async () => {
        const signature1 = await account.sign('Message 1')
        const signature2 = await account.sign('Message 2')

        expect(signature1).toBe(
          '06f06d64f9a5338595410825aee9ae6b04bd0069fcd36afca765f75b3c4ebb42c2ee35a62961b8edc3afc1d10b50dcdb558d9904707326236598d0b7c0385204'
        )
        expect(signature2).toBe(
          'c4d4f624a1d7ba1992cdfd6ce5a8a3e7e2ac46ad342ef8b00b8c10f73633223a882ff8230b009691d57291aa6224a648371f9208c447ed695be47ec395a6ad0d'
        )
      })

      test('should throw error after account disposal', async () => {
        const tempWallet = new WalletManagerSolanaGasless(
          TEST_SEED_PHRASE,
          TEST_CONFIG
        )
        const tempAccount = await tempWallet.getAccount(95)

        expect(await tempAccount.sign('test message')).toBe(
          'd80d466cfa30f1a382bbd9a2d24036f34f9960affb5668e73c70013811013540fe20b372949b6bf3b016a166b9373a4088fdcda51a5e74feafa382a14ce3f009'
        )

        tempAccount.dispose()

        await expect(
          tempAccount.sign('test message')
        ).rejects.toThrow('The wallet account has been disposed.')
      })
  })

  describe('sendTransaction', () => {
    test('should throw if account is disposed', async () => {
        const tempAccount = new WalletAccountSolanaGasless(
          TEST_SEED_PHRASE,
          "0'/0'",
          TEST_CONFIG
        )
        tempAccount.dispose()

        await expect(
          tempAccount.sendTransaction({
            to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
            value: 1000n
          })
        ).rejects.toThrow('Cannot read properties of null (reading \'byteLength\')')
    })

    test('should successfully send a transaction', async () => {
        const result = await account.sendTransaction({
          to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
          value: 1000000n
        })

        expect(result).toEqual({
          hash: DUMMY_SIGNATURE,
          fee: 5000n
        })
        expect(mockPaymaster.signAndSendTransaction).toHaveBeenCalled()
    })

    test('should successfully send a transaction with number value', async () => {
        await account.sendTransaction({
          to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
          value: 1000000n
        })

        await account.sendTransaction({
          to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
          value: 1000000
        })

        expect(mockPaymaster.signAndSendTransaction).toHaveBeenCalledTimes(2)
    })

    test('should successfully send a transaction message', async () => {
        const result = await account.sendTransaction({
          version: 0,
          instructions: [],
          lifetimeConstraint: {
            blockhash: '6JbYxigC1rn83PMHZait5FHHpC3YqUMacnVJWFwfoayQ',
            lastValidBlockHeight: 1000000n
          }
        })

        expect(result).toEqual({
          hash: DUMMY_SIGNATURE,
          fee: 5000n
        })
        expect(mockPaymaster.signAndSendTransaction).toHaveBeenCalled()
    })

    test('should successfully send a transaction message with a fee payer', async () => {
        const result = await account.sendTransaction({
          version: 0,
          instructions: [],
          feePayer: TEST_PAYMASTER_ADDRESS,
          lifetimeConstraint: {
            blockhash: '6JbYxigC1rn83PMHZait5FHHpC3YqUMacnVJWFwfoayQ',
            lastValidBlockHeight: 1000000n
          }
        })

        expect(result).toEqual({
          hash: DUMMY_SIGNATURE,
          fee: 5000n
        })
    })

    test('should use paymaster token override when sending a transaction', async () => {
        await account.sendTransaction({
          to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
          value: 1000000n
        }, {
          paymasterToken: {
            address: TEST_PAYMASTER_TOKEN_OVERRIDE
          }
        })

        expect(mockPaymaster.getPaymentInstruction).toHaveBeenCalledWith(
          expect.objectContaining({
            fee_token: TEST_PAYMASTER_TOKEN_OVERRIDE
          })
        )
    })

    test('should throw if transaction fee exceeds the transaction max fee configuration', async () => {
      const limitedAccount = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        { ...TEST_CONFIG, transactionMaxFee: 0n }
      )

      await expect(
        limitedAccount.sendTransaction({
          to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
          value: 1000000n
        })
      ).rejects.toThrow('Exceeded maximum fee cost for transaction operation.')
    })

    test('should allow a fee exactly equal to transactionMaxFee', async () => {
      const limitedAccount = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        { ...TEST_CONFIG, transactionMaxFee: 5000n }
      )

      const result = await limitedAccount.sendTransaction({
        to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
        value: 1000000n
      })

      expect(result).toHaveProperty('hash')
    })

    test('should allow a fee below transactionMaxFee', async () => {
      const limitedAccount = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        { ...TEST_CONFIG, transactionMaxFee: 5001n }
      )

      const result = await limitedAccount.sendTransaction({
        to: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ',
        value: 1000000n
      })

      expect(result).toHaveProperty('hash')
    })

    test('should throw if fee payer does not match paymaster', async () => {
        await expect(
          account.sendTransaction({
            version: 0,
            instructions: [],
            feePayer: {
              address: '4r33xEKAD2cNMrC9NyJy8nb4XmruUKebZ6LZZm65PVUZ'
            }
          })
        ).rejects.toThrow('does not match paymaster address')
    })
  })

  describe('signTransaction', () => {
    test('should sign a transaction without broadcasting, then broadcast it manually via the rpc', async () => {
      mockRpc.sendTransaction = jest.fn().mockReturnValue({
        send: jest.fn().mockResolvedValue('manual-broadcast-sig-xyz')
      })

      const TRANSACTION = {
        to: '9CXtfmGEtfjmtPKnq2QZcRzCiMzE9T8NQfRicJZetvk2',
        value: 1000000n
      }

      const signedTx = await account.signTransaction(TRANSACTION)

      expect(isFullySignedTransaction(signedTx)).toBe(true)

      const encoded = getBase64EncodedWireTransaction(signedTx)
      const hash = await mockRpc.sendTransaction(encoded, { encoding: 'base64' }).send()

      expect(hash).toBe('manual-broadcast-sig-xyz')
    })

    test('should throw if transaction fee exceeds the transaction max fee configuration', async () => {
      const limitedAccount = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        { ...TEST_CONFIG, transactionMaxFee: 0n }
      )

      await expect(
        limitedAccount.signTransaction({
          to: '9CXtfmGEtfjmtPKnq2QZcRzCiMzE9T8NQfRicJZetvk2',
          value: 1000000n
        })
      ).rejects.toThrow('Exceeded maximum fee cost for transaction operation.')
    })

    test('should allow a fee exactly equal to transactionMaxFee', async () => {
      const limitedAccount = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        { ...TEST_CONFIG, transactionMaxFee: 5000n }
      )

      const signedTx = await limitedAccount.signTransaction({
        to: '9CXtfmGEtfjmtPKnq2QZcRzCiMzE9T8NQfRicJZetvk2',
        value: 1000000n
      })

      expect(signedTx).toBeTruthy()
    })

    test('should allow a fee below transactionMaxFee', async () => {
      const limitedAccount = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        { ...TEST_CONFIG, transactionMaxFee: 5001n }
      )

      const signedTx = await limitedAccount.signTransaction({
        to: '9CXtfmGEtfjmtPKnq2QZcRzCiMzE9T8NQfRicJZetvk2',
        value: 1000000n
      })

      expect(signedTx).toBeTruthy()
    })

    test('should throw when signing a transaction after disposal', async () => {
      const account = new WalletAccountSolanaGasless(
        TEST_SEED_PHRASE,
        "0'/0'",
        TEST_CONFIG
      )

      account.dispose()

      await expect(
        account.signTransaction({
        to: '9CXtfmGEtfjmtPKnq2QZcRzCiMzE9T8NQfRicJZetvk2',
        value: 1000000n
        })
      ).rejects.toThrow('Cannot read properties of null (reading \'byteLength\')')
    })
  })

  describe('transfer', () => {
    let wallet
    let account

    beforeEach(async () => {
      mockRpc = createMockRpcWithRecipientAta()
      mockPaymaster = createMockPaymaster()
      wallet = new WalletManagerSolanaGasless(TEST_SEED_PHRASE, TEST_CONFIG)
      account = await wallet.getAccount(0)
    })

    afterEach(() => {
      account.dispose()
      account = undefined
      wallet.dispose()
      wallet = undefined
    })

    test('should throw if account is disposed', async () => {
        const tempAccount = new WalletAccountSolanaGasless(
          TEST_SEED_PHRASE,
          "0'/0'",
          TEST_CONFIG
        )
        tempAccount.dispose()

        await expect(
          tempAccount.transfer({
            token: TEST_PAYMASTER_TOKEN,
            recipient: TEST_PAYMASTER_ADDRESS,
            amount: 1000n
          })
        ).rejects.toThrow('Cannot read properties of null (reading \'byteLength\')')
    })

    test('should throw if amount exceeds u64 maximum', async () => {
        await expect(
          account.transfer({
            token: TEST_PAYMASTER_TOKEN,
            recipient: TEST_PAYMASTER_ADDRESS,
            amount: 0xffffffffffffffffn + 1n
          })
        ).rejects.toThrow('Amount exceeds u64 maximum value')
    })

    test('should throw if number amount exceeds safe integer', async () => {
        await expect(
          account.transfer({
            token: TEST_PAYMASTER_TOKEN,
            recipient: TEST_PAYMASTER_ADDRESS,
            amount: Number.MAX_SAFE_INTEGER + 1
          })
        ).rejects.toThrow('Amount exceeds safe integer range')
    })

    test('should throw if transfer fee exceeds the transfer max fee configuration', async () => {
        const limitedAccount = new WalletAccountSolanaGasless(
          TEST_SEED_PHRASE,
          "0'/0'",
          {
            ...TEST_CONFIG,
            transferMaxFee: 1000n
          }
        )

        await expect(
          limitedAccount.transfer({
            token: TEST_PAYMASTER_TOKEN,
            recipient: TEST_PAYMASTER_ADDRESS,
            amount: 1000n
          })
        ).rejects.toThrow('Exceeded maximum fee cost')
    })

    test('should throw if transfer fee exceeds the transfer max fee override', async () => {
        await expect(
          account.transfer({
            token: TEST_PAYMASTER_TOKEN,
            recipient: TEST_PAYMASTER_ADDRESS,
            amount: 1000n
          }, {
            transferMaxFee: 1000n
          })
        ).rejects.toThrow('Exceeded maximum fee cost')
    })

    test('should successfully transfer tokens', async () => {
        const result = await account.transfer({
          token: TEST_PAYMASTER_TOKEN,
          recipient: TEST_PAYMASTER_ADDRESS,
          amount: 1000000n
        })
        expect(result).toEqual({
          hash: DUMMY_SIGNATURE,
          fee: 5000n
        })
        expect(mockPaymaster.signAndSendTransaction).toHaveBeenCalled()
    })
  })

  describe('toReadOnlyAccount', () => {
    test('should create a read-only account from full account', async () => {
      const readOnlyAccount = await account.toReadOnlyAccount()

      expect(readOnlyAccount).toBeInstanceOf(WalletAccountReadOnlySolanaGasless)
      expect(readOnlyAccount).not.toBeInstanceOf(WalletAccountSolanaGasless)
    })
  })
})
