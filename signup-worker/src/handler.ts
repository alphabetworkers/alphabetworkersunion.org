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

function totalCompDollarsToBillingCycleDuesCents(totalComp: number): number {
  const annualDues = Math.floor(totalComp / 100);
  const monthlyDues = Math.floor(annualDues / 12);
  const monthlyDuesCents = monthlyDues * 100;
  return monthlyDuesCents;
}

export async function handleRequest(request: Request): Promise<Response> {
  try {
    const fields = await request.formData();
    const customerResponse = await stripeClient.createCustomer({
      source: fields.get('stripe-payment-token') as string,
    });
    const customer = await customerResponse.json();
    const subscriptionResponse = await stripeClient.createSubscription({
      customer: customer.id,
      billing_cycle_anchor: Math.floor(getBillingAnchor().valueOf() / 1000),
      proration_behavior: 'none',
      items: [{
        price_data: {
          currency: (fields.get('currency') as string),
          product: DUES_PRODUCT_ID,
          unit_amount: totalCompDollarsToBillingCycleDuesCents(Number(fields.get('total-compensation') as string)),
          recurring: {
            interval: 'month',
          },
        },
      }],
      add_invoice_items: [
        {price: DUES_SIGNUP_PRICE_ID},
      ],
    });
    const subscription = await subscriptionResponse.json();
    const updateResponse = await stripeClient.updateSubscription(subscription.id, {
      pause_collection: {
        behavior: 'keep_as_draft',
      },
    });
    return new Response(`Created customer: ${await updateResponse.text()}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  } catch (e) {
    console.warn(e);
    return new Response(`Failed: ${e}`, {headers: {'Access-Control-Allow-Origin': '*'}});
  }
}
