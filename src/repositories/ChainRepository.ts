import TXRepository from '../modules/TXRepository';
import AzkalRepository from '../repositories/AzkalRepository';
import XaverRepository from '../repositories/XaverRepository';
import XGameRepository from '../repositories/XGameRepository';
import InitializeAPI from '../modules/InitializeAPI';
import PolkadotUtility from '../modules/PolkadotUtility';
import { cryptoWaitReady } from '@polkadot/util-crypto';
import { Keyring } from '@polkadot/api';
import { 
  ITransferTokenRequestBody,
  ISubmitExtrinsicRequestBody,
  ITransferAllTokenRequestBody
} from '../schemas/ChainSchemas';
import abi from '../smartcontracts/xode/transfer_controller.json';
import axios from 'axios';

export default class ChainRepository {
  ownerSeed = process.env.ASTROCHIBBI_SEED as string;
  xonPrice = '10';
  xonImage = 'https://bafkreia5hy2nh46tarcpqybz37mey3lkhoyyxw4qecs7bxw22d4nftz4nm.ipfs.w3s.link/';
  abi = require("./../smartcontracts/astrochibbi/astro_nft.json");

  static async getSmartContractRepo() {
    console.log('getSmartContractRepo function was called');
    try {
      const smartcontract: string = process.env.ASTROCHIBBI_ADDRESS as string;
      return { smartcontract };
    } catch (error: any) {
      return Error(error || 'getSmartContractRepo error occurred.');
    }
  }

  static async getABIRepo() {
    console.log('getSmartContractRepo function was called');
    try {
      const instance = new ChainRepository();
      const abi: JSON = instance.abi;
      return { abi };
    } catch (error: any) {
      return Error(error || 'getSmartContractRepo error occurred.');
    }
  }

  static async getTokensRepo(api: any, wallet_address: string) {
    console.log('getSmartContractRepo function was called');
    const instance = new ChainRepository();
    // var api: any;
    try {
      // await cryptoWaitReady();
      // api = await InitializeAPI.apiInitialization();
      // if (api instanceof Error) {
      //   return api;
      // }
      const balance = await api.derive.balances.all(wallet_address);
      const available = balance.availableBalance;
      const chainDecimals = api.registry.chainDecimals[0];
      const tokens = api.registry.chainTokens;
      const token_name = 'Xode';
      const free = PolkadotUtility.balanceFormatter(
        chainDecimals,
        tokens,
        available
      );
      return {
        balance: free,
        symbol: tokens[0],
        name: token_name,
        price: instance.xonPrice,
        image: instance.xonImage,
      }
    } catch (error: any) {
      return Error(error || 'getSmartContractRepo error occurred.');
    } 
    // finally {
    //   if (!(api instanceof Error)) {
    //     await api.disconnect();
    //   }
    // }
  }

