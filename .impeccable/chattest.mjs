const VISITOR = 'test-' + Date.now()
async function say(text) {
  const r = await fetch('http://localhost:3000/api/chat', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug: 'sokha-beauty', visitor_id: VISITOR, name: 'ចន្ថា', text }),
  })
  const d = await r.json()
  console.log(`\n> ${text}`)
  if (d.error) { console.log(`  !! ${d.error}`); return d }
  console.log(`  moni: ${d.text || '(silent)'}`)
  if (d.tool_calls?.length) console.log(`  tools: ${d.tool_calls.map(c => c.tool).join(' -> ')}`)
  if (d.handed_over) console.log('  HANDED TO OWNER')
  return d
}
await say('សុំសួរ លាបសក់ថ្លៃប៉ុន្មាន?')
await say('ស្អែក មានពេលទំនេរទេ?')
const third = await say('យកម៉ោងដំបូងចុះ')
console.log('\n--- final tool calls ---')
console.log(JSON.stringify(third.tool_calls, null, 1)?.slice(0, 900))
