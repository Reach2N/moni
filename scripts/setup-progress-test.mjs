/**
 * The setup spine tells an owner what is left to do, so its rules get asserted
 * rather than eyeballed. The states that matter most are the ones seed data can
 * never show: a shop on its first second, and a channel that connected and then
 * dropped.
 *
 *   node --experimental-strip-types scripts/setup-progress-test.mjs
 */
import assert from 'node:assert/strict'
import { deriveSetupProgress, setupComplete } from '../src/lib/queries/setup-progress.ts'

const failures = []
function check(name, run) {
  try {
    run()
    console.log(`  ok   ${name}`)
  } catch (error) {
    failures.push(name)
    console.log(`  FAIL ${name}\n       ${error.message.split('\n')[0]}`)
  }
}

/** A shop on its first second: signed in, nothing described, nothing wired. */
function input(overrides = {}) {
  return {
    hasDescription: false,
    hasCatalogue: false,
    serviceCount: 0,
    channels: [],
    hasFirstTransaction: false,
    ...overrides,
  }
}

const byKey = (steps) => Object.fromEntries(steps.map((s) => [s.key, s]))

check('a brand new shop shows four rows, all pending', () => {
  const steps = deriveSetupProgress(input())
  assert.equal(steps.length, 4)
  assert.deepEqual(steps.map((s) => s.key), ['describe', 'catalogue', 'channel', 'customer'])
  assert.ok(steps.every((s) => s.state === 'pending'))
})

check('a described shop marks only the first row done', () => {
  const steps = byKey(deriveSetupProgress(input({ hasDescription: true })))
  assert.equal(steps.describe.state, 'done')
  assert.equal(steps.catalogue.state, 'pending')
})

check('the catalogue row counts services in its amount', () => {
  const steps = byKey(deriveSetupProgress(input({ hasCatalogue: true, serviceCount: 5 })))
  assert.equal(steps.catalogue.state, 'done')
  assert.ok(steps.catalogue.amount.includes('៥'), 'service count renders in Khmer digits')
})

check('a connected telegram marks the channel row done', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'connected', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'done')
  assert.equal(steps.channel.error, null)
})

check('a channel that dropped is FAILED, not pending', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'error', lastError: 'webhook 401' }],
  })))
  assert.equal(steps.channel.state, 'failed')
  assert.equal(steps.channel.error, 'webhook 401')
})

check('a channel row with an error but no message still fails cleanly', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'error', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'failed')
  assert.equal(steps.channel.error, null)
})

check('a connected channel wins over a broken one on another channel', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [
      { channel: 'messenger', status: 'error', lastError: 'app review pending' },
      { channel: 'telegram', status: 'connected', lastError: null },
    ],
  })))
  assert.equal(steps.channel.state, 'done')
})

check('a channel still connecting is pending, not failed', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'connecting', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'pending')
})

check('a deliberately disconnected channel is pending, not failed', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'disconnected', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'pending')
})

check('an unrecognised status is pending, because red must mean broken', () => {
  const steps = byKey(deriveSetupProgress(input({
    channels: [{ channel: 'telegram', status: 'some_new_status', lastError: null }],
  })))
  assert.equal(steps.channel.state, 'pending')
})

check('every row carries a destination, because a row that leads nowhere is worse than no row', () => {
  for (const step of deriveSetupProgress(input())) {
    assert.ok(step.href.startsWith('/app'), `${step.key} has no destination`)
  }
})

check('no em dash reaches any label', () => {
  for (const step of deriveSetupProgress(input({ hasCatalogue: true, serviceCount: 3 }))) {
    assert.ok(!step.label.includes('—'), `${step.key} label has an em dash`)
    assert.ok(!step.amount.includes('—'), `${step.key} amount has an em dash`)
  }
})

check('setup is complete only when all four are done', () => {
  const partial = deriveSetupProgress(input({ hasDescription: true, hasCatalogue: true }))
  assert.equal(setupComplete(partial), false)
  const all = deriveSetupProgress(input({
    hasDescription: true,
    hasCatalogue: true,
    serviceCount: 2,
    channels: [{ channel: 'telegram', status: 'connected', lastError: null }],
    hasFirstTransaction: true,
  }))
  assert.equal(setupComplete(all), true)
})

console.log(`\n${failures.length === 0 ? '\x1b[32m' : '\x1b[31m'}${failures.length} failed\x1b[0m\n`)
process.exit(failures.length === 0 ? 0 : 1)
