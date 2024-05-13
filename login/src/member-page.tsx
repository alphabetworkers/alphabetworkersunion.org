import Stripe from 'stripe';
import { makeHtmlResponse, renderDocument } from './html';

export async function memberPage(customerId: string, env: Env): Response {
  const sourceId = await getSourceId(customerId, env);
  return makeHtmlResponse(
    renderDocument(
      sourceId ? (
        <>
          Your Stripe account has a legacy bank account association. Before your payment method or dues can be changed, that previous
          payment source must be removed. Click "Permanently Delete Payment Source" to remove that source. You'll be redirected to the
          Stripe portal immediately after. In order to remain a member in good-standing, please ensure you setup a new dues payment method
          shortly thereafter.
          <form method="post" action="">
            <button type="submit" name="delete_source" value="1">
              Permanently Delete Payment Source
            </button>
          </form>
        </>
      ) : (
        <>
          Click here to navigate to Stripe's customer portal, where you can manage your billing information.
          <a href="/stripe-portal">Go to Stripe Portal</a>
        </>
      ),
    ),
  );
}

export async function getSourceId(customerId, env: Env): Promise<string | undefined> {
  const stripe = new Stripe(env.STRIPE_API_KEY);
  const customer = await stripe.customers.retrieve(customerId);
  return customer.default_source ?? undefined;
}
