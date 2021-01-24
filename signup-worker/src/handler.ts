import {stripeClient} from './stripe';
import Stripe from 'stripe';

/**
 * Generate a Date object for the UTC midnight of the next month.
 */
function getBillingAnchor(): Date {
  const now = new Date();
  now.setUTCMonth(now.getUTCMonth() + 1);
  now.setUTCDate(1);
  now.setUTCHours(0);
  now.setUTCMinutes(0);
  now.setUTCSeconds(0);
  return now;
}

export async function handleRequest(request: Request): Promise<Response> {
  try {
    const fields = await request.formData();
    const paymentToken = fields.get('stripe-payment-token');
    if (typeof paymentToken !== 'string') {
      throw 'Stripe payment token must be of type string';
    }
    const customerResponse = await stripeClient.createCustomer({
      source: paymentToken,
    });
    const customer = await customerResponse.json();
    const subscriptionResponse = await stripeClient.createSubscription({
      customer: customer.id,
      //'pause_collection[behavior]': 'keep_as_draft', // TODO make a second call to set this?
      billing_cycle_anchor: Math.floor(getBillingAnchor().valueOf() / 1000),
      proration_behavior: 'none',
      items: [{
        price_data: {
          currency: 'usd', // TODO get from client-side
          product: DUES_PRODUCT_ID,
          unit_amount: 20000, // In cents. TODO derive from TC
          recurring: {
            interval: 'month',
          },
        },
      }],
      add_invoice_items: [
        {price: DUES_SIGNUP_PRICE_ID}
      ],
    });
    return new Response(`Created customer: ${await subscriptionResponse.text()}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  } catch (e) {
    console.log(e);
    return new Response(`Failed: ${e}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  }
}
