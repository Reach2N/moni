/**
 * Telegram, through grammY's `Api` only.
 *
 * ARCHITECTURE.md adopts grammY for its typed update objects and its client.
 * What it does NOT adopt is grammY's middleware: `new Api(token)` is a typed
 * HTTP client with no bot to initialise, so a multi-tenant webhook can serve any
 * number of shops without a `getMe` round trip per message, and the agent loop
 * stays outside grammY entirely so Messenger reuses it unchanged in Phase 6.
 *
 * The two pure functions here (token shape, update extraction) carry no network
 * and are proved in `db/test.mjs`.
 */
import { Api, GrammyError } from 'grammy'
import type { Update } from 'grammy/types'

export class ChannelError extends Error {
  readonly status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'ChannelError'
    this.status = status
  }
}

/** Telegram truncates at 4096 characters and errors past it. */
export const TELEGRAM_MAX_MESSAGE = 4_096

/**
 * BotFather hands back "<bot id>:<35 character secret>". Checking the shape
 * before a network call turns the commonest paste mistake, a trailing space or
 * half a token, into a clear message instead of a Telegram error code.
 */
export function looksLikeBotToken(token: string): boolean {
  return /^\d{5,}:[A-Za-z0-9_-]{30,}$/.test(token.trim())
}

export type IncomingMessage = {
  updateId: number
  chatId: number
  fromId: number
  /** Best available display name. Telegram may give a username, a first name, or neither. */
  displayName: string
  text: string
}

/**
 * The one shape this product acts on: a human sending text to the bot.
 *
 * Everything else (edits, reactions, joins, photos, stickers) is logged as a
 * webhook event and answered with 200. Returning null is not an error: it is
 * the difference between "we ignored this" and "Telegram should retry".
 */
export function extractIncoming(update: Update): IncomingMessage | null {
  const message = update.message
  if (!message?.text) return null
  if (!message.from || message.from.is_bot) return null
  const name =
    message.from.username
    ?? [message.from.first_name, message.from.last_name].filter(Boolean).join(' ').trim()
  return {
    updateId: update.update_id,
    chatId: message.chat.id,
    fromId: message.from.id,
    displayName: name || `telegram ${message.from.id}`,
    text: message.text,
  }
}

function api(token: string) {
  return new Api(token)
}

function channelError(cause: unknown, fallback: string): ChannelError {
  if (cause instanceof GrammyError) {
    // 401 is a bad token, which is the owner's problem to fix, not ours.
    return new ChannelError(cause.error_code === 401 ? 400 : 502, cause.description)
  }
  return new ChannelError(502, fallback)
}

/** Proves the token works and tells us who the bot is, before anything is stored. */
export async function verifyBotToken(token: string) {
  if (!looksLikeBotToken(token)) {
    throw new ChannelError(400, 'that does not look like a BotFather token')
  }
  try {
    const me = await api(token).getMe()
    return {
      externalId: String(me.id),
      username: me.username ?? null,
      displayName: me.username ? `@${me.username}` : (me.first_name || 'Telegram bot'),
    }
  } catch (cause) {
    throw channelError(cause, 'Telegram would not accept that token')
  }
}

/**
 * `secret_token` is Telegram's own mechanism: it sends the value back in an
 * X-Telegram-Bot-Api-Secret-Token header on every delivery, which is what lets
 * the webhook refuse a forged call. The connection id in the path says WHICH
 * shop; the header proves the caller is Telegram.
 */
export async function connectWebhook(token: string, url: string, secret: string) {
  try {
    await api(token).setWebhook(url, {
      secret_token: secret,
      allowed_updates: ['message'],
      drop_pending_updates: true,
    })
  } catch (cause) {
    throw channelError(cause, 'the Telegram webhook could not be set')
  }
}

export async function disconnectWebhook(token: string) {
  try {
    await api(token).deleteWebhook({ drop_pending_updates: true })
  } catch (cause) {
    throw channelError(cause, 'the Telegram webhook could not be removed')
  }
}

export async function sendReply(token: string, chatId: number, text: string) {
  const body = text.length > TELEGRAM_MAX_MESSAGE ? `${text.slice(0, TELEGRAM_MAX_MESSAGE - 1)}…` : text
  try {
    await api(token).sendMessage(chatId, body)
  } catch (cause) {
    throw channelError(cause, 'the reply could not be delivered to Telegram')
  }
}
