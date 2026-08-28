import { ownerTools } from '../src/lib/agent/owner-tools.ts'
import fs from 'node:fs'
for (const l of fs.readFileSync('.env.local','utf8').split('\n')) {
  if (l.includes('=') && !l.trimStart().startsWith('#')) { const i=l.indexOf('='); process.env[l.slice(0,i).trim()] = l.slice(i+1) }
}
const t = ownerTools('b0000000-0000-4000-8000-000000000001')
console.log('mark_booking MN7Q1A completed  ->', JSON.stringify(await t.mark_booking.execute({ code:'MN7Q1A', status:'completed' })))
console.log('record_manual_payment 30000    ->', JSON.stringify(await t.record_manual_payment.execute({ code:'MN7Q1A', amount_minor:30000, method:'cash' })))
const plan = await t.get_day_plan.execute({ date: null })
console.log('get_day_plan still_to_collect  ->', plan.still_to_collect, '| gaps:', plan.idle_gaps.length)
const perf = await t.get_service_performance.execute({})
console.log('get_service_performance top    ->', JSON.stringify(perf.services[0]))
