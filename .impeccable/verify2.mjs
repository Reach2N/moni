import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=') && !l.trimStart().startsWith('#'))
  .map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1)]}))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const B='b0000000-0000-4000-8000-000000000001'

const { data: s } = await db.from('services').select('name,price_minor').eq('business_id',B).eq('active',true).order('sort_order')
console.log('services after the owner agent raised a price:')
s.forEach(r=>console.log(`   ${r.name.padEnd(14)} ${r.price_minor}`))

const { data: ev } = await db.from('events').select('action,actor_label,after').eq('business_id',B).like('action','owner.%').order('created_at',{ascending:false}).limit(4)
console.log('\nowner actions in the audit trail:')
ev.forEach(e=>console.log(`   ${e.action.padEnd(24)} ${JSON.stringify(e.after)}`))
