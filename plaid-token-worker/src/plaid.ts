import {LinkTokenCreateRequest, LinkTokenCreateResponse} from 'plaid';

/**
 * Because plaid-node does not work without the Node runtime, we must
 * re-implement API calls directly to the Plaid RESTful API.  This project
 * still depends on plaid-node for its type declarations.
 */
export class PlaidClient {
  private readonly headers: {[key: string]: string};

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
  linkTokenCreate(): Promise<LinkTokenCreateResponse> {
    return fetch(`${PLAID_ORIGIN}/link/token/create`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({
        'client_name': 'Alphabet Workers Union',
        'language': 'en',
        'country_codes': ['US', 'CA'],
        'user': {
          'client_user_id': String(Math.random()),
        },
        'products': ['auth'],
        'account_filters': {
          'depository': {
            'account_subtypes': ['checking'],
          },
        },
      } as LinkTokenCreateRequest),
    }).then(throwError<LinkTokenCreateResponse>());
  }
}

function throwError<T>(): (response: Response) => Promise<T> {
  return async (response: Response) => {
    if (response.ok) {
      return response.json() as Promise<T>;
    } else {
      return Promise.reject((await response.json()).error);
    }
  };
}

/**
 * Create a new re-usable instance.
 */
export const plaidClient = new PlaidClient(PLAID_CLIENT_ID, PLAID_SECRET);
