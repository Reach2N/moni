import puppeteer from 'puppeteer-core'
const CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT='/Users/mense/moni/.impeccable/review'
const b = await puppeteer.launch({executablePath:CHROME, headless:true, args:['--no-sandbox']})
async function shoot(name,w,h,dsf,act){
  const p = await b.newPage()
  await p.setViewport({width:w,height:h,deviceScaleFactor:dsf,isMobile:w<600,hasTouch:w<600})
  await p.goto('http://localhost:3000/app',{waitUntil:'networkidle0'})
  if(act) await act(p)
  await new Promise(r=>setTimeout(r,500))
  const m = await p.evaluate(()=>({iw:window.innerWidth, sw:document.documentElement.scrollWidth,
    over:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>window.innerWidth+1).length}))
  await p.screenshot({path:`${OUT}/${name}.png`, fullPage:true})
  console.log(`${name}: vw=${m.iw} scrollW=${m.sw} overflowing=${m.over}`)
  await p.close()
}
// the real product moment: paste the shop text and let Gemini parse it
const runParse = async (p)=>{
  // the CTA is live-and-guiding now: first press fills the example, second parses
  const cta = 'button.km.inline-flex'
  await p.click(cta)
  await new Promise(r=>setTimeout(r,250))
  await p.click(cta)
  await p.waitForSelector('#services-h',{timeout:90000})
}
await shoot('mobile',390,844,2)
await shoot('desktop',1440,900,1)
await shoot('desktop-parsed',1440,900,1,runParse)
await b.close()
