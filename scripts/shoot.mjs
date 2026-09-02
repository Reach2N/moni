import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
// Resolved from this file, never hardcoded to one machine's home directory.
// Output lands in ./screenshots/, which is gitignored.
const OUT=new URL('../screenshots/',import.meta.url).pathname
const BASE_URL=process.env.MONI_CAPTURE_URL ?? 'http://localhost:3000'
const b = await puppeteer.launch({executablePath:CHROME, headless:true, args:['--no-sandbox']})

// Headless Chrome reports whatever the host is set to, which is how a set of
// "the landing page is dark" screenshots got taken of a page that is white for
// half its visitors. Every capture now states its scheme instead of inheriting
// one. `scheme:null` means "do not emulate", for the /app captures that are
// light-locked anyway.
async function emulate(p,{scheme='light',motion=null}={}){
  const features=[]
  if(scheme) features.push({name:'prefers-color-scheme',value:scheme})
  if(motion) features.push({name:'prefers-reduced-motion',value:motion})
  if(features.length) await p.emulateMediaFeatures(features)
}

// Scroll the whole page before a fullPage shot.
//
// Every reveal on the public site is scroll triggered and fires once. A
// fullPage screenshot does NOT scroll: it stitches, so a trigger that never saw
// the viewport pass it never ran, and the section photographs in its start
// state. When those reveals were motion's whileInView that meant opacity 0, and
// the 29 August capture came out blank below the hero with 18 elements stuck
// invisible. Walking the page first puts every trigger in its settled state,
// which is the state a reader actually sees.
async function scrollThrough(p){
  await p.evaluate(async ()=>{
    const step = Math.round(window.innerHeight * 0.8)
    const frame = () => new Promise(r=>requestAnimationFrame(()=>r()))
    for(let y=0; y<document.body.scrollHeight; y+=step){
      window.scrollTo(0,y)
      await frame(); await frame()
    }
    window.scrollTo(0,document.body.scrollHeight)
    await new Promise(r=>setTimeout(r,300))
    window.scrollTo(0,0)
    await new Promise(r=>setTimeout(r,300))
  })
  // The walk STARTS the tweens; it does not finish them. The counting figure in
  // the pricing band runs for 1.6s, and the first capture caught it at 88 on the
  // way to 100, which reads as a wrong number rather than as an animation.
  await p.evaluate(()=>new Promise(resolve=>{
    const done=()=>resolve()
    const gsapGlobal=window.gsap
    if(!gsapGlobal) return setTimeout(done,1600)
    const check=()=>{
      const busy=gsapGlobal.globalTimeline.getChildren(true,true,true).some(t=>t.isActive())
      if(busy){ setTimeout(check,120) } else { done() }
    }
    setTimeout(check,120)
    setTimeout(done,4000)
  }))
}

async function shoot(name,w,h,dsf,act,viewportOnly,route='/app',settleMs=500,media={},requireOk=false){
  const p = await b.newPage()
  await p.setViewport({width:w,height:h,deviceScaleFactor:dsf,isMobile:w<600,hasTouch:w<600})
  await emulate(p,media)
  const errors=[]
  p.on('pageerror',e=>errors.push(e.message.split('\n')[0].slice(0,160)))
  const res = await p.goto(`${BASE_URL}${route}`,{waitUntil:'networkidle0'})
  if(act) await act(p)
  await new Promise(r=>setTimeout(r,settleMs))
  // A viewport-only shot is deliberately NOT walked: its whole job is to show
  // the first screen exactly as it arrives, entrance animations included.
  if(!viewportOnly) await scrollThrough(p)
  const m = await p.evaluate(()=>({iw:window.innerWidth, sw:document.documentElement.scrollWidth,
    over:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).length,
    hidden:[...document.querySelectorAll('body *')].filter(e=>getComputedStyle(e).opacity==='0').length}))
  await p.screenshot({path:`${OUT}/${name}.png`, fullPage:!viewportOnly})
  const status=res?.status()
  // A 404 or 500 still screenshots cleanly: the failure is in what page loaded,
  // not in the capture. Every call records the status in the log line below;
  // whether an unresolved route (a slug the seed step never published, a
  // stale one that got deleted) actually fails the script is the `requireOk`
  // flag's decision, made per call below.
  const flags=[status&&status!==200?`status=${status}`:null, m.over?`overflowing=${m.over}`:null, m.hidden?`invisible=${m.hidden}`:null, errors.length?`errors=${errors.length}`:null].filter(Boolean)
  console.log(`${name}: ${route} ${w}x${h} scrollW=${m.sw} ${flags.join(' ')||'clean'}`)
  if(status&&status!==200) console.log(`   ! ${route} did not resolve to a live page (HTTP ${status})`)
  if(errors.length) console.log(`   ! ${errors.slice(0,3).join(' | ')}`)
  await p.close()
  // requireOk is the difference between a note and a guardrail. /app legitimately
  // redirects a signed-out visitor to sign-in, so a blanket non-200 check across
  // every route would break that existing, correct capture. Only a route that MUST
  // be a real published page sets this, which today is only the storefront: a 404
  // there means the seed step never published the slug, or the shop was deleted,
  // and a warning line nobody but a human reads is not what stops that from
  // shipping as a silent screenshot of an error page.
  if(requireOk && status!==200){
    console.error(`FAILED: ${route} returned HTTP ${status}, expected 200. This capture must be a real published page.`)
    await b.close()
    process.exit(1)
  }
  return status
}

