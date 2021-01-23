export async function handleRequest(request: Request): Promise<Response> {
  // https://stripe.com/docs/api
  // TODO customers.create, populate `source` with the provided token ID
  // TODO invoices.create for $5 registration fee
  // TODO subscriptions.create with customer ID
  return new Response(`request body: ${await request.text()}`, {headers: {'Access-Control-Allow-Origin': '*'}})
}
