import { stripeClient } from './stripe';
import { sendgridClient } from './sendgrid';
import * as jwt from '@tsndr/cloudflare-worker-jwt';
import Stripe from 'stripe';

const ONE_HOUR_IN_SECONDS = 60 * 60;

export async function handleRequest(event: FetchEvent): Promise<Response> {
  const fields = await event.request.formData();
  event.waitUntil(handleRequestAsync(fields));
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}

async function handleRequestAsync(fields: FormData): Promise<void> {
  if (!fields.get('email')) {
    throw new MissingParamError('email');
  }
  if (!fields.get('uid')) {
    throw new MissingParamError('uid');
  }
  // cloudflare doesn't like it when this is fixed
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const email = fields.get('email')! as string;
  // cloudflare doesn't like it when this is fixed
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const uid = fields.get('uid')! as string;

  let customerList: Stripe.ApiList<Stripe.Customer>;
  let token: string;

  try {
    customerList = await stripeClient.fetchCustomer(email);
    if (customerList.data.length == 1) {
      token = jwt.sign(
        {
          exp: Math.floor(Date.now() / 1000) + ONE_HOUR_IN_SECONDS,
          data: email,
          uid,
        },
        SIGNING_KEY,
      );
      await sendgridClient.sendEditEmail(token, email);
    } else {
      throw new InvalidParamError(
        'email',
        'did not find the customer: ' + email,
      );
    }
  } catch (e) {
    console.warn(e);
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
