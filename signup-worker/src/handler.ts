import {stripeClient} from './stripe';
import Stripe from 'stripe';

/**
 * Generate a Date object for the UTC midnight of the next month.
 */
function getBillingAnchor(): Date {
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() + 1);
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
      email: fields.get('personal-email') as string,
      name: fields.get('preferred-name') as string,
      metadata: {
        'preferred-name': fields.get('preferred-name') as string,
        'preferred-language': fields.get('preferred-language') as string,
        'personal-email': fields.get('personal-email') as string,
        'employement-type': fields.get('employement-type') as string,
        'first-party-employer': fields.get('first-party-employer') as string,
        'third-party-employer': fields.get('third-party-employer') as string,
        'team': fields.get('team') as string,
        'job-title': fields.get('job-title') as string,
        'signature': fields.get('signature') as string,
      }
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
    if (!subscriptionResponse.ok) {
      throw new Error(await subscriptionResponse.text());
    }
    const subscription = await subscriptionResponse.json();
    const updateResponse = await stripeClient.updateSubscription(subscription.id, {
      pause_collection: {
        behavior: 'keep_as_draft',
      },
    });
    // TODO improve success and error responses
    return new Response(JSON.stringify(await updateResponse.json()), {headers: {'Access-Control-Allow-Origin': '*'}})
  } catch (e) {
    console.warn(e);
    return new Response(`Failed: ${e}`, {headers: {'Access-Control-Allow-Origin': '*'}});
  }
}
