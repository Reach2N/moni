import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT='/Users/mense/moni/.impeccable/review'
const BASE_URL=process.env.MONI_CAPTURE_URL ?? 'http://localhost:3000'
const b = await puppeteer.launch({executablePath:CHROME, headless:true, args:['--no-sandbox']})
async function shoot(name,w,h,dsf,act,viewportOnly){
  const p = await b.newPage()
  await p.setViewport({width:w,height:h,deviceScaleFactor:dsf,isMobile:w<600,hasTouch:w<600})
  await p.goto(`${BASE_URL}/app`,{waitUntil:'networkidle0'})
  if(act) await act(p)
  await new Promise(r=>setTimeout(r,500))
  const m = await p.evaluate(()=>({iw:window.innerWidth, sw:document.documentElement.scrollWidth,
    over:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).length}))
  await p.screenshot({path:`${OUT}/${name}.png`, fullPage:!viewportOnly})
  console.log(`${name}: vw=${m.iw} scrollW=${m.sw} overflowing=${m.over}`)
  await p.close()
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
await shoot('mobile',390,844,2)
// fullPage renders position:fixed at its first-viewport spot, so the pinned nav
// is only ever truthful in a viewport-only capture. CLAUDE.md, paid for once.
await shoot('mobile-viewport',390,844,2,undefined,true)
await shoot('desktop',1440,900,1)
// desktop-parsed is opt-in: it spends a live model call, and the free tier is
// 20 requests per minute. Run it deliberately, not on every capture.
if (process.argv.includes('--parsed')) await shoot('desktop-parsed',1440,900,1,runParse)
await b.close()
