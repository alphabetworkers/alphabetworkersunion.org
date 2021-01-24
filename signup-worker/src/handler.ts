import {stripeRequest} from './stripe';

export async function handleRequest(request: Request): Promise<Response> {
  try {
    const fields = await request.formData();
    const response = await stripeRequest('customers', {
      'source': fields.get('stripe-payment-token'),
    });
    // TODO invoices.create for $5 registration fee
    // TODO subscriptions.create with customer ID
    return new Response(`Created customer: ${await response.text()}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  } catch (e) {
    console.log(e);
    return new Response(`Failed: ${e}`, {headers: {'Access-Control-Allow-Origin': '*'}})
  }
}
