import { loginPage } from './login-page';
import { sendLoginEmail } from './sendgrid';
import { sign } from '@tsndr/cloudflare-worker-jwt';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      const body = await request.formData();
      if (body.get('email')) {
        const email = body.get('email');
        // TODO check for Stripe Customer object matching the email first.
        try {
          const loginLink = await makeLoginLink(request.url, email, env);
          await sendLoginEmail(email, loginLink, env);
        } catch (e) {
          console.error(e);
          const redirectUrl = new URL(request.url);
          redirectUrl.searchParams.set('failure', 1);
          return Response.redirect(redirectUrl.toString());
        }
        const redirectUrl = new URL(request.url);
        redirectUrl.searchParams.set('link_sent', 1);
        return Response.redirect(redirectUrl.toString());
      }
    } else {
      return loginPage(new URL(request.url).searchParams);
    }
  },
};

function makeLoginToken(email: string, env: Env): Promise<string> {
  const secret = env.LOGIN_LINK_SECRET;
  if (!secret) throw new Error('LOGIN_LINK_SECRET must be a random 512-byte hex string.');
  return sign(
    {
      email,
      // TODO put Customer ID into the token instead of email.
      exp: Math.floor(Date.now() / 1000) + 60 * 30, // Expires in 30 min.
    },
    secret,
  );
}

async function makeLoginLink(incomingUrl: string, email: string, env: Env): Promise<string> {
  const url = new URL(incomingUrl);
  url.searchParams.set('login_token', await makeLoginToken(email, env));
  return url.toString();
}
