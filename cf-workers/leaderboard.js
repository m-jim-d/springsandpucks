export default {
  async fetch(request, env, ctx) {
    // Only handle the exact API endpoint. Any other path (e.g. /leaderboard-help.html)
    // is passed through to the origin so a wildcard route won't clobber static pages.
    const url = new URL(request.url);
    if (url.pathname !== "/leaderboard") {
      return fetch(request);
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
      // Let client JS read the retry count cross-origin (see X-LB-Attempts below).
      "Access-Control-Expose-Headers": "X-LB-Attempts",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const SHEET_URL = env.LEADERBOARD_SHEET_URL;
    if (!SHEET_URL) {
      return new Response("Missing env.LEADERBOARD_SHEET_URL", { status: 500, headers: corsHeaders });
    }

    // Parse JSON body
    let body;
    try {
      const ct = request.headers.get("content-type") || "";
      if (ct.includes("application/json")) {
        body = await request.json();
      } else {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      }
    } catch {
      return new Response("Bad JSON", { status: 400, headers: corsHeaders });
    }

    // Helper to safely stringify anything into querystring-compatible values
    const s = (v) => (v === undefined || v === null ? "" : String(v));

    // Build the Apps Script GET URL with the exact parameter names your script expects
    const target = new URL(SHEET_URL);
    target.searchParams.set("mode", s(body.mode));
    target.searchParams.set("userName", s(body.userName));
    target.searchParams.set("score", s(body.score));
    target.searchParams.set("gameVersion", s(body.gameVersion));
    target.searchParams.set("winTime", s(body.winTime));
    target.searchParams.set("mouse", s(body.mouse));
    target.searchParams.set("npcSleep", s(body.npcSleep));
    target.searchParams.set("nPeople", s(body.nPeople));
    target.searchParams.set("nDrones", s(body.nDrones));
    target.searchParams.set("frMonitor", s(body.frMonitor));
    target.searchParams.set("hzPhysics", s(body.hzPhysics));
    target.searchParams.set("virtualGamePad", s(body.virtualGamePad));
    target.searchParams.set("noFriendlyFire", s(body.noFriendlyFire));
    target.searchParams.set("editorUsage", s(body.editorUsage));
    target.searchParams.set("index", s(body.index));

    // Proxy request to Apps Script, retrying transient upstream failures (Google 5xx / network
    // hiccups). Safe for all modes because the Apps Script dedupes submissions on randomIndex,
    // so a retried write that already landed is ignored rather than duplicated.
    // 20 s per attempt / 2 attempts gives a 2-3 s Apps Script run plus a slow cold start
    // enough time without piling up too many queued lock-waiting retries.
    const { response: upstreamResp, attempts } = await fetchWithRetry(target.toString(), 2, 20000);
    if (!upstreamResp) {
      // All attempts failed: report how many were made so the client can log it.
      return new Response("Upstream fetch failed", {
        status: 502,
        headers: { ...corsHeaders, "X-LB-Attempts": String(attempts) },
      });
    }

    // Pass through JSON (or text) response from Apps Script
    const contentType = upstreamResp.headers.get("Content-Type") || "application/json";

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "X-LB-Attempts": String(attempts),
      },
    });
  },
};

// GET the upstream URL, retrying on non-ok responses, network throws, or a per-attempt
// timeout. The timeout (via AbortController) caps how long a hung upstream leg can stall
// before we abandon it and retry, so a transport-level freeze becomes fail-fast instead
// of a 10-30s wait. Returns { response, attempts }: response is the first ok Response
// (or null if all attempts fail, caller emits 502); attempts is the number of tries made.
async function fetchWithRetry(url, tries = 3, timeoutMs = 7000) {
  let attempts = 0;
  for (let i = 0; i < tries; i++) {
    attempts++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const r = await fetch(url, { method: "GET", signal: controller.signal });
      if (r.ok) return { response: r, attempts };
    } catch (_) {
      // network-level failure or timeout abort: fall through to backoff/retry
    } finally {
      clearTimeout(timer);
    }
    if (i < tries - 1) {
      await new Promise((res) => setTimeout(res, 400 * (i + 1))); // 400ms, then 800ms
    }
  }
  return { response: null, attempts };
}