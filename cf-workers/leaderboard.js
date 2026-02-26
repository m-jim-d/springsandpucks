export default {
  async fetch(request, env, ctx) {
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

    // Proxy request to Apps Script
    let upstreamResp;
    try {
      upstreamResp = await fetch(target.toString(), { method: "GET" });
      if (!upstreamResp.ok) {
        return new Response("Upstream fetch failed", { status: 502, headers: corsHeaders });
      }
    } catch {
      return new Response("Upstream fetch failed", { status: 502, headers: corsHeaders });
    }

    // Pass through JSON (or text) response from Apps Script
    const contentType = upstreamResp.headers.get("Content-Type") || "application/json";

    return new Response(upstreamResp.body, {
      status: upstreamResp.status,
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
      },
    });
  },
};