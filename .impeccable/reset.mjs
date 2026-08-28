import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
const env = Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=') && !l.trimStart().startsWith('#'))
  .map(l=>{const i=l.indexOf('=');return [l.slice(0,i).trim(),l.slice(i+1)]}))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
await db.from('services').update({price_minor:45000}).eq('id','50000000-0000-4000-8000-000000000002')
const { data } = await db.from('services').select('name,price_minor').eq('id','50000000-0000-4000-8000-000000000002').single()
console.log('reset:', data.name, data.price_minor)
