import { sendgridClient } from './sendgrid';
import Stripe from 'stripe';
import {
  CARD_PROCESSING_FEE,
  INITIATION_FEE_CENTS,
} from '../../common/constants.ts';

import { REQUIRED_FIELDS, METADATA, FTE_REQUIRED_FIELDS } from './fields';

declare const STRIPE_KEY: string;

const stripe = new Stripe(STRIPE_KEY, {
  httpClient: Stripe.createFetchHttpClient(),
  apiVersion: '2020-08-27',
});

// A threshold below which we think someone may have made a mistake (entered
// monthly income, copied the monthly dues value and pasted it back into the
// income box, etc) rather than entered their annual income.
const POTENTIAL_ERROR_TOTAL_COMP_THRESHOLD = 6000;

/**
 * @param month A `number` indicating the month, as returned by `getUTCMonth()`
 * @param year A `number` indicating the year, as returned by `getUTCFullYear()`
 * @returns A `Date` of the billing anchor for the given month in the given year
 */
function getBillingAnchorFor(month: number, year: number): Date {
  // JS months are zero-indexed, but ISO date string months start at 01
  const monthOneIndexed = month + 1;
  // Add a leading zero to the month if necessary to get two digits
  const monthString = (monthOneIndexed < 10 ? '0' : '') + `${monthOneIndexed}`;
  // Construct an ISO date string (in UTC) and use it to create a Date
  // Billing at 08:00 UTC means that we'll get the right day on the invoice if
  // the Stripe account is in UTC (a likely default), Eastern (local 1400),
  // or Pacific time
  return new Date(`${year}-${monthString}-01T08:00:00Z`);
}

/**
 * Generate a `Date` for the billing anchor of the next month (or of this month,
 * if this month's billing anchor is still in the future).
 */
function getBillingAnchor(): Date {
  const now = new Date();

  const thisMonth = now.getUTCMonth();
  const thisMonthsYear = now.getUTCFullYear();
  const thisMonthsAnchor = getBillingAnchorFor(thisMonth, thisMonthsYear);
  if (thisMonthsAnchor.getTime() > now.getTime()) {
    return thisMonthsAnchor;
  }

  // If we're past this month's billing anchor
  const nextMonth = (thisMonth + 1) % 12;
  const nextMonthsYear =
    nextMonth > thisMonth ? thisMonthsYear : thisMonthsYear + 1;
  const nextMonthsAnchor = getBillingAnchorFor(nextMonth, nextMonthsYear);
  return nextMonthsAnchor;
}

function makeSubscriptionItems(
  currency: string,
  totalComp: number,
  paymentMethod: string,
): Stripe.SubscriptionCreateParams.Item[] {
  const duesItem = {
    price_data: {
      currency: currency,
      product: DUES_PRODUCT_ID,
      unit_amount: totalCompDollarsToBillingCycleDuesCents(totalComp),
      recurring: {
        interval: 'month',
      },
    },
  } as Stripe.SubscriptionCreateParams.Item;
  if (paymentMethod === 'card') {
    return [
      duesItem,
      {
        price_data: {
          currency: currency,
          product: CARD_FEE_PRODUCT_ID,
          unit_amount: getCardFeeCents(totalComp),
          recurring: {
            interval: 'month',
          },
        },
      },
    ];
  }
  return [duesItem];
}

function getCardFeeCents(totalComp: number): number {
  return Math.floor(
    totalCompDollarsToBillingCycleDuesCents(totalComp) * CARD_PROCESSING_FEE,
  );
}

function totalCompDollarsToBillingCycleDuesCents(totalComp: number): number {
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
    const totalComp = Number(fields.get('total-compensation') as string);
    if (totalComp < POTENTIAL_ERROR_TOTAL_COMP_THRESHOLD) {
      throw new InvalidParamError(
        'total-compensation',
        'Enter your annual total compensation. If you did so and still receive this error, please' +
          'email contact@alphabetworkersunion.org to help complete your join request.',
      );
    }

    let customer: Stripe.Customer;
    try {
      paymentMethod = fields.get('payment-method') as string;
      customer = await stripe.customers.create({
        email: fields.get('personal-email') as string,
        name: fields.get('preferred-name') as string,
        metadata: {
          ...METADATA.reduce(
            (metadata, fieldName) => ({
              ...metadata,
              [fieldName]: fields.get(fieldName) as string,
            }),
            {} as Record<string, string>,
          ),
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
    const currency = fields.get('currency') as string;

    const subscriptionItems = makeSubscriptionItems(
      currency,
      totalComp,
      paymentMethod,
    );

    const [setupIntent, initiationPaymentIntent] = await Promise.all([
      (async () => {
        const subscription = await stripe.subscriptions.create({
          customer: customer.id,
          billing_cycle_anchor: Math.floor(getBillingAnchor().valueOf() / 1000),
          proration_behavior: 'none',
          payment_behavior: 'default_incomplete',
          payment_settings: { save_default_payment_method: 'on_subscription' },
          items: subscriptionItems,
          expand: ['pending_setup_intent'],
        });
        // await stripe.subscriptions.update(subscription.id, {
        //   pause_collection: { behavior: 'keep_as_draft' },
        // });
        return subscription.pending_setup_intent;
      })(),
      (async () => {
        await stripe.invoiceItems.create({
          customer: customer.id,
          price_data: {
            currency: currency,
            product: INITIATION_FEE_PRODUCT_ID,
            unit_amount: INITIATION_FEE_CENTS,
          },
        });
        const invoice = await stripe.invoices.create({
          customer: customer.id,
          auto_advance: true,
          collection_method: 'charge_automatically',
          expand: ['payment_intent'],
        });
        // Invoice must be manually finalized before it has a PaymentIntent.
        const finalizedInvoice = await stripe.invoices.finalizeInvoice(
          invoice.id,
          {
            expand: ['payment_intent'],
          },
        );
        return finalizedInvoice.payment_intent;
      })(),
    ]);

    await sendgridClient.sendWelcomeEmail(
      fields.get('preferred-name') as string,
      fields.get('personal-email') as string,
    );

    return new Response(
      JSON.stringify({
        success: true,
        subscription_client_secret: setupIntent.client_secret,
        initiation_client_secret: initiationPaymentIntent.client_secret,
      }),
      {
        headers: { 'Access-Control-Allow-Origin': '*' },
      },
    );
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
  constructor(
    private readonly paramName: string,
    message: string,
  ) {
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
  if (param === 'email') {
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