// the real product moment: paste the shop text and let Gemini parse it
const runParse = async (p)=>{
  // scope to the composer: several buttons now share the utility classes, so this
  // finds the composer's own CTA by the section that owns the #shop textarea
  const press = () => p.evaluate(() => {
    const box = document.querySelector('#shop')
    const section = box?.closest('section')
    const btn = [...(section?.querySelectorAll('button') ?? [])].find(b => b.className.includes('inline-flex'))
    btn?.click()
  })
  await press(); await new Promise(r=>setTimeout(r,250))
  await press()
  await p.waitForSelector('#services-h',{timeout:90000})
}

// ── Phase 1: the public surface. Both widths, both languages, BOTH SCHEMES.
const LIGHT={scheme:'light'}, DARK={scheme:'dark'}
await shoot('landing-desktop',      1440,900,1,undefined,false,'/',       1800,LIGHT)
await shoot('landing-desktop-dark', 1440,900,1,undefined,false,'/',       1800,DARK)
await shoot('landing-desktop-en',   1440,900,1,undefined,false,'/?lang=en',1800,LIGHT)
await shoot('landing-mobile',        390,844,2,undefined,false,'/',       1800,LIGHT)
await shoot('landing-mobile-dark',   390,844,2,undefined,false,'/',       1800,DARK)
await shoot('landing-mobile-viewport',390,844,2,undefined,true,'/',       1800,LIGHT)
await shoot('landing-desktop-viewport',1440,900,1,undefined,true,'/',     1800,LIGHT)
// Proof that the page is complete with every animation refused. If anything is
// missing here, a reveal is hiding content rather than decorating its arrival.
await shoot('landing-desktop-still',1440,900,1,undefined,false,'/',1200,{scheme:'light',motion:'reduce'})

// ── Phase 1b: a published storefront, the public /s/[slug] route.
//
// No route list here ever named /s/[slug], so every seeded-storefront check in
// this phase (contrast, tokens, the photoless tile) was verified with one-off
// scripts instead of the project's own tool. `sansethireach` is the one shop
// published in the live database as of this phase; override with
// MONI_CAPTURE_SLUG for a different shop. This is the one route in the list
// that MUST resolve to a real published page, so it is the one call passing
// `requireOk`: a slug that is not actually published exits the whole script
// non-zero with the HTTP status named, rather than quietly saving a screenshot
// of Next's 404 page and calling the capture done.
const STOREFRONT_SLUG = process.env.MONI_CAPTURE_SLUG ?? 'sansethireach'
await shoot('storefront-desktop', 1440,900,1,undefined,false,`/s/${STOREFRONT_SLUG}`,1200,LIGHT,true)
await shoot('storefront-mobile',   390,844,2,undefined,false,`/s/${STOREFRONT_SLUG}`,1200,LIGHT,true)

// ── Phase 2: the dashboard. Light locked, so no scheme emulation.
await shoot('mobile',390,844,2,undefined,false,'/app',500,{scheme:null})
// fullPage renders position:fixed at its first-viewport spot, so the pinned nav
// is only ever truthful in a viewport-only capture. CLAUDE.md, paid for once.
await shoot('mobile-viewport',390,844,2,undefined,true,'/app',500,{scheme:null})
await shoot('desktop',1440,900,1,undefined,false,'/app',500,{scheme:null})
// desktop-parsed is opt-in: it spends a live model call, and the free tier is
// 20 requests per minute. Run it deliberately, not on every capture.
if (process.argv.includes('--parsed')) await shoot('desktop-parsed',1440,900,1,runParse,false,'/app',500,{scheme:null})
await b.close()
