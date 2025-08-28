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
    const { url, method, headers } = request;
    // Define CORS headers early so they can be used in all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };
    // Get target URL from custom header
    const targetUrl = request.headers.get('x-proxy-target-url');
    if (!targetUrl) {
      return new Response('Missing parameter', {
        status: 400,
        headers: corsHeaders,
      });
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
    console.log(targetUrl)
    let response;
    try {
      response = await fetch(targetUrl, fetchOptions);
    } catch (err) {
      return new Response('Error fetching target: ' + err, { status: 502 });
    }

  // ...existing code...

    // For preflight requests
    if (method === 'OPTIONS') {
      // Always set CORS headers, and provide a fallback for Access-Control-Allow-Headers
      const allowHeaders = request.headers.get("Access-Control-Request-Headers") || '*';
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders,
          "Access-Control-Allow-Headers": allowHeaders,
        },
      });
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
}
