import {stripeClient} from './stripe';
import Stripe from 'stripe';

const REQUIRED_METADATA = [
  'employment-type',
  'signature',
];

const REQUIRED_FIELDS = REQUIRED_METADATA.concat([
  'preferred-name',
  'personal-email',
]);

const OPTIONAL_METADATA = [
  'preferred-language',
  'first-party-employer',
  'third-party-employer',
  'team',
  'job-title',
];

const METADATA = REQUIRED_METADATA.concat(OPTIONAL_METADATA);

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
    for (const fieldName of REQUIRED_FIELDS) {
      if (!fields.get(fieldName)) {
        throw new MissingParamError(fieldName);
      }
    }
    let customer: Stripe.Customer;
    try {
      customer = await stripeClient.createCustomer({
        source: fields.get('stripe-payment-token') as string,
        email: fields.get('personal-email') as string,
        name: fields.get('preferred-name') as string,
        metadata: {
          ...METADATA.reduce((metadata, fieldName) => {
            metadata[fieldName] = fields.get(fieldName) as string;
            return metadata;
          }, {} as Record<string, string>),
        }
      });
    } catch (error) {
      const field = stripeCustomerParamToField(error.param);
      if (field) {
        throw new InvalidParamError(field, error.message);
      }
      throw error;
    }

    const subscription = await stripeClient.createSubscription({
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

    await stripeClient.updateSubscription(subscription.id, {
      pause_collection: {
        behavior: 'keep_as_draft',
      },
    });
    return new Response(JSON.stringify({success: true}), {headers: {'Access-Control-Allow-Origin': '*'}})
  } catch (e) {
    console.warn(e);
    const error = e instanceof InvalidParamError ? e.toObject() : {message: e.message};
    return new Response(JSON.stringify({success: false, error}), {status: 400, headers: {'Access-Control-Allow-Origin': '*'}});
  }
}

class InvalidParamError extends Error {
  constructor(private readonly paramName: string, message: string) {
    super(message);
  }

  toObject(): {param: string, message: string} {
    return {param: this.paramName, message: this.message};
  }
}

class MissingParamError extends InvalidParamError {
  constructor(paramName: string) {
    super(paramName, 'This field is required');
  }
}

function stripeCustomerParamToField(param: string): string|null {
  if (param === 'source') {
    return 'stripe-payment-token';
  } else if (param === 'email') {
    return 'personal-email';
  } else if (param === 'name') {
    return 'preferred-name';
  }
  for (const fieldName of METADATA) {
    if (param === `metadata[${fieldName}]`) {
      return fieldName;
    }
  }
  return null;
}
