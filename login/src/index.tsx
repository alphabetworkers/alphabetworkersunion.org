import { decode, sign, verify } from '@tsndr/cloudflare-worker-jwt';
import Stripe from 'stripe';
import { serialize, parse } from 'cookie';

import { loginPage } from './login-page';
import { memberPage, getSourceId } from './member-page';
import { sendLoginEmail } from './sendgrid';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const sessionToken: string = parse(request.headers.get('cookie')).session_token;
    const session = (await verify(sessionToken, env.LOGIN_LINK_SECRET)) ? await decode(sessionToken).payload : undefined;
    if (request.method === 'POST') {
      const body = await request.formData();
      if (body.get('email')) {
        const email = body.get('email');
        const customerId = await getCustomerIdByEmail(email, env);
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
      } else if (body.get('delete_source')) {
        await deleteCustomerSource(session.stripeCustomerId, env);
        return Response.redirect(new URL('stripe-portal', request.url));
      } else {
        return Response.redirect('', request.url);
      }
    } else {
      const url = new URL(request.url);
      const params = url.searchParams;
      const loginToken = params.get('login_token');
      if (url.pathname === '/stripe-portal') {
        // TODO create Stripe portal session and redirect
      } else if (loginToken && (await verify(loginToken, env.LOGIN_LINK_SECRET))) {
        const customerId = decode(loginToken).payload.stripeCustomerId;
        return redirectWithSession(customerId, request, env);
      } else if (session) {
        return memberPage(session.stripeCustomerId, env);
      } else {
        return loginPage(params);
      }
    }
  },
};

async function deleteCustomerSource(customerId: string, env: Env): Promise<void> {
  const sourceId = await getSourceId(customerId, env);
  if (sourceId) {
    const stripe = new Stripe(env.STRIPE_API_KEY);
    await stripe.customers.deleteSource(customerId, sourceId);
  }
}

async function redirectWithSession(customerId: string, request: Request, env: Env): Response {
  const sessionToken = await makeSessionToken(customerId, env);
  const url = new URL(request.url);
  url.search = '';
  const response = new Response('', { status: 302 });
  response.headers.set('Set-Cookie', serialize('session_token', sessionToken, { secure: true, maxAge: 60 * 60 * 24 * 7 }));
  response.headers.set('Location', url);
  return response;
}

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

function makeSessionToken(customerId: string, env): Promise<string> {
  const secret = env.LOGIN_LINK_SECRET;
  if (!secret) throw new Error('LOGIN_LINK_SECRET must be a random 512-byte hex string.');
  return sign(
    {
      stripeCustomerId: customerId,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7,
    },
    secret,
  );
}

function urlWithParam(url: string, param: string, value?: string = ''): string {
  const newUrl = new URL(url);
  newUrl.search = '';
  newUrl.searchParams.set(param, value);
  return newUrl.toString();
}

async function makeLoginLink(incomingUrl: string, customerId: string, env: Env): Promise<string> {
  return urlWithParam(incomingUrl, 'login_token', await makeLoginToken(customerId, env));
}
