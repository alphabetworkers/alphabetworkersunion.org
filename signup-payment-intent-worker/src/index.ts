import Stripe from 'stripe';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const stripe = new Stripe(env.STRIPE_SECRET_KEY);
		const data = await request.formData();
		const duesCents = totalCompDollarsToBillingCycleDuesCents(data.get('totalCompensation'));
		const paymentIntent = await stripe.paymentIntents.create({
			amount: duesCents,
			currency: 'usd',
		});
		return new Response(JSON.stringify({
			clientSecret: paymentIntent.client_secret,
		}), {headers: {'Access-Control-Allow-Origin': '*'}});
	},
};

function totalCompDollarsToBillingCycleDuesCents(totalComp: number): number {
  const annualDues = Math.floor(totalComp / 100);
  const monthlyDues = Math.floor(annualDues / 12);
  const monthlyDuesCents = monthlyDues * 100;
  return monthlyDuesCents;
}
