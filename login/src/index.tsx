import { loginPage } from './login-page';
import { sendLoginEmail } from './sendgrid';

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'POST') {
      const body = await request.formData();
      if (body.get('email')) {
        try {
          await sendLoginEmail(body.get('email'), env);
        } catch (e) {
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
