import { NextResponse } from 'next/server'
import { generateText, stepCountIs } from 'ai'
import { z } from 'zod'
import { db } from '@/lib/db.ts'
import { throwIfDbError } from '@/lib/db-result.ts'
import type { Json } from '@/lib/database.types.ts'
import { ownerTools } from '@/lib/agent/owner-tools.ts'
import { OWNER_SYSTEM, ownerContext } from '@/lib/agent/owner-prompt.ts'
import { costMicroUsd, withFallback } from '@/lib/ai/models.ts'
import { ApiRequestError, assertSameOriginBrowserPost, readJsonBody, validationPayload } from '@/lib/http/post.ts'
import { requireMemberApi } from '@/lib/auth/member.ts'

export const runtime = 'nodejs'
export const maxDuration = 60

const TurnSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(4_000),
  })
  .strict()

const AskBodySchema = z
  .object({
    text: z.string().trim().min(1).max(4_000),
    history: z.array(TurnSchema).max(16).optional().default([]),
  })
  .strict()

export async function POST(req: Request) {
  try {
    assertSameOriginBrowserPost(req)
    // The tenant comes from the Clerk session, never from the request. The old
    // `slug` field is gone rather than ignored, so a client that still sends one
    // fails loudly here instead of quietly addressing someone else's shop.
    const member = await requireMemberApi()
    const body = AskBodySchema.parse(await readJsonBody(req, 72_000))
    const business = { id: member.businessId, name: member.name }
    const messages = [...body.history, { role: 'user' as const, content: body.text }]

    const { result, ref } = await withFallback('chat', (model) =>
      generateText({
        model,
        system: `${OWNER_SYSTEM}\n\n${ownerContext(business.name)}`,
        messages,
        tools: ownerTools(business.id),
        stopWhen: stepCountIs(10),
        temperature: 0.2,
      }),
    )

    const steps: { tool: string; args: Json; result: Json }[] = JSON.parse(
      JSON.stringify(
        result.steps.flatMap((step) =>
          step.toolCalls.map((call, index) => ({
            tool: call.toolName,
            args: call.input,
            result: step.toolResults?.[index]?.output ?? null,
          })),
        ),
      ),
    )

    if (steps.length > 0) {
      const audit = await db.from('events').insert(
        steps.map((step) => ({
          business_id: business.id,
          actor: 'owner',
          actor_label: `owner via moni (${ref})`,
          action: `owner.${step.tool}`,
          after: step.args,
        })),
      )
      throwIfDbError('audit owner agent actions', audit.error)
    }

    const tokensIn = result.usage?.inputTokens ?? 0
    const tokensOut = result.usage?.outputTokens ?? 0
    return NextResponse.json({
      text: result.text,
      steps,
      model: ref,
      cost_micro_usd: costMicroUsd(ref, tokensIn, tokensOut),
    })
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(validationPayload(error), { status: 400 })
    }
    console.error('[ask]', error instanceof Error ? error.message : 'ask failed')
    return NextResponse.json({ error: 'Moni could not complete that request' }, { status: 502 })
  }
}
