import { stripeClient } from './stripe';
import { plaidClient } from './plaid';
import { sendgridClient } from './sendgrid';
import Stripe from 'stripe';

import { REQUIRED_FIELDS, METADATA, FTE_REQUIRED_FIELDS } from './fields';

/**
 * Generate a Date object for the UTC midnight of the next month.
 */
function getBillingAnchor(): Date {
  const now = new Date();
  now.setUTCDate(1);
  now.setUTCMonth(now.getUTCMonth() + 1);
  // Setting 8 hours means that we'll get the right day on the invoice if
  // the Stripe account is in UTC (a likely default), Eastern (local 1400),
  // or Pacific time
  now.setUTCHours(8);
  now.setUTCMinutes(0);
  now.setUTCSeconds(0);
  return now;
}

function getSubscriptionItems(
  currency: string,
  totalComp: number,
  paymentMethod: string,
): Stripe.SubscriptionCreateParams.Item[] {
  if (paymentMethod === 'card') {
    return [
      {
        price_data: {
          currency: currency,
          product: DUES_PRODUCT_ID,
          unit_amount: totalCompDollarsToBillingCycleDuesCents(
            totalComp,
          ),
          recurring: {
            interval: 'month',
          },
        },
      },
      { price_data: {
        currency: currency,
        product: CARD_FEE_PRODUCT_ID,
        unit_amount: getCardFeeCents(
          totalComp,
        ),
        recurring: {
          interval: 'month',
        },
      },},
    ];
  }
  return [
    {
      price_data: {
        currency: currency,
        product: DUES_PRODUCT_ID,
        unit_amount: totalCompDollarsToBillingCycleDuesCents(
          totalComp,
        ),
        recurring: {
          interval: 'month',
        },
      },
    },
  ];
}

function getCardFeeCents(
  totalComp: number,
): number {
  return totalCompDollarsToBillingCycleDuesCents(totalComp) * 0.029;
}

function totalCompDollarsToBillingCycleDuesCents(
  totalComp: number,
): number {
  const annualDues = Math.floor(totalComp / 100);
  const monthlyDues = Math.floor(annualDues / 12);
  const monthlyDuesCents = monthlyDues * 100;
  return monthlyDuesCents;
}

export async function handleRequest(request: Request): Promise<Response> {
  let paymentMethod: string;
  try {
    const fields = await request.formData();
    for (const fieldName of REQUIRED_FIELDS) {
      if (!fields.get(fieldName)) {
        throw new MissingParamError(fieldName);
      }
    }
    if (fields.get('employment-type') === 'fte') {
      for (const fieldName of FTE_REQUIRED_FIELDS) {
        if (!fields.get(fieldName)) {
          throw new MissingParamError(fieldName);
        }
      }
    }
    let customer: Stripe.Customer;
    try {
      let source: string;
      if (fields.has('plaid-public-token')) {
        const { access_token } = await plaidClient.itemPublicTokenExchange(
          // cloudflare doesn't like it when this is fixed
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          fields.get('plaid-public-token')! as string,
        );
        source = (
          await plaidClient.processorStripeBankAccountTokenCreate(
            access_token,
            // cloudflare doesn't like it when this is fixed
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            fields.get('plaid-account-id')! as string,
          )
        ).stripe_bank_account_token;
      } else {
        source = fields.get('stripe-payment-token') as string;
      }
      paymentMethod = fields.get('payment-method') as string;
      customer = await stripeClient.createCustomer({
        source,
        email: fields.get('personal-email') as string,
        name: fields.get('preferred-name') as string,
        metadata: {
          ...METADATA.reduce((metadata, fieldName) => {
            metadata[fieldName] = fields.get(fieldName) as string;
            return metadata;
          }, {} as Record<string, string>),
        },
      });
    } catch (error) {
      console.warn(error);
      const field = stripeCustomerParamToField(error.param);
      if (field) {
        throw new InvalidParamError(field, error.message);
      }
      throw error;
    }

    const subscriptionItems = getSubscriptionItems(
      fields.get('currency') as string,
      Number(fields.get('total-compensation') as string),
      paymentMethod,
    );

    await Promise.all([
      stripeClient
        .createSubscription({
          customer: customer.id,
          billing_cycle_anchor: Math.floor(getBillingAnchor().valueOf() / 1000),
          proration_behavior: 'none',
          items: subscriptionItems,
        })
        .then((subscription) =>
          stripeClient.updateSubscription(subscription.id, {
            pause_collection: {
              behavior: 'keep_as_draft',
            },
          }),
        ),
      stripeClient
        .createInvoiceItem({
          customer: customer.id,
          price: DUES_SIGNUP_PRICE_ID,
        })
        .then(() =>
          stripeClient.createInvoice({
            customer: customer.id,
            collection_method: 'charge_automatically',
          }),
        ),
    ]);

    await sendgridClient.sendWelcomeEmail(
      fields.get('preferred-name') as string,
      fields.get('personal-email') as string,
    );

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (e) {
    console.warn(e);
    const error =
      e instanceof InvalidParamError ? e.toObject() : { message: e.message };
    return new Response(JSON.stringify({ success: false, error }), {
      status: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  }
}

class InvalidParamError extends Error {
  constructor(private readonly paramName: string, message: string) {
    super(message);
  }

  toObject(): { param: string; message: string } {
    return { param: this.paramName, message: this.message };
  }
}

class MissingParamError extends InvalidParamError {
  constructor(paramName: string) {
    super(paramName, 'This field is required');
  }
}

function stripeCustomerParamToField(param: string): string | null {
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
