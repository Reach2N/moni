'use client'

/**
 * The claim the whole page rests on, shown rather than described: a customer
 * writes, and Moni answers from the shop's real data.
 *
 * The thread alone would only prove that something replied. What makes it read
 * as an agent is the run of work beside it: read the price list, check the
 * calendar, hold the slot, send a KHQR. Those are the actual tool calls in
 * CUSTOMER_TOOLS, in the order the agent takes them, which is why this is the
 * hero visual instead of a screenshot of a dashboard.
 *
 * Beautiful UI owns the conversation and task-row interactions. This wrapper
 * only supplies Moni's typed example data and the shared scroll entrance.
 */

import ChatComposer, { type ChatMessage } from '@/components/primitives/ChatComposer.tsx'
import TaskRows, { type TaskRow } from '@/components/primitives/TaskRows.tsx'
import type { Copy } from '@/lib/marketing/copy.ts'

export function AgentConversation({ copy }: { copy: Copy }) {
  /* Beautiful UI's complete Chat source owns the conversation rhythm. The
     homepage only supplies Moni's typed, illustrative turn, so the source
     component can remain reusable and the page never invents a chat shell. */
  const messages: ChatMessage[] = [
    {
      label: copy.proof.assistantLabel,
      sub: '',
      time: '',
      body: copy.proof.assistantMessage,
    },
    {
      label: copy.agent.traceLabel,
      sub: '',
      time: '',
      body: copy.agent.replyNote,
    },
  ]

  /* The source Task Rows pattern makes each tool call inspectable. All four
     rows are settled in the showcase so the complete run is visible without
     asking a visitor to wait for a hidden state. */
  const taskRows: TaskRow[] = copy.agent.trace.map((step, index) => ({
    key: `moni-step-${index}`,
    label: step,
    amount: copy.proof.bookingStatus,
    status: 'done',
    details: [
      { label: copy.agent.traceLabel, meta: copy.demo.example },
      { label: copy.proof.bookingLabel, meta: copy.proof.bookingStatus },
    ],
  }))

  return (
    <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2 lg:items-start">
      {/* Beautiful UI Chat, configured with Moni's customer turn. */}
      <div className="min-w-0">
        <ChatComposer
          messages={messages}
          suggestions={[copy.proof.customerLabel, copy.proof.assistantLabel]}
          labels={{
            initialPrompt: copy.proof.customerMessage,
            runAction: copy.agent.runAction,
          }}
          className="mx-auto max-w-none"
        />
      </div>

      {/* Beautiful UI Task Rows, configured as Moni's complete tool run. */}
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-label-3">
          {copy.agent.traceLabel}
        </p>

        <TaskRows
          variant="List"
          rows={taskRows}
          labels={{ completed: copy.proof.bookingStatus, failed: copy.proof.handoff }}
          className="mt-4 max-w-none"
        />
      </div>
    </div>
  )
}
