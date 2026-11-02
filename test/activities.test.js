import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ACTIVITIES, describedActivities } from '../src/services/activities.js'
import { screenJob, screenRole } from '../src/services/jobEngine.js'
import { screenBusinessActivity } from '../src/services/complianceEngine.js'

test('every activity has a ruling, evidence and the patterns it is read by', () => {
  for (const [id, a] of Object.entries(ACTIVITIES)) {
    assert.ok(a.label && a.summary && a.employer, id)
    assert.ok(['prohibited', 'differ'].includes(a.severity), id)
    assert.ok(a.evidence.length > 0, id)
    assert.ok(a.role?.length && a.text?.length, id)
  }
})

test('adult content and fortune-telling roles are not permissible', () => {
  assert.equal(screenJob({ title: 'Webcam Model', text: '' }).verdict, 'NOT_PERMISSIBLE')
  assert.equal(screenJob({ title: 'Adult Content Editor', text: '' }).verdict, 'NOT_PERMISSIBLE')
  assert.equal(screenJob({ title: 'Tarot Reader', text: '' }).verdict, 'NOT_PERMISSIBLE')
})

test('no role is permissible where the business itself is adult content', () => {
  const text = 'We run adult content sites. Our adult content reaches millions. Adult entertainment is our business.'
  const job = screenJob({ title: 'Payments Engineer', text })
  assert.equal(job.verdict, 'NOT_PERMISSIBLE')
  assert.deepEqual(job.employerCore, ['adult'])
})

test('weapons are where scholars differ; indiscriminate weapons are not', () => {
  assert.deepEqual(screenRole('Missile Systems Engineer'), ['weapons'])
  assert.equal(screenJob({ title: 'Gunsmith', text: '' }).verdict, 'DIFFER')
  assert.deepEqual(screenRole('Cluster Munitions Test Engineer'), ['indiscriminate'])
  assert.equal(screenJob({ title: 'Cluster Munitions Test Engineer', text: '' }).verdict, 'NOT_PERMISSIBLE')
  const job = screenJob({ title: 'Accountant', text: 'We maintain the nuclear weapons stockpile.' })
  assert.equal(job.verdict, 'NOT_PERMISSIBLE')
})

test('an aerospace and defence employer is flagged for weapons, not condemned', () => {
  const job = screenJob({ title: 'HR Coordinator', text: 'Join our people team.', industry: 'Aerospace & Defense', businessStatus: 'CAUTION' })
  assert.equal(job.verdict, 'CAUTION')
  assert.deepEqual(job.employerMentions, ['weapons'])
})

test('music and speculative trading roles are caught', () => {
  assert.equal(screenJob({ title: 'Session Musician', text: '' }).verdict, 'DIFFER')
  assert.equal(screenJob({ title: 'CFD Trader', text: '' }).verdict, 'NOT_PERMISSIBLE')
  assert.equal(screenJob({ title: 'Nightclub Supervisor', text: '' }).verdict, 'NOT_PERMISSIBLE')
})

test('a listed employer’s description is read for mentions', () => {
  const job = screenJob({ title: 'Analyst', text: 'Analyse data.', industry: 'Packaged Foods', businessStatus: 'PASS', description: 'Hormel makes pork and turkey products.' })
  assert.deepEqual(job.employerMentions, ['pork'])
  assert.equal(job.verdict, 'CAUTION')
})

test('descriptions name products, not passing words', () => {
  assert.deepEqual(describedActivities('Smith & Wesson makes handguns, rifles and ammunition.'), ['weapons'])
  assert.deepEqual(describedActivities('Sells beer, wine and spirits alongside groceries.'), ['alcohol'])
  assert.deepEqual(describedActivities('A video gaming company with team spirit, defending its market.'), [])
})

test('the stock screen sends a described restricted business to review', () => {
  const profile = { name: 'Ammo Co', sector: 'Consumer Cyclical', industry: 'Leisure', description: 'Ammo Co manufactures ammunition and firearms.' }
  const r = screenBusinessActivity(profile)
  assert.equal(r.status, 'CAUTION')
  assert.deepEqual(r.activities, ['weapons'])
  assert.equal(screenBusinessActivity({ ...profile, industry: 'Software - Application', description: 'Builds apps.' }).status, 'PASS')
})

test('a defence employer whose posting and description both centre on weapons is a weapons business', () => {
  const job = screenJob({
    title: 'Finance Analyst',
    text: 'Our missiles business builds missiles and weapons systems.',
    industry: 'Aerospace & Defense',
    businessStatus: 'CAUTION',
    description: 'Segments: Aeronautics; Missiles and Fire Control.',
  })
  assert.deepEqual(job.employerCore, ['weapons'])
  assert.equal(job.verdict, 'DIFFER')
})
