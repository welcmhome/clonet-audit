import type { NextApiRequest, NextApiResponse } from "next";

const QUESTION_LABELS: Record<string, string> = {
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
  const { contact, answers } = payload;
  const lines: string[] = [
    "🔔 New Pre-Audit Submission",
    "",
    "— Contact —",
    `Name: ${contact.firstName || "—"}`,
    `Email: ${contact.email || "—"}`,
    `Phone: ${contact.phone || "—"}`,
    `Company: ${contact.company || "—"}`,
    "",
    "— Answers —",
  ];
  for (const key of ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8", "q9"]) {
    const label = QUESTION_LABELS[key];
    const value = answers[key];
    if (value === undefined || value === "") continue;
    const text = Array.isArray(value) ? (value as string[]).join(", ") : String(value);
    lines.push(`${label}: ${text}`);
  }
  return lines.join("\n");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set; submission not sent to Telegram.");
    return res.status(200).json({ ok: true, sent: false });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { answers = {}, contact = {} } = body;
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

    const data = await response.json();
    if (!data.ok) {
      console.error("Telegram API error:", data);
      return res.status(500).json({ error: "Failed to send notification", ok: false });
    }
    return res.status(200).json({ ok: true, sent: true });
  } catch (e) {
    console.error("Submit API error:", e);
    return res.status(500).json({ error: "Server error", ok: false });
  }
}
