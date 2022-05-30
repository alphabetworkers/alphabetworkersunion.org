import formurlencoded from 'form-urlencoded';
import Stripe from 'stripe';

const STRIPE_API = 'https://api.stripe.com/v1/';

/**
 * Because stripe-node does not work without the Node runtime, we must
 * re-implement API calls directly to the Stripe RESTful API.  This project
 * still depends on stripe-node for its type declarations.
 */
export class StripeClient {
  private readonly headers: { [key: string]: string };

  /**
   * Instantiate a client instance.  No overhead in destroying or creating, it
   * only stores an API key.
   */
  constructor(key: string) {
    this.headers = Object.freeze({
      Authorization: `Basic ${btoa(key + ':')}`,

      'Content-Type': 'application/x-www-form-urlencoded',
    });
  }

  /**
   * Sends a call to fetch a customer object.
   *
   * @link https://stripe.com/docs/api/customers/create?lang=node
   */
  fetchCustomer(email: string): Promise<Stripe.ApiList<Stripe.Customer>> {
    return fetch(`${STRIPE_API}customers/search?query=email:'${email}'`, {
      method: 'GET',
      headers: this.headers,
    }).then(throwError<Stripe.ApiList<Stripe.Customer>>());
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
export const stripeClient = new StripeClient(STRIPE_KEY);
