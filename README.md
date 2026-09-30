# @tetherto/wdk-wallet-solana-gasless

[![npm version](https://img.shields.io/npm/v/%40tetherto%2Fwdk-wallet-solana-gasless?style=flat-square)](https://www.npmjs.com/package/@tetherto/wdk-wallet-solana-gasless)
[![npm downloads](https://img.shields.io/npm/dw/%40tetherto%2Fwdk-wallet-solana-gasless?style=flat-square)](https://www.npmjs.com/package/@tetherto/wdk-wallet-solana-gasless)
[![license](https://img.shields.io/npm/l/%40tetherto%2Fwdk-wallet-solana-gasless?style=flat-square)](https://github.com/tetherto/wdk-wallet-solana-gasless/blob/main/LICENSE)

**Note**: This package is currently in beta. Please test thoroughly in development environments before using in production.

A [Solana wallet module](https://docs.wdk.tether.io/sdk/wallet-modules/wallet-solana-gasless/) for gasless operations in WDK (Wallet Development Kit) by Tether. This package provides a clean API for creating, managing, and interacting with Solana accounts using BIP-39 seed phrases and Solana-specific derivation paths, with paymaster support for sponsored transaction fees.

## About WDK

This module is part of the [**WDK (Wallet Development Kit)**](https://docs.wdk.tether.io/) project, which empowers developers to build secure, non-custodial wallets with unified blockchain access, stateless architecture, and complete user control.

For detailed documentation about the complete WDK ecosystem, visit [docs.wdk.tether.io](https://docs.wdk.tether.io).

## Installation

```bash
npm install @tetherto/wdk-wallet-solana-gasless
```

## Quick Start

```javascript
import { WalletAccountSolanaGasless } from '@tetherto/wdk-wallet-solana-gasless'

const seedPhrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'

const account = new WalletAccountSolanaGasless(seedPhrase, "0'/0'", {
  provider: 'https://api.devnet.solana.com',
  commitment: 'confirmed',
  paymasterUrl: 'https://your-kora-paymaster.example',
  paymasterAddress: 'Paymaster111111111111111111111111111111111',
  paymasterToken: {
    address: 'TokenMint111111111111111111111111111111111'
  },
  transferMaxFee: 1000000n
})

const address = await account.getAddress()
console.log('Address:', address)

account.dispose()
```

## Key Capabilities

- **Gasless Solana Transactions**: Send sponsored transactions through a Kora-compatible paymaster
- **SLIP-0010 Derivation Paths**: Standard Solana derivation support (`m/44'/501'`)
- **SPL Token Support**: Query balances, quote fees, and transfer SPL tokens
- **Native SOL Messages**: Build, quote, sign, and send native SOL transfer messages
- **Paymaster Fee Quotes**: Estimate gasless fees in the configured paymaster token
- **Per-Operation Paymaster Overrides**: Quote, transfer, or send with an alternate paymaster token or max fee
- **Message Signing**: Sign messages and verify signatures with Solana accounts
- **Read-Only Accounts**: Monitor any Solana address without a private key
- **Secure Memory Disposal**: Clear private keys from memory when done

## Configuration

```javascript
const config = {
  provider: 'https://api.mainnet-beta.solana.com',
  // rpcUrl is also supported as a deprecated alias for provider.
  commitment: 'confirmed',
  retries: 3,
  paymasterUrl: 'https://your-kora-paymaster.example',
  // Solana program address used as the transaction fee payer.
  paymasterAddress: 'Paymaster111111111111111111111111111111111',
  paymasterToken: {
    address: 'TokenMint111111111111111111111111111111111'
  },
  transferMaxFee: 1000000n
}
```

`provider` and `paymasterUrl` may also be arrays. When arrays are provided, the wallet uses failover behavior and retries requests against the configured providers.

## Examples

### Create an Account

```javascript
import { WalletAccountSolanaGasless } from '@tetherto/wdk-wallet-solana-gasless'

const account = new WalletAccountSolanaGasless(seedPhrase, "0'/0'", config)

console.log(await account.getAddress())
```

### Read-Only Account

```javascript
import { WalletAccountReadOnlySolanaGasless } from '@tetherto/wdk-wallet-solana-gasless'

const readOnlyAccount = new WalletAccountReadOnlySolanaGasless('SolanaAddress...', {
  provider: 'https://api.devnet.solana.com',
  paymasterUrl: 'https://your-kora-paymaster.example',
  paymasterAddress: 'Paymaster111111111111111111111111111111111',
  paymasterToken: {
    address: 'TokenMint111111111111111111111111111111111'
  }
})

const balance = await readOnlyAccount.getBalance()
console.log('SOL balance:', balance)
```

### Check Token Balances

```javascript
const tokenBalance = await account.getTokenBalance('TokenMint111111111111111111111111111111111')
console.log('Token balance:', tokenBalance)

const balances = await account.getTokenBalances([
  'TokenMint111111111111111111111111111111111',
  'OtherMint1111111111111111111111111111111111'
])
console.log('Token balances:', balances)

const paymasterTokenBalance = await account.getPaymasterTokenBalance()
console.log('Paymaster token balance:', paymasterTokenBalance)
```

### Quote a Gasless Transfer

```javascript
const quote = await account.quoteTransfer({
  token: 'TokenMint111111111111111111111111111111111',
  recipient: 'Recipient1111111111111111111111111111111',
  amount: 1000000n
})

console.log('Paymaster fee:', quote.fee)
```

### Override Paymaster Options

```javascript
const override = {
  paymasterToken: {
    address: 'AlternateFeeMint11111111111111111111111111'
  },
  transferMaxFee: 500000n
}

const quote = await account.quoteTransfer({
  token: 'TokenMint111111111111111111111111111111111',
  recipient: 'Recipient1111111111111111111111111111111',
  amount: 1000000n
}, override)

const result = await account.transfer({
  token: 'TokenMint111111111111111111111111111111111',
  recipient: 'Recipient1111111111111111111111111111111',
  amount: 1000000n
}, override)

console.log('Quoted fee:', quote.fee)
console.log('Transaction hash:', result.hash)
```

### Transfer SPL Tokens

```javascript
const result = await account.transfer({
  token: 'TokenMint111111111111111111111111111111111',
  recipient: 'Recipient1111111111111111111111111111111',
  amount: 1000000n
})

console.log('Transaction hash:', result.hash)
console.log('Paymaster fee:', result.fee)
```

### Send a Transaction

```javascript
const result = await account.sendTransaction({
  to: 'Recipient1111111111111111111111111111111',
  value: 10000n
}, {
  paymasterToken: {
    address: 'AlternateFeeMint11111111111111111111111111'
  }
})

console.log('Transaction hash:', result.hash)
console.log('Paymaster fee:', result.fee)
```

### Sign and Verify Messages

```javascript
const message = 'Hello, Solana!'
const signature = await account.sign(message)

const isValid = await account.verify(message, signature)
console.log('Signature valid:', isValid)
```

### Memory Management

```javascript
account.dispose()
```

## Compatibility

- **Solana Mainnet Beta**
- **Solana Testnet**
- **Solana Devnet**
- **Standard Solana RPC Providers** that support account, balance, and blockhash queries
- **Kora-Compatible Paymasters** for payment instruction and sponsored send requests

## Support

For support, please [open an issue](https://github.com/tetherto/wdk-wallet-solana-gasless/issues) on GitHub or reach out via [email](mailto:wallet-info@tether.io).

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
