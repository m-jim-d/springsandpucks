export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";

    const isLocalOrigin = (
      origin.startsWith("http://localhost") ||
      origin.startsWith("https://localhost") ||
      origin.startsWith("http://192.168.") ||
      origin.startsWith("https://192.168.") ||
      origin === "http://bee" ||
      origin === "https://bee"
    );

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
    }

    const SHEET_URL = env.PVENT_SHEET_URL;
    if (!SHEET_URL) {
      return new Response("Missing env.PVENT_SHEET_URL", { status: 500, headers: corsHeaders });
    }

    // Robust JSON parsing (works with fetch() and sendBeacon())
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

    const mode = (body?.mode ?? "normal").toString();
    let eventDesc = (body?.eventDesc ?? "").toString();
    if (isLocalOrigin) {
      eventDesc = "____L____" + eventDesc;
    }

    const target = new URL(SHEET_URL);
    target.searchParams.set("mode", mode);
    target.searchParams.set("eventDesc", eventDesc);

    let upstreamResp;
    try {
      upstreamResp = await fetch(target.toString(), { method: "GET" });
    } catch {
      return new Response("Upstream fetch failed", { status: 502, headers: corsHeaders });
    }

    // For logging, you can also just return 204 always.
    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: {
        ...corsHeaders,
        "Content-Type": upstreamResp.headers.get("Content-Type") ?? "text/plain",
      },
    });
  },
};