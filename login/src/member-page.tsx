import Stripe from 'stripe';
import { makeHtmlResponse, renderDocument } from './html';

export async function memberPage(customerId: string, env: Env): Promise<Response> {
  const sourceId = await getSourceId(customerId, env);
  return makeHtmlResponse(
    renderDocument(
      sourceId ? (
        <form
          method="post"
          action=""
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '0 auto',
            gap: 'var(--container-padding)',
            padding: 'var(--container-padding)',
            maxWidth: 'min(400px, 90vw)',
            background: 'var(--white)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <p
            style={{
              background: 'var(--yellow-faded)',
              border: 'solid 2px var(--yellow)',
              margin: 0,
              padding: 'var(--text-padding)',
              borderRadius: 'var(--border-radius)',
              maxWidth: 'min(700px, 90vw)',
            }}
          >
            ℹ️
            <strong>Legacy billing must be removed.</strong>
            <br />
            <br />
            Your bank details are linked via a method that Stripe has deprecated.
            <br />
            <br />
            Before you can manage your billing details, the current payment source must be removed. Please be sure to add a new billing
            method shortly after.
          </p>
          <button
            type="submit"
            name="delete_source"
            value="1"
            style={{
              fontSize: '1.1em',
              background: 'var(--primary)',
              padding: '20px 30px',
              border: 0,
              borderRadius: 50,
              color: 'var(--white)',
            }}
          >
            Delete payment source
          </button>
          <p
            style={{
              margin: 0,
              padding: '0 var(--text-padding)',
            }}
          >
            You'll be taken straight to the billing portal.
          </p>
          <p
            style={{
              fontSize: '0.6em',
              opacity: 0.7,
              padding: '0 var(--text-padding)',
            }}
          >
            For questions, contact the membership committee at
            <br />
            <a href="mailto:committee-membership@union.groups.io">committee-membership@union.groups.io</a>.
          </p>
        </form>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            margin: '0 auto',
            gap: 'var(--container-padding)',
            padding: 'var(--container-padding)',
            maxWidth: 'min(400px, 90vw)',
            background: 'var(--white)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          <p style={{ margin: 0 }}>Your billing details can be managed in the Stripe billing portal.</p>
          <a
            href="/stripe-portal"
            style={{
              fontSize: '1.1em',
              background: 'var(--primary)',
              padding: '20px 30px',
              border: 0,
              borderRadius: 50,
              color: 'var(--white)',
              textDecoration: 'none',
            }}
          >
            Open Stripe billing portal
          </a>
        </div>
      ),
    ),
  );
}

export async function getSourceId(customerId: string, env: Env): Promise<string | undefined> {
  const stripe = new Stripe(env.STRIPE_API_KEY);
  const customer = await stripe.customers.retrieve(customerId);
  if ('default_source' in customer && customer.default_source) {
    if (typeof customer.default_source === 'string') {
      return customer.default_source;
    } else {
      return customer.default_source.id;
    }
  }
  return undefined;
}
