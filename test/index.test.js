import assert from 'node:assert/strict'
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

import { apply } from '../index.js'

const packageRoot = dirname(fileURLToPath(new URL('../index.js', import.meta.url)))

function makeContext() {
  const registered = []
  const sections = []
  const warnings = []
  return {
    ctx: {
      skills: {
        register(skill) {
          registered.push(skill)
          return () => {}
        },
      },
      systemPrompt: {
        section(section) {
          sections.push(section)
          return () => {}
        },
      },
      logger: {
        warn(message) {
          warnings.push(message)
        },
      },
    },
    registered,
    sections,
    warnings,
  }
}

function readCurrentScalar(frontmatter, key) {
  const match = frontmatter.match(new RegExp(`^${key}:\\s*(.*)$`, 'm'))
  assert.notEqual(match, null, `${key} should exist in source frontmatter`)
  const value = match[1].trim()
  if (value.startsWith('"')) return JSON.parse(value)
  if (value.startsWith("'")) return value.slice(1, -1).replace(/''/g, "'")
  return value
}

async function writeSkill(root, directory, frontmatter, body = '# Fixture\n\nInstructions.') {
  const skillDir = join(root, 'skills', directory)
  await mkdir(skillDir, { recursive: true })
  await writeFile(join(skillDir, 'SKILL.md'), `---\n${frontmatter}\n---\n${body}\n`)
}

test('registers all vendored skills with source-accurate metadata', async () => {
  const state = makeContext()
  apply(state.ctx)

  const entries = (await readdir(join(packageRoot, 'skills'), { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .sort((left, right) => left.name.localeCompare(right.name))

  assert.equal(entries.length, 14)
  assert.equal(state.registered.length, 14)
  assert.deepEqual(state.warnings, [])
  assert.equal(state.sections.length, 1)
  assert.match(state.sections[0].text, /`interrupt_agent`/)

  for (const entry of entries) {
    const raw = await readFile(join(packageRoot, 'skills', entry.name, 'SKILL.md'), 'utf8')
    const frontmatter = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    assert.notEqual(frontmatter, null)

    const expectedName = readCurrentScalar(frontmatter[1], 'name')
    const expectedDescription = readCurrentScalar(frontmatter[1], 'description')
    const actual = state.registered.find(skill => skill.name === expectedName)
    assert.notEqual(actual, undefined, `${expectedName} should be registered`)
    assert.equal(actual.description, expectedDescription)
    assert.equal(actual.path, join(packageRoot, 'skills', entry.name, 'SKILL.md'))
    assert.equal(actual.resourceBase.path, join(packageRoot, 'skills', entry.name))
  }
})

test('parses folded and literal YAML block scalars', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'dsh-superpowers-parser-'))
  try {
    await copyFile(join(packageRoot, 'index.js'), join(fixtureRoot, 'index.mjs'))
    await writeSkill(fixtureRoot, 'folded', [
      'name: folded',
      'description: >-',
      '  Use when a future release',
      '  wraps its description.',
      '',
      '  Preserve paragraphs.',
      'whenToUse: >-',
      '  During metadata',
      '  compatibility tests.',
    ].join('\n'))
    await writeSkill(fixtureRoot, 'literal', [
      'name: literal',
      'description: |-',
      '  first line',
      '  second line',
    ].join('\n'))
    await writeSkill(fixtureRoot, 'indented', [
      'name: indented',
      'description: >-',
      '  first',
      '    indented',
      '  last',
    ].join('\n'))

    const fixture = await import(`${pathToFileURL(join(fixtureRoot, 'index.mjs')).href}?fixture=${Date.now()}`)
    const state = makeContext()
    fixture.apply(state.ctx, { bootstrap: false })

    assert.deepEqual(state.warnings, [])
    assert.equal(state.registered.find(skill => skill.name === 'folded').description,
      'Use when a future release wraps its description.\nPreserve paragraphs.')
    assert.equal(state.registered.find(skill => skill.name === 'folded').whenToUse,
      'During metadata compatibility tests.')
    assert.equal(state.registered.find(skill => skill.name === 'literal').description,
      'first line\nsecond line')
    assert.equal(state.registered.find(skill => skill.name === 'indented').description,
      'first\n  indented\nlast')
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

test('warns and skips damaged or duplicate skill metadata', async () => {
  const fixtureRoot = await mkdtemp(join(tmpdir(), 'dsh-superpowers-errors-'))
  try {
    await copyFile(join(packageRoot, 'index.js'), join(fixtureRoot, 'index.mjs'))
    await writeSkill(fixtureRoot, 'a-valid', 'name: duplicate\ndescription: first')
    await writeSkill(fixtureRoot, 'b-duplicate', 'name: duplicate\ndescription: second')
    await writeSkill(fixtureRoot, 'missing-description', 'name: missing-description')
    await writeSkill(fixtureRoot, 'empty-body', 'name: empty-body\ndescription: empty', '')

    const fixture = await import(`${pathToFileURL(join(fixtureRoot, 'index.mjs')).href}?fixture=${Date.now()}`)
    const state = makeContext()
    fixture.apply(state.ctx, { bootstrap: false })

    assert.deepEqual(state.registered.map(skill => skill.name), ['duplicate'])
    assert.equal(state.warnings.length, 3)
    assert.ok(state.warnings.some(message => message.includes('duplicates skill name "duplicate"')))
    assert.ok(state.warnings.some(message => message.includes('requires non-empty name and description')))
    assert.ok(state.warnings.some(message => message.includes('empty instruction body')))
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true })
  }
})

test('does no filesystem or registry work when both features are disabled', () => {
  assert.doesNotThrow(() => apply({}, { skills: false, bootstrap: false }))
})
