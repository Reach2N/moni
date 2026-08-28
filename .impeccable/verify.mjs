import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=') && !l.trimStart().startsWith('#'))
  .map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1)]}))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const fmt = (s) => new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Phnom_Penh'}).format(new Date(s))

const { data: bk } = await db.from('v_bookings_agent')
  .select('code,customer_name,service_name,resource_name,status,starts_at,price_minor,created_by')
  .eq('business_id','b0000000-0000-4000-8000-000000000001').order('starts_at')
console.log('bookings now in the live database:')
bk.forEach(r=>console.log(`  ${r.code}  ${fmt(r.starts_at)}  ${r.customer_name} | ${r.service_name} | ${r.resource_name} | ${r.status} | ${r.price_minor} | by ${r.created_by}`))

const { data: conv } = await db.from('conversations')
  .select('status,needs_owner_reason,channel,customers(display_name)')
  .eq('business_id','b0000000-0000-4000-8000-000000000001')
console.log('\nconversations:')
conv.forEach(c=>console.log(`  ${c.customers?.display_name ?? '?'} (${c.channel}) -> ${c.status}${c.needs_owner_reason? ' :: '+c.needs_owner_reason : ''}`))

const { data: ev } = await db.from('events').select('actor_label,action,after,created_at')
  .eq('business_id','b0000000-0000-4000-8000-000000000001').order('created_at',{ascending:false}).limit(5)
console.log('\naudit trail, newest first:')
ev.forEach(e=>console.log(`  ${e.action.padEnd(18)} ${e.actor_label ?? ''} ${JSON.stringify(e.after)}`))

const { data: msg } = await db.from('messages').select('role,body,tool_calls,cost_micro_usd')
  .eq('business_id','b0000000-0000-4000-8000-000000000001').not('cost_micro_usd','is',null)
const total = msg.reduce((n,m)=>n+(m.cost_micro_usd??0),0)
console.log(`\nAI messages: ${msg.length}, total cost ${(total/1e6).toFixed(4)} USD`)