  static async getTokenMetadataRepo() {
    console.log('getTokenMetadataRepo function was called');
    const instance = new ChainRepository();
    var api: any;
    try {
      await cryptoWaitReady();
      api = await InitializeAPI.apiInitialization();
      if (api instanceof Error) {
        return api;
      }
      const properties = await api.rpc.system.properties();
      return {
        name: 'Xode Native Token',
        symbol: properties.toHuman().tokenSymbol[0],
        decimals: properties.toHuman().tokenDecimals[0],
        image: instance.xonImage,
        price: instance.xonPrice,
      }
    } catch (error: any) {
      return Error(error || 'getTokenMetadataRepo error occurred.');
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  }

  static async tokenTransferRepo(data: ITransferTokenRequestBody) {
    console.log('tokenTransferRepo function was called');
    var api: any;
    try {
      await cryptoWaitReady();
      api = await InitializeAPI.apiInitialization();
      if (api instanceof Error) {
        return api;
      }
      const chainDecimals = api.registry.chainDecimals[0];
      const value = parseInt(data.value) * 10 ** chainDecimals;
      const result = await TXRepository.constructChainExtrinsicTransaction(
        api,
        'balances',
        'transfer',
        [
          data.target, 
          value
        ]
      );
      // const { partialFee, weight } = await result.paymentInfo('5FJ9VWpubQXeiLKGcVmo3zD627UAJCiW6bupSUATeyNXTH1m');
      // const finalFee = (parseFloat(partialFee.toHuman()) / 1000).toFixed(4);
      // console.log(finalFee);
      // console.log(weight.toHuman());
      return { hash: result.toHex() };
    } catch (error: any) {
      console.log('tokenTransferRepo: ' + error);
      return Error(error);
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  }

  static async tokenTransferAllRepo(data: ITransferAllTokenRequestBody) {
    console.log('tokenTransferAllRepo function was called');
    var api: any;
    try {
      await cryptoWaitReady();
      api = await InitializeAPI.apiInitialization();
      if (api instanceof Error) {
        return api;
      }
      const result = await TXRepository.constructChainExtrinsicTransaction(
        api,
        'balances',
        'transferAll',
        [
          data.target, 
          true
        ]
      );
      return { hash: result.toHex() };
    } catch (error: any) {
      console.log('tokenTransferAllRepo: ' + error);
      return Error(error);
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  }

  static submitExtrinsicRepo = async (data: ISubmitExtrinsicRequestBody) => {
    console.log('submitExtrinsicRepo function was called');
    var api: any;
    try {
      api = await InitializeAPI.apiInitialization();
      const executeExtrinsic = api.tx(data.extrinsic);
      const result = await TXRepository.executeExtrinsic(
        api,
        executeExtrinsic,
        data.extrinsic
      );
      return result;
    } catch (error: any) {
      console.log('submitExtrinsicRepo: ', error);
      return Error(error);
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  };

  static async airdropXONRepo(data: any) {
    console.log('airdropXONRepo function was called');
    const instance = new ChainRepository();
    var api: any;
    try {
      await cryptoWaitReady();
      api = await InitializeAPI.apiInitialization();
      if (api instanceof Error) {
        return api;
      }
      const contractAddress = process.env.TRANSFER_ADDRESS as string;
      console.log(contractAddress);
      const contract = await TXRepository.getContract(api, abi, contractAddress);
      if (contract === undefined) { 
        return Error('Contract undefined');
      }
      const chainDecimals = api.registry.chainDecimals[0];
      const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 });
      const owner = keyring.addFromUri(instance.ownerSeed);
      const value = 2 * 10 ** chainDecimals;
      let nonce = await api.rpc.system.accountNextIndex(owner.address);
      let index = 0;
      while (index < data.length) {
        const batch = data.slice(index, index + 1);
        for (const address of batch) {
          console.log(`Index: ${index} - `, address);
          const tx =  contract.tx['transferToken'](
            {
              storageDepositLimit: null,
              gasLimit: api?.registry.createType('WeightV2', {
                refTime: 300000000000,
                proofSize: 500000,
              }),
            },
            address,
            value
          );
          await tx.signAndSend(owner, { nonce });
        }
        index += 1;
        const newNonce = await api.rpc.system.accountNextIndex(owner.address);
        if (newNonce.gt(nonce)) {
          nonce = newNonce;
        }
      }
      return;
    } catch (error: any) {
      return Error(error || 'airdropXONRepo error occurred.');
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  }

  static async getTotalSupplyRepo() {
    console.log('getTotalSupplyRepo function was called');
    var api: any;
    try {
      await cryptoWaitReady();
      api = await InitializeAPI.apiInitialization();
      if (api instanceof Error) {
        return api;
      }
      const [balance, chainDecimals, token] = await Promise.all([
        api.query.balances.totalIssuance(),
        api.registry.chainDecimals[0],
        api.registry.chainTokens,
      ]);
      const parsedBalance = PolkadotUtility.balanceFormatter(
        chainDecimals,
        token,
        balance
      );
      return { totalSupply: parsedBalance }
    } catch (error: any) {
      return Error(error || 'getTotalSupplyRepo error occurred.');
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  }

  static async getCirculatingSupplyRepo() {
    console.log('getTotalSupplyRepo function was called');
    var api: any;
    const mainnet_accounts = [
      '5HafQavv6qpUABpVR6csSXeywLqdNMqAMUbYZ7jkGVLYpzgW',
      '5Eppkh8cv4jEMVLK9JX4k6D7m5hFJY2x8xNfuF8bHMJ4CTHp',
      '5CoUJqrmuWfw5C4kdVff3QZrXQXfFqygdRb24PrQWPW2cP1W',
      '5HTTw2HsmHRgE2Qbv8X8wPVmCib6SkJ71PNPJtDnvaoVYNhq',
      '5CnmnG5hzGBRUrrfWPUNki96oVAQJ8LvcUXANm1BEaCTuj95',
      '5HMmQv1FhRqysgegzRp6ehBNgDbiLTidF8kJnZQyF1jz1ezn',
      '5Dqs2Bid5UuWefFQautKxX2jAYfAgrzAPbwTKU6u5z4MeDB2'
    ];
    const testnet_accounts = [
      '5HDvEs87C2JNVGkRrW8M68hUmtjZ4kNkWhUjYPxysrnAfcKa', 
      '5D7Jtfmsx4exkDFVDRpub5iBvbBVyqAAW54E7UybMxH91yBe'
    ];
    try {
      await cryptoWaitReady();
      api = await InitializeAPI.apiInitialization();
      if (api instanceof Error) {
        return api;
      }
      const isMainnet = process.env.WS_PROVIDER_ENDPOINT === process.env.MAINNET_WS_PROVIDER_ENDPOINT;
      const accounts = isMainnet
        ? mainnet_accounts
        : testnet_accounts;
      const [accountBalances, totalSupply, chainDecimals, token] = await Promise.all([
        Promise.all(accounts.map(account => api.query.system.account(account))),
        api.query.balances.totalIssuance(),
        api.registry.chainDecimals[0],
        api.registry.chainTokens[0],
      ]);
      const formattedBalances = await Promise.all(
        accountBalances.map(account => PolkadotUtility.balanceFormatter(chainDecimals, token, account.data.free))
      );
      const formattedTotalSupply = PolkadotUtility.balanceFormatter(chainDecimals, token, totalSupply);
      const errorBalance = formattedBalances.find(balance => balance instanceof Error);
      if (errorBalance || formattedTotalSupply instanceof Error) {
        return errorBalance || formattedTotalSupply;
      }
      const balances = formattedBalances.map(balance => parseFloat(balance as string));
      const totalSupplyNumber = parseFloat(formattedTotalSupply as string);
      const circulatingSupply = balances.reduce((acc, balance) => acc - balance, totalSupplyNumber);
      return { circulatingSupply: circulatingSupply.toFixed(4) };
    } catch (error: any) {
      return Error(error || 'getTotalSupplyRepo error occurred.');
    } finally {
      if (!(api instanceof Error)) {
        await api.disconnect();
      }
    }
  }

  static getTokenPricesRepo = async (data: any) => {
    console.log('getTokenPricesRepo function was called');
    const xon_instance = new ChainRepository();
    const azk_instance = new AzkalRepository();
    const xav_instance = new XaverRepository();
    const xgm_instance = new XGameRepository();
    try {
      const xonPrice: number = parseFloat(xon_instance.xonPrice);
      const azkPrice: number = parseFloat(azk_instance.azkPrice);
      const xavPrice: number = parseFloat(xav_instance.xavPrice);
      const xgmPrice: number = parseFloat(xgm_instance.xgmPrice);
      const prices = {
        XON: xonPrice * data.rate,
        AZK: azkPrice * data.rate,
        XAV: xavPrice * data.rate,
        XGM: xgmPrice * data.rate
      };
      return { currency: data.currency, prices };
    } catch (error: any) {
      console.log('getTokenPricesRepo: ', error);
      return Error(error);
    }
  };

  static forexRepo = async (currency: string) => {
    console.log('forexRepo function was called');
    try {
      const response = await axios.get('https://open.er-api.com/v6/latest/USD');
      const uppercaseCurrency = currency.toUpperCase();
      if (!(uppercaseCurrency in response.data.rates)) {
        return Error('Currency not found!');
      }
      const currencyRate = response.data.rates[uppercaseCurrency];
      return { currency: uppercaseCurrency, rate: currencyRate};
    } catch (error: any) {
      console.log('forexRepo: ', error);
      return Error(error);
    }
  }
}
