require('dotenv').config()
require('@nomiclabs/hardhat-ganache')
require('@nomiclabs/hardhat-ethers')
require('@nomiclabs/hardhat-truffle5')
require('@nomiclabs/hardhat-etherscan')
require('@openzeppelin/hardhat-upgrades')
require('hardhat-gas-reporter')
require("solidity-coverage");
require('hardhat-docgen');
const { random, template } = require('lodash')
const GAS_PRICE_DEFAULT = 10000000000
const GAS_MULTIPLIER_DEFAULT = 1
const chains = require('./chains.json')
const scanners = require('./scanners.json')
// const INFURA_API_KEY = process.env.INFURA_API_KEY

const keys = {
  INFURA_API_KEY: process.env.INFURA_API_KEY
}

const getScanUrl = () => {
  const chainId = scanners.current
  const result = scanners.url[chainId]
  return result
}
const getKey = () => {
  const chainId = scanners.current
  const result = scanners.apikey[chainId]
  return result
}
// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task('accounts', 'Prints the list of accounts', async () => {
  const accounts = await ethers.getSigners()

  for (const account of accounts) {
    console.log(await account.getAddress())
  }
})

const getChainInfo = (chainId) =>
  chains.find((chain) => chain.chainId === parseInt(chainId, 10)) || {}

const concatKeys = (url, keys) => {
  const temp = template(url)
  return temp(keys)
}
const getUrl = (chainId) => {
  const finded = getChainInfo(chainId)
  const rpcNodes = finded.rpc

  const randomIndex = random(0, rpcNodes.length - 1)
  return concatKeys(rpcNodes[randomIndex], keys)
}

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  defaultNetwork: 'hardhat',
  networks: {
    rinkeby: {
      url: getUrl(4),
      chainId: 4,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    goerli: {
      url: getUrl(5),
      chainId: 5,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    mainnet: {
      url: getUrl(1),
      chainId: 1,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    bsctestnet: {
      url: getUrl(97),
      chainId: 97,
      gas: 4251144,
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    bscmainnet: {
      url: getUrl(56),
      chainId: 56,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    polygon: {
      url: getUrl(137),
      chainId: 137,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    polygonmumbai: {
      url: getUrl(80001),
      chainId: 80001,
      gas: 'auto',
      gasPrice: GAS_PRICE_DEFAULT,
      gasMultiplier: GAS_MULTIPLIER_DEFAULT,
      accounts: { mnemonic: process.env.MNEMONIC }
    },
    // hardhat: {
    //   chainId: 31337,
    //   forking: {
    //     url: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
    //   },
    //   accounts: { mnemonic: process.env.MNEMONIC }
    // }
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    compilers: [
      {
        version: '0.5.16',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.8.2',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.8.0',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.8.9',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: '0.6.6',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  gasReporter: {
    currency: 'USD',
    gasPrice: 21,
    enabled: true
  },
  etherscan: {
    // url: process.env.ETHERSCAN_URL,
    // apiKey: process.env.ETHERSCAN_KEY

    url: getScanUrl(),
    apiKey: getKey()
  },
  docgen: {
    path: './docs',
    clear: false,
    runOnCompile: true,
    only: [
        'MonstropolyDeployer', 
        'IMonstropolyDeployer', 
        'MonstropolyFactory', 
        'IMonstropolyFactory',
        'MonstropolyERC20', 
        'IMonstropolyERC20',
        'MonstropolyGLD',
        'MonstropolyData', 
        'IMonstropolyData',
        'MonstropolyGenScience', 
        'IMonstropolyGenScience',
        'MonstropolyTrainer', 
        'IMonstropolyTrainer',
        'MonstropolyUpgrader', 
        'IMonstropolyUpgrader',
        'MonstropolyMagicBoxesShop', 
        'IMonstropolyMagicBoxesShop',
        'AccessControlProxyPausable', 
        'IAccessControlProxyPausable',
        'UUPSUpgradeableByRole',
        'UUPSNotUpgradeable'
    ]
  }
}
