import { plaidClient } from './plaid';

export async function handleRequest(request: Request): Promise<Response> {
  return new Response(JSON.stringify(await plaidClient.linkTokenCreate()), {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
