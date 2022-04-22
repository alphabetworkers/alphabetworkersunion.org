import {
  ItemPublicTokenExchangeRequest,
  ItemPublicTokenExchangeResponse,
  ProcessorStripeBankAccountTokenCreateRequest,
  ProcessorStripeBankAccountTokenCreateResponse,
} from 'plaid';

// TODO consolidate with the code in ../../plaid-token-worker
/**
 * Because plaid-node does not work without the Node runtime, we must
 * re-implement API calls directly to the Plaid RESTful API.  This project
 * still depends on plaid-node for its type declarations.
 */
export class PlaidClient {
  private readonly headers: { [key: string]: string };

  /**
   * Instantiate a client instance.  No overhead in destroying or creating, it
   * only stores an API key.
   */
  constructor(clientId: string, secret: string) {
    this.headers = Object.freeze({
      'PLAID-CLIENT-ID': clientId,
      'PLAID-SECRET': secret,
      'Content-Type': 'application/json',
    });
  }

  /**
   * Sends a call to create a customer object.
   *
   * @link https://stripe.com/docs/api/customers/create?lang=node
   */
  itemPublicTokenExchange(
    public_token: string,
  ): Promise<ItemPublicTokenExchangeResponse> {
    return fetch(`${PLAID_ORIGIN}/item/public_token/exchange`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        public_token,
      } as ItemPublicTokenExchangeRequest),
    }).then(throwError<ItemPublicTokenExchangeResponse>());
  }

  /**
   * Sends a call to create a customer object.
   *
   * @link https://stripe.com/docs/api/customers/create?lang=node
   */
  processorStripeBankAccountTokenCreate(
    access_token: string,
    account_id: string,
  ): Promise<ProcessorStripeBankAccountTokenCreateResponse> {
    return fetch(`${PLAID_ORIGIN}/processor/stripe/bank_account_token/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        access_token,
        account_id,
      } as ProcessorStripeBankAccountTokenCreateRequest),
    }).then(throwError<ProcessorStripeBankAccountTokenCreateResponse>());
  }
}

function throwError<T>(): (response: Response) => Promise<T> {
  return async (response: Response) => {
    if (response.ok) {
      return response.json() as Promise<T>;
    } else {
      return Promise.reject(await response.json());
    }
  };
}

/**
 * Create a new re-usable instance.
 */
export const plaidClient = new PlaidClient(PLAID_CLIENT_ID, PLAID_SECRET);
