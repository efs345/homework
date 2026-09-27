export async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  if (!chatId) throw new Error("No Telegram recipient linked.");

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data?.description || "Telegram delivery failed.");
  }
  return data;
}

export async function setTelegramWebhook(baseUrl) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing.");
  const url = `${baseUrl.replace(/\/$/, "")}/api/telegram/webhook`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = await res.json();
  if (!res.ok || !data.ok) throw new Error(data?.description || "Webhook setup failed.");
  return { url, data };
}
