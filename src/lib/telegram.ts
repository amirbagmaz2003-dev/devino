import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Minimal Telegram Bot API client (sendMessage / getUpdates). The token is
 * the TELEGRAM_BOT_TOKEN Worker secret; TELEGRAM_API_BASE exists only so
 * tests can point this at a local mock instead of api.telegram.org.
 */

const DEFAULT_API_BASE = "https://api.telegram.org";

async function botEndpoint(method: string): Promise<string | null> {
  const { env } = await getCloudflareContext({ async: true });
  if (!env.TELEGRAM_BOT_TOKEN) return null;
  const base = (env.TELEGRAM_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, "");
  return `${base}/bot${env.TELEGRAM_BOT_TOKEN}/${method}`;
}

export async function isTelegramBotConfigured(): Promise<boolean> {
  return (await botEndpoint("getMe")) !== null;
}

/** True when Telegram accepted the message. Never throws. */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<boolean> {
  try {
    const url = await botEndpoint("sendMessage");
    if (!url) {
      console.warn(
        "[telegram] TELEGRAM_BOT_TOKEN is not set — message not sent",
      );
      return false;
    }
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await response.json().catch(() => null)) as {
      ok?: boolean;
    } | null;
    if (!response.ok || !body?.ok) {
      console.error("[telegram] sendMessage failed", response.status, body);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[telegram] sendMessage failed", error);
    return false;
  }
}

interface TelegramUpdate {
  update_id: number;
  message?: { date: number; chat: { id: number; type: string } };
}

/**
 * Chat id of the most recent private message sent to the bot (the owner's
 * "/start"), or null if there is none / the bot isn't configured.
 */
export async function findLatestPrivateChatId(): Promise<string | null> {
  const url = await botEndpoint("getUpdates");
  if (!url) return null;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const body = (await response.json().catch(() => null)) as {
    ok?: boolean;
    result?: TelegramUpdate[];
  } | null;
  if (!response.ok || !body?.ok || !Array.isArray(body.result)) {
    throw new Error(`getUpdates failed (${response.status})`);
  }
  const latest = body.result
    .filter((update) => update.message?.chat.type === "private")
    .sort((a, b) => b.update_id - a.update_id)[0];
  return latest ? String(latest.message!.chat.id) : null;
}

/**
 * Runs `task` after the response is sent (ctx.waitUntil) so a slow or
 * failing Telegram call never delays or fails the visitor's request.
 */
export async function runInBackground(task: Promise<unknown>) {
  try {
    const { ctx } = await getCloudflareContext({ async: true });
    if (ctx?.waitUntil) {
      ctx.waitUntil(task);
      return;
    }
  } catch {
    // No Workers context (plain `next dev`): fall through.
  }
  void task;
}
