/**
 * Cloudflare Worker — SIH 2026 PS Page Proxy
 *
 * Deployed at: workers.dev (free tier)
 * Purpose: Fetch https://sih.gov.in/sih2026PS from inside Cloudflare's
 *          own network, where the WAF bot-protection does NOT apply.
 *          Returns raw HTML to the backend on Render.
 *
 * Free tier: 100,000 requests/day — plenty for 1 req/min = 1,440/day.
 *
 * HOW TO DEPLOY:
 *   1. Go to https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2. Paste this entire file into the editor
 *   3. Click "Deploy"
 *   4. Copy the Worker URL (e.g. https://sih-proxy.YOUR-NAME.workers.dev)
 *   5. Set WORKER_PROXY_URL=<that URL> in your Render environment variables
 */

const TARGET_URL = "https://sih.gov.in/sih2026PS";

// Secret token to prevent anyone else from using your worker as a free proxy.
// Set this same value as WORKER_PROXY_SECRET in your Render env vars.
// Leave blank ("") to disable auth (not recommended for production).
const SECRET_TOKEN = "";   // e.g. "myS3cr3tT0ken"

export default {
  async fetch(request, env, ctx) {
    // ── Auth check ──────────────────────────────────────────────────────────
    if (SECRET_TOKEN) {
      const authHeader = request.headers.get("X-Proxy-Secret") || "";
      if (authHeader !== SECRET_TOKEN) {
        return new Response("Unauthorized", { status: 401 });
      }
    }

    // ── Only GET ─────────────────────────────────────────────────────────────
    if (request.method !== "GET") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // ── Fetch target from inside Cloudflare's network ────────────────────────
    try {
      const upstream = await fetch(TARGET_URL, {
        method: "GET",
        headers: {
          // Realistic browser headers — Cloudflare sees its own edge node
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        redirect: "follow",
      });

      // Forward the HTML body back to Render
      const html = await upstream.text();

      if (!upstream.ok) {
        return new Response(
          `Upstream returned ${upstream.status}: ${html.slice(0, 200)}`,
          { status: upstream.status }
        );
      }

      return new Response(html, {
        status: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          // Tell Render not to cache this — always fresh
          "Cache-Control": "no-store",
          // CORS: only your Render backend needs this
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (err) {
      return new Response(`Worker fetch error: ${err.message}`, {
        status: 502,
      });
    }
  },
};
