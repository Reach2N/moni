// minimal JSON-RPC client for the Supabase MCP server over stdio
import { spawn } from 'node:child_process'
import { execSync } from 'node:child_process'

const token = execSync(`security find-generic-password -s 'Supabase CLI' -w`).toString().trim()
const child = spawn('npx', ['-y', '@supabase/mcp-server-supabase@latest', '--access-token', token], {
  stdio: ['pipe', 'pipe', 'pipe'],
})

let buf = ''
const pending = new Map()
child.stdout.on('data', (d) => {
  buf += d.toString()
  let i
  while ((i = buf.indexOf('\n')) >= 0) {
    const line = buf.slice(0, i).trim()
    buf = buf.slice(i + 1)
    if (!line) continue
    try {
      const msg = JSON.parse(line)
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) }
    } catch {}
  }
})

let id = 0
const call = (method, params) =>
  new Promise((res) => {
    const myId = ++id
    pending.set(myId, res)
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: myId, method, params }) + '\n')
  })

await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'moni', version: '1' } })
const [, , mode, arg] = process.argv

if (mode === 'tools') {
  const r = await call('tools/list', {})
  console.log(r.result.tools.map((t) => t.name).join('\n'))
} else if (mode === 'sql') {
  const sql = await import('node:fs').then((fs) => fs.readFileSync(arg, 'utf8'))
  const r = await call('tools/call', {
    name: 'execute_sql',
    arguments: { project_id: 'roorkzxyoyacychgrktt', query: sql },
  })
  const out = JSON.stringify(r.result ?? r.error)
  console.log(out.slice(0, 700))
}
child.kill()
process.exit(0)
