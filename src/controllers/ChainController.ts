import { FastifyReply, FastifyRequest } from 'fastify';
import { 
    ITokensRequestParams,
    ITransferTokenRequestBody,
    ISubmitExtrinsicRequestBody,
    IGetTokenPriceRequestParams,
} from '../schemas/ChainSchemas';
import WebsocketHeader from '../modules/WebsocketHeader';
import ChainRepository from '../repositories/ChainRepository';
import AstroRepository from '../repositories/AstroRepository';
import AzkalRepository from '../repositories/AzkalRepository';
import XGameRepository from '../repositories/XGameRepository';
import XaverRepository from '../repositories/XaverRepository';

// Get smart contract
export const getSmartContractController = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        WebsocketHeader.handleWebsocket(request);
        const result = await ChainRepository.getSmartContractRepo();
        if (result instanceof Error) {
            throw result;
        }
        return await reply.send(result);
    } catch (error: any) {
        reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const getABIController = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        const result = await ChainRepository.getABIRepo();
        if (result instanceof Error) {
            throw result;
        }
        return await reply.send(result);
    } catch (error: any) {
        reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const getTokensController = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
      WebsocketHeader.handleWebsocket(request);
      const requestParams = request.params as ITokensRequestParams;
      let requestQuery: any = request.query;
      if (!requestParams || !requestParams.wallet_address) {
          return reply.badRequest("Invalid request parameter. Required fields: 'wallet_address'");
      }
      requestQuery.currency = requestQuery.currency === undefined ? 'USD' : requestQuery.currency;
      const [tokenResults, rateResult] = await Promise.all([
          Promise.all([
              ChainRepository.getTokensRepo(requestParams.wallet_address),
              AstroRepository.balanceOfRepo(requestParams.wallet_address),
              AzkalRepository.balanceOfRepo(requestParams.wallet_address),
              XGameRepository.balanceOfRepo(requestParams.wallet_address),
              XaverRepository.balanceOfRepo(requestParams.wallet_address)
          ]),
          ChainRepository.forexRepo(requestQuery.currency)
      ]);
      const validTokenResults = tokenResults.filter(result => !(result instanceof Error));
      if (validTokenResults.length === 0) {
          return reply.internalServerError("All repositories returned errors.");
      }
      if (rateResult instanceof Error) {
          throw rateResult;
      }
      let total = validTokenResults.reduce((acc, token) => {
          if ('balance' in token && typeof token.balance === 'string') {
              return acc + (parseFloat(token.balance) * parseFloat(token.price));
          }
          return acc;
      }, 0);
      return await reply.send({ 
          tokens: validTokenResults, 
          currency: rateResult.currency, 
          rate: (rateResult.rate).toFixed(4), 
          total: (total * rateResult.rate).toFixed(4) 
      });
    } catch (error: any) {
        reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const tokenListController = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        WebsocketHeader.handleWebsocket(request);
        const tokens = await Promise.all([
            ChainRepository.getTokenMetadataRepo(),
            AstroRepository.getContractMetadataRepo(),
            AzkalRepository.getAssetMetadataRepo(),
            XGameRepository.getAssetMetadataRepo(),
            XaverRepository.getAssetMetadataRepo(),
        ])
        if (tokens instanceof Error) {
            throw tokens;
        }
        return reply.send(tokens);
    } catch (error: any) {
        reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const tokenTransferController = async (
    request: FastifyRequest,
    reply: FastifyReply
) => {
    try {
        WebsocketHeader.handleWebsocket(request);
        const requestBody = request.body as ITransferTokenRequestBody;
        console.log(requestBody);
        if (!requestBody || 
            !requestBody.to ||
            requestBody.value == null
        ) {
            return reply.badRequest("Invalid request body. Required fields: 'to', 'value");
        }
        const result = await ChainRepository.tokenTransferRepo(requestBody);
        if (result instanceof Error) {
            throw result;
        }
        return reply.send(result);
    } catch (error: any) {
        reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const submitExtrinsicController = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const requestBody = request.body as ISubmitExtrinsicRequestBody;
    try {
      WebsocketHeader.handleWebsocket(request);
      const result = await ChainRepository.submitExtrinsicRepo(requestBody);
      if (result instanceof Error) {
        throw result;
      }
      return reply.send(result);
    } catch (error) {
      reply.status(500).send('Internal Server Error: ' + error);
    }
};


export const getTotalSupplyController = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      WebsocketHeader.handleWebsocket(request);
      const result = await ChainRepository.getTotalSupplyRepo();
      if (result instanceof Error) {
        throw result;
      }
      return reply.send(result);
    } catch (error: any) {
      reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const getCirculatingSupplyController = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      WebsocketHeader.handleWebsocket(request);
      const result = await ChainRepository.getCirculatingSupplyRepo();
      if (result instanceof Error) {
        throw result;
      }
      return reply.send(result);
    } catch (error: any) {
      reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const getSupplyController = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    try {
      WebsocketHeader.handleWebsocket(request);
      const [totalSupplyResult, circulatingSupplyResult] = await Promise.all([
        ChainRepository.getTotalSupplyRepo(),
        ChainRepository.getCirculatingSupplyRepo(),
      ]);
      if (totalSupplyResult instanceof Error) {
        throw totalSupplyResult;
      }
      if (circulatingSupplyResult instanceof Error) {
        throw circulatingSupplyResult;
      }
      const circulatingSupply = (circulatingSupplyResult as { circulatingSupply: string }).circulatingSupply;
      const totalSupply = (totalSupplyResult as { totalSupply: string }).totalSupply;
      return reply.send({
        circulatingSupply,
        totalSupply,
      });
    } catch (error: any) {
      reply.status(500).send('Internal Server Error: ' + error);
    }
};

export const getTokenPricesController = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  try {
    WebsocketHeader.handleWebsocket(request);
    const requestParams = request.params as IGetTokenPriceRequestParams;
    if (!requestParams || 
      !requestParams.currency
    ) {
        return reply.badRequest("Invalid request body. Required fields: 'currency'");
    }
    const result = await ChainRepository.getTokenPricesRepo(requestParams.currency);
    if (result instanceof Error) {
      throw result;
    }
    return reply.send(result);
  } catch (error: any) {
    reply.status(500).send('Internal Server Error: ' + error);
  }
};