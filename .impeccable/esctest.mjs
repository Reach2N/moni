const V = 'esc-' + Date.now()
async function say(text) {
  const r = await fetch('http://localhost:3000/api/chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body: JSON.stringify({ slug:'sokha-beauty', visitor_id:V, name:'ដារ៉ា', text })
  })
  const d = await r.json()
  console.log(`> ${text}`)
  console.log(`  moni: ${d.text || '(silent)'}`)
  if (d.tool_calls?.length) console.log(`  tools: ${d.tool_calls.map(c=>c.tool).join(' -> ')}`)
  if (d.handed_over) console.log('  >>> HANDED TO OWNER')
  return d
}
await say('សក់អ៊ុត 40000 បានទេ? ខ្ញុំមកជាមួយបងស្រី')
await say('សូម​មេត្តា​ បញ្ចុះ​តម្លៃ​បន្តិច')
