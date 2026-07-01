// MYRAA AI — public edge function (no auth)
// Called by MYRAA desktop app. Translates Banglish -> commands via Lovable AI Gateway.

const SYSTEM_PROMPT = `You are MYRAA — Rupom's personal Windows desktop AI assistant.
Personality: professional friendly Banglish (Bangla+English). Address user as "Sir" or "Boss". Replies under 2 lines.

Translate the user request into a JSON object with:
- "reply": short Banglish response.
- "commands": ordered array of commands to execute on the PC.

Command types:
- {"type":"exec","command":"..."}    — any shell/cmd/powershell command.
- {"type":"launch","target":"..."}   — aliases: chrome, firefox, edge, spotify, code, explorer, notepad, calc, cmd, powershell, discord, telegram, whatsapp, paint, word, excel. Or full path.
- {"type":"key_tap","key":"...","modifiers":["ctrl"|"alt"|"shift"|"meta"]}
- {"type":"key_type","text":"..."}   — type literal text.
- {"type":"media","action":"play_pause|next|prev|vol_up|vol_down|mute"}
- {"type":"system","action":"lock|sleep|shutdown|restart|logout|cancel|screenshot"}
- {"type":"open_url","url":"https://..."}
- {"type":"search_web","query":"..."}

Rules:
- "gmail open koro" → open_url https://mail.google.com
- "youtube <q>" → open_url https://www.youtube.com/results?search_query=<q>
- "google search <q>" → search_web
- "type X" / "paste X" → key_type
- Pure chat → commands: [].
- OUTPUT ONLY VALID JSON. No markdown, no code fences.`;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { prompt, platform } = await req.json();
    if (!prompt) return json({ error: "prompt required" }, 400);

    const key = Deno.env.get("LOVABLE_API_KEY");
    if (!key) return json({ error: "LOVABLE_API_KEY missing on server" }, 500);

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Platform: ${platform || "win32"}\nUser: ${prompt}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      return json({ error: `AI ${res.status}: ${txt.slice(0, 200)}` }, 502);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content || "{}";
    let parsed: { reply?: string; commands?: unknown[] };
    try { parsed = JSON.parse(content); }
    catch {
      const m = content.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { reply: content, commands: [] };
    }
    return json({
      reply: parsed.reply || "OK Sir.",
      commands: Array.isArray(parsed.commands) ? parsed.commands : [],
    });
  } catch (e) {
    return json({ error: (e as Error).message || String(e) }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}
