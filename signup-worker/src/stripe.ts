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
      'Authorization': `Basic ${btoa(key + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    });
  }

  /**
   * Sends a call to create a customer object.
   *
   * @link https://stripe.com/docs/api/customers/create?lang=node
   */
  createCustomer(params: Stripe.CustomerCreateParams) {
    return fetch(`${STRIPE_API}customers`, {
      method: 'POST',
      headers: this.headers,
      body: formurlencoded(params),
    }).then(throwError<Stripe.Customer>());
  }

  /**
   * Sends a call to create a Subscription object.
   *
   * @link https://stripe.com/docs/api/subscriptions?lang=node
   */
  createSubscription(params: Stripe.SubscriptionCreateParams) {
    return fetch(`${STRIPE_API}subscriptions`, {
      method: 'POST',
      headers: this.headers,
      body: formurlencoded(params),
    }).then(throwError<Stripe.Subscription>());
  }

  /**
 * Sends a call to create a Invoice object.
 *
 * @link https://stripe.com/docs/api/invoices?lang=node
 */
  createInvoice(params: Stripe.InvoiceCreateParams) {
    return fetch(`${STRIPE_API}invoices`, {
      method: 'POST',
      headers: this.headers,
      body: formurlencoded(params),
    }).then(throwError<Stripe.Invoice>());
  }

  /**
* Sends a call to create a InvoiceItem object.
*
* @link https://stripe.com/docs/api/invoiceitems?lang=node
*/
  createInvoiceItem(params: Stripe.InvoiceItemCreateParams) {
    return fetch(`${STRIPE_API}invoices`, {
      method: 'POST',
      headers: this.headers,
      body: formurlencoded(params),
    }).then(throwError<Stripe.InvoiceItem>());
  }

  updateSubscription(id: string, params: Stripe.SubscriptionUpdateParams): Promise<Stripe.Subscription> {
    return fetch(`${STRIPE_API}subscriptions/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: this.headers,
      body: formurlencoded(params),
    }).then(throwError<Stripe.Subscription>());
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
