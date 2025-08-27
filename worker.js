/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run "npm run dev" in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run "npm run deploy" to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
  async fetch(request, env, ctx) {
    return new Response('Hello World!');
  }
}

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  // Parse the incoming request
  const { url, method, headers } = request;
  let targetUrl;
  try {
    // Expect the target URL in a query param, e.g. /?url=https://example.com
    const reqUrl = new URL(url);
    targetUrl = reqUrl.searchParams.get('url');
    if (!targetUrl) {
      return new Response('Missing "url" query parameter', { status: 400 });
    }
  } catch (e) {
    return new Response('Invalid request', { status: 400 });
  }

  // Clone headers, but remove host and some forbidden headers
  const newHeaders = new Headers(request.headers);
  newHeaders.delete('host');
  newHeaders.delete('origin');
  newHeaders.delete('referer');

  // Forward the request body if present
  let body = null;
  if (method !== 'GET' && method !== 'HEAD') {
    body = await request.arrayBuffer();
  }

  // Proxy the request
  const fetchOptions = {
    method,
    headers: newHeaders,
    body: body && body.byteLength > 0 ? body : undefined,
    redirect: 'follow',
  };

  let response;
  try {
    response = await fetch(targetUrl, fetchOptions);
  } catch (err) {
    return new Response('Error fetching target: ' + err, { status: 502 });
  }

  // Clone response and add CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };

  // For preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Copy response headers and add CORS
  const respHeaders = new Headers(response.headers);
  Object.entries(corsHeaders).forEach(([k, v]) => respHeaders.set(k, v));

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: respHeaders,
  });
}
