/**
 * Stripe-node depends on a Node runtime, so we must use its REST API directly.
 *  https://stripe.com/docs/api
 */
export function stripeClient(key: string) {
  const basicAuth = `Basic ${btoa(STRIPE_KEY + ':')}`;
  return (resource, params: {[key: string]: string}) => fetch(`https://api.stripe.com/v1/${encodeURIComponent(resource)}`, {
    method: 'POST',
    headers: {
      'Authorization': basicAuth,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(params).toString(),
  });
}

/**
 * Function to make requests to Stripe.
 */
export const stripeRequest = stripeClient(STRIPE_KEY);
