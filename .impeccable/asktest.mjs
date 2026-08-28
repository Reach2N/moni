const hist = []
async function ask(text, slug = 'sokha-beauty') {
  const r = await fetch('http://localhost:3000/api/ask', {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ slug, text, history: hist }),
  })
  const d = await r.json()
  console.log(`\n\x1b[1m> ${text}\x1b[0m`)
  if (d.error) { console.log(`  !! ${d.error}`); return }
  if (d.steps?.length) d.steps.forEach(s => console.log(`  [${s.tool}] ${JSON.stringify(s.args).slice(0,90)}`))
  console.log(`  moni: ${(d.text||'').replace(/\n/g,'\n        ')}`)
  hist.push({ role: 'user', content: text }, { role: 'assistant', content: d.text ?? '' })
}
console.log('════ PLAN ════')
await ask('ថ្ងៃនេះមានអ្វីខ្លះ?')
await ask('អ្នកណាជំពាក់លុយ?')
console.log('\n════ ORGANIZE ════')
await ask('ដំឡើងតម្លៃលាបសក់ ៥០០០៛')
console.log('\n════ OPERATE ════')
await ask('MN7Q1A បានមកហើយ ហើយបានបង់លុយសុទ្ធ ៣០០០០៛')
