import { loginPage } from './login-page';
import { sendLoginEmail } from './sendgrid';
import { sign } from '@tsndr/cloudflare-worker-jwt';
import Stripe from 'stripe';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      const body = await request.formData();
      if (body.get('email')) {
        const email = body.get('email');
        const customerId = getCustomerIdByEmail(email, env);
        if (customerId) {
          try {
            const loginLink = await makeLoginLink(request.url, customerId, env);
            await sendLoginEmail(email, loginLink, env);
          } catch (e) {
            console.error(e);
            return Response.redirect(urlWithParam(request.url, 'failure'));
          }
        }
        return Response.redirect(urlWithParam(request.url, 'link_sent'));
      }
    } else {
      // TODO check for login_token parameter.
      return loginPage(new URL(request.url).searchParams);
    }
  },
};

async function getCustomerIdByEmail(email: string, env: Env): string | undefined {
  const stripe = new Stripe(env.STRIPE_API_KEY);
  const customers = await stripe.customers.search({
    query: `email:${JSON.stringify(email)}`,
    limit: 1,
  });
  const customerId = customers.data[0]?.id;
  return customerId;
}

function makeLoginToken(customerId: string, env: Env): Promise<string> {
  const secret = env.LOGIN_LINK_SECRET;
  if (!secret) throw new Error('LOGIN_LINK_SECRET must be a random 512-byte hex string.');
  return sign(
    {
      stripeCustomerId: customerId,
      exp: Math.floor(Date.now() / 1000) + 60 * 30, // Expires in 30 min.
    },
    secret,
  );
}

function urlWithParam(url: string, param: string, value?: string = ''): string {
  const newUrl = new URL(url);
  newUrl.searchParams.set(param, value);
  return newUrl.toString();
}

async function makeLoginLink(incomingUrl: string, customerId: string, env: Env): Promise<string> {
  return urlWithParam(incomingUrl, 'login_token', await makeLoginToken(customerId, env));
}
