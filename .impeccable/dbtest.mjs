import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(
  fs.readFileSync('.env.local','utf8').split('\n')
    .filter(l=>l.includes('=') && !l.trimStart().startsWith('#'))
    .map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1)]})
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const { data: b, error: e1 } = await db.from('businesses').select('slug,name,business_type,default_currency').order('slug')
if (e1) { console.log('ERROR', e1.message); process.exit(1) }
console.log('businesses:'); b.forEach(r=>console.log('  ', r.slug, '|', r.name, '|', r.business_type, r.default_currency))
const { data: v } = await db.from('v_bookings_agent').select('code,customer_name,service_name,price_minor,paid_minor,balance_minor,status').order('starts_at')
console.log('v_bookings_agent:'); v.forEach(r=>console.log('  ', r.code, r.customer_name, '|', r.service_name, '|', r.price_minor, 'paid', r.paid_minor, 'bal', r.balance_minor, '|', r.status))
const { data: u } = await db.from('v_month_usage').select('*')
console.log('v_month_usage:', JSON.stringify(u))
