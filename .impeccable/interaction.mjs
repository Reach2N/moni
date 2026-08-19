import puppeteer from 'puppeteer-core'
const b = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true, args: ['--no-sandbox'],
})
const p = await b.newPage()
await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
await p.goto('http://localhost:3000/app', { waitUntil: 'networkidle0' })

const read = () => p.evaluate(() => {
  // NumberFlow injects a <style> inside itself, so read its accessible value not textContent
  const nf = document.querySelector('number-flow-react')
  return {
    takings: nf ? (nf.getAttribute('aria-label') || nf.innerText.replace(/\s+/g,' ').trim()) : 'not found',
    seals: [...document.querySelectorAll('button[aria-pressed]')].map(b => b.getAttribute('aria-pressed')).join(','),
  }
})

const before = await read()
// press the seal on the first waiting booking
const target = await p.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-pressed="false"]')].find(x => !x.disabled)
  if (!b) return null
  b.click()
  return b.getAttribute('aria-label')
})
await new Promise(r => setTimeout(r, 500))
const after = await read()

console.log('pressed:', target)
console.log('before :', JSON.stringify(before))
console.log('after  :', JSON.stringify(after))
console.log('takings moved:', before.takings !== after.takings)
console.log('aria state flipped:', before.seals !== after.seals)

// prefers-reduced-motion must not break the state change, only the animation
const p2 = await b.newPage()
await p2.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }])
await p2.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true })
await p2.goto('http://localhost:3000/app', { waitUntil: 'networkidle0' })
const rmOk = await p2.evaluate(() => {
  const b = [...document.querySelectorAll('button[aria-pressed="false"]')].find(x => !x.disabled)
  if (!b) return 'no target'
  b.click()
  return 'clicked'
})
await new Promise(r => setTimeout(r, 400))
console.log('reduced-motion click:', rmOk, '->', (await p2.evaluate(() => document.querySelectorAll('button[aria-pressed="true"]').length)), 'sealed')
await p.screenshot({ path: '/Users/mense/moni/.impeccable/seal-after-press.png', fullPage: false })
await b.close()
