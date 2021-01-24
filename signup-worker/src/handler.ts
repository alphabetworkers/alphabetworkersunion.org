import {stripeRequest} from './stripe';

const DUES_PRODUCT_ID = 'prod_IorioqZ39tXpC4';
const DUES_SIGNUP_PRICE_ID = 'price_1IDEGxE1rwuQcCeiUj6MfbmX';

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
    const customerResponse = await stripeRequest('customers', {
      'source': fields.get('stripe-payment-token'),
    });
    const customer = await customerResponse.json();
    const subscriptionResponse = await stripeRequest('subscriptions', {
      customer: customer.id,
      //'pause_collection[behavior]': 'keep_as_draft', // TODO make a second call to set this?
      billing_cycle_anchor: Math.floor(getBillingAnchor().valueOf() / 1000),
      proration_behavior: 'none',
      'items[0][price_data][currency]': 'usd', // TODO get from client-side
      'items[0][price_data][product]': DUES_PRODUCT_ID,
      'items[0][price_data][unit_amount]': 20000, // In cents. TODO derive from TC
      'items[0][price_data][recurring][interval]': 'month',
      'add_invoice_items[0][price]': DUES_SIGNUP_PRICE_ID,
    });
    return new Response(`Created customer: ${await subscriptionResponse.text()}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  } catch (e) {
    console.log(e);
    return new Response(`Failed: ${e}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  }
}
