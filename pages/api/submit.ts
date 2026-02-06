import type { NextApiRequest, NextApiResponse } from "next";

const QUESTION_LABELS: Record<string, string> = {
  industry: "Industry",
  q1: "Operations setup",
  q2: "Inefficient areas",
  q3: "Custom tools",
  q4: "Pricing/quoting importance",
  q5: "When something breaks",
  q6: "Ideal system (optional)",
  q7: "Open to custom systems",
  q8: "Company size",
  q9: "Revenue range",
};

function formatPayloadForTelegram(payload: { answers: Record<string, unknown>; contact: Record<string, string> }): string {
  const contact = payload.contact ?? {};
  const answers = payload.answers ?? {};
  const lines: string[] = [
    "🔔 New Pre-Audit Submission",
    "",
    "——— Contact ———",
    `Name: ${contact.firstName || "—"}`,
    `Email: ${contact.email || "—"}`,
    `Phone: ${contact.phone || "—"}`,
    `Company: ${contact.company || "—"}`,
    "",
  ];
  const keys = ["industry", "q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"];
  keys.forEach((key, i) => {
    const label = QUESTION_LABELS[key];
    const value = answers[key];
    const stepNum = i + 1;
    lines.push(`——— Step ${stepNum}: ${label} ———`);
    if (value === undefined || value === "") {
      lines.push("—");
    } else {
      const text = Array.isArray(value) ? (value as string[]).join(", ") : String(value);
      lines.push(text);
    }
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const hasToken = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;
    return res.status(200).json({
      ok: true,
      message: "Submit API is running",
      telegramConfigured: hasToken && hasChatId,
    });
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; submission not sent to Telegram.");
    return res.status(200).json({ ok: true, sent: false });
  }

  try {
    const rawBody = req.body;
    const body =
      rawBody == null
        ? {}
        : typeof rawBody === "string"
          ? (() => {
              try {
                return JSON.parse(rawBody);
              } catch {
                return {};
              }
            })()
          : rawBody;
    const answers = body.answers ?? {};
    const contact = body.contact ?? {};
    const text = formatPayloadForTelegram({ answers, contact });

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
    });

    let data: { ok?: boolean } = {};
    try {
      data = await response.json();
    } catch {
      console.error("Telegram API returned non-JSON");
      return res.status(200).json({ ok: true, sent: false });
    }
    if (!data.ok) {
      console.error("Telegram API error:", data);
      return res.status(200).json({ ok: true, sent: false });
    }
    return res.status(200).json({ ok: true, sent: true });
  } catch (e) {
    console.error("Submit API error:", e);
    // Return 200 so the user still sees success; check server logs to fix
    return res.status(200).json({ ok: true, sent: false });
  }
}
