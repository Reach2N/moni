/**
 * Which links of the transcribe chain actually work on this account, right now?
 *
 *   npm run test:transcribe -- path/to/note.webm
 *
 * Answers the question no unit test can: is the CHAIN reachable with the keys
 * currently in .env.local. It walks src/lib/ai/models.ts's transcribe candidates
 * in order and prints, per link, a transcript or the exact provider error. Make
 * a real voice note with macOS `say` plus ffmpeg:
 *
 *   say -o /tmp/note.aiff "Haircut fifteen thousand riel, thirty minutes."
 *   ffmpeg -y -i /tmp/note.aiff -c:a libopus -b:a 24k /tmp/note.webm
 *
 * webm/opus is what MediaRecorder produces in the browser, so a pass here is
 * proof of the real path rather than of a synthetic ping.
 */
import { readFileSync } from 'node:fs'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

// load .env.local without a dependency
for (const line of readFileSync('/Users/mypc/moni/.env.local', 'utf8').split('\n')) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
}

const notePath = process.argv[2]
if (!notePath) {
  console.error('usage: npm run test:transcribe -- path/to/note.webm')
  process.exit(2)
}
const audio = new Uint8Array(readFileSync(notePath))
console.log(`voice note: ${audio.byteLength} bytes, audio/webm\n`)

const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
const google = key ? createGoogleGenerativeAI({ apiKey: key }) : null

// exactly the chain in src/lib/ai/models.ts, in order
const chain = [
  { ref: 'google/gemini-3.7-flash', how: 'Vercel AI Gateway', model: () => 'google/gemini-3.7-flash' },
  { ref: 'google:gemini-3.7-flash', how: 'direct Gemini key',  model: () => google?.('gemini-3.7-flash') },
  { ref: 'google:gemini-3.5-flash', how: 'direct Gemini key',  model: () => google?.('gemini-3.5-flash') },
]

for (const link of chain) {
  const model = link.model()
  if (!model) { console.log(`✗ ${link.ref}  (${link.how})\n    no key set\n`); continue }
  try {
    const t0 = Date.now()
    const { text } = await generateText({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Transcribe this voice note verbatim. Reply with the transcript only.' },
          { type: 'file', mediaType: 'audio/webm', data: audio },
        ],
      }],
    })
    console.log(`✓ ${link.ref}  (${link.how})  ${Date.now() - t0}ms`)
    console.log(`    "${text.trim().replace(/\s+/g, ' ').slice(0, 150)}"\n`)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`✗ ${link.ref}  (${link.how})`)
    console.log(`    ${msg.split('\n')[0].slice(0, 180)}\n`)
  }
}
