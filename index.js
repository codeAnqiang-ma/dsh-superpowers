/**
 * Superpowers for DeepSeek Harness.
 *
 * Brings the Superpowers software-development methodology (obra/superpowers) to
 * dsh: the bundled skills are registered as runtime skills on `ctx.skills`, and
 * the `using-superpowers` bootstrap is registered as a prompt section so it is
 * present from the first request and survives context compaction.
 *
 * The plugin imports nothing but Node builtins. A third-party plugin cannot
 * rely on `@deepseek-ai/*` packages resolving from its own directory — they are
 * nested inside the dsh installation — so both registries are reached through
 * `ctx` alone.
 *
 * @module dsh-plugin-superpowers
 */

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'superpowers'

/** The prompt and skill registries this plugin registers into. */
export const inject = ['systemPrompt', 'skills']

const packageRoot = dirname(fileURLToPath(import.meta.url))
const skillsDir = resolve(packageRoot, 'skills')
const BOOTSTRAP_SKILL = 'using-superpowers'

/**
 * Prompt order of the bootstrap section: after the deployment persona (0) and
 * before tool guidance (100–199), so the methodology frames the tools the model
 * is about to read about.
 */
const DEFAULT_ORDER = 50

/** Plugin configuration defaults. */
const DEFAULTS = {
  skills: true,
  bootstrap: true,
  toolMapping: true,
  order: DEFAULT_ORDER,
}

/**
 * Split a `SKILL.md` into its frontmatter block and body.
 * @param content - the raw file text.
 * @returns the frontmatter text (empty when absent) and the trimmed body.
 */
function splitFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/)
  if (match === null) return { frontmatter: '', body: content.trim() }
  return { frontmatter: match[1], body: match[2].trim() }
}

/**
 * Read the scalar frontmatter keys a Superpowers skill declares. The upstream
 * files use one `key: value` line per key with optional quotes; anything more
 * elaborate is left to the harness's own filesystem provider.
 * @param frontmatter - the frontmatter text.
 * @returns the parsed string values by key.
 */
function parseFrontmatter(frontmatter) {
  const fields = {}
  for (const line of frontmatter.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/)
    if (match === null) continue
    let value = match[2].trim()
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1)
    }
    if (value !== '') fields[match[1]] = value
  }
  return fields
}

/**
 * Load every bundled skill.
 * @returns one entry per readable skill directory.
 */
function loadBundledSkills() {
  const skills = []
  let entries
  try {
    entries = readdirSync(skillsDir, { withFileTypes: true })
  } catch {
    return skills
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const skillDir = join(skillsDir, entry.name)
    const skillPath = join(skillDir, 'SKILL.md')
    let raw
    try {
      raw = readFileSync(skillPath, 'utf8')
    } catch {
      continue
    }

    const { frontmatter, body } = splitFrontmatter(raw)
    const fields = parseFrontmatter(frontmatter)
    const skillName = fields.name ?? entry.name
    const description = fields.description
    if (description === undefined) continue

    skills.push({
      name: skillName,
      description,
      ...(fields.whenToUse === undefined ? {} : { whenToUse: fields.whenToUse }),
      content: body,
      source: 'bundled',
      path: skillPath,
      resourceBase: { kind: 'directory', path: skillDir },
    })
  }
  return skills
}

/**
 * The dsh tool vocabulary Superpowers instructions map onto. Superpowers is
 * written against several harnesses and names Claude Code's PascalCase tools;
 * without this mapping a skill tells the model to call tools that do not exist
 * here.
 * @returns the mapping section text.
 */
function dshToolMapping() {
  return `## DeepSeek Harness tool mapping

Superpowers skills are written for several coding agents. In DeepSeek Harness, use these tools:

- Invoke a skill → the native \`skill\` tool; every Superpowers skill is already in your skill catalog, so never read a \`SKILL.md\` by hand
- Read a file → \`read\` (\`read_image\` for images)
- Create or overwrite a file → \`write\`
- Modify an existing file → \`edit\`, or \`str_replace_editor\` where it is offered
- Run a shell command → \`bash\`; for long work pass \`run_in_background\`, then collect it with \`job_output\`, \`job_list\`, and \`job_kill\`
- Find files by path pattern → \`glob\`
- Search file contents → \`grep\`
- Track tasks → \`todo_write\`
- Ask the human a question → \`ask_user_question\`
- Search the web → \`web_search\`
- Dispatch a subagent → \`subagent\` for a fresh child, \`subagent_fork\` to continue from this session; steer children with \`send_message\`, \`interrupt\`, and \`list_agents\`
- Present a plan for approval → \`exit_plan_mode\`, while the session is in plan mode

Read Claude Code's \`Task\` as \`subagent\`, \`TodoWrite\` as \`todo_write\`, and \`Bash\`/\`Read\`/\`Write\`/\`Edit\`/\`Glob\`/\`Grep\` as their lowercase equivalents above. DeepSeek Harness exposes no hook or slash-command API to skills, so skip instructions that install hooks or register commands and do the work with these tools instead.`
}

/**
 * Build the bootstrap text.
 * @param bootstrapBody - the `using-superpowers` body, without frontmatter.
 * @param includeToolMapping - whether to append the dsh tool mapping.
 * @returns the prompt section text.
 */
function buildBootstrap(bootstrapBody, includeToolMapping) {
  const mapping = includeToolMapping ? `\n\n${dshToolMapping()}` : ''
  return `<EXTREMELY_IMPORTANT>
You have superpowers.

The using-superpowers skill content is included below and is already loaded for this session. Follow it now. Do not load using-superpowers again through the skill tool.

${bootstrapBody}${mapping}
</EXTREMELY_IMPORTANT>`
}

/**
 * Register the bundled skills and the bootstrap prompt section.
 * @param ctx - plugin context; every registration is disposed with it.
 * @param config - plugin configuration; unset fields take their defaults.
 */
export function apply(ctx, config) {
  const options = { ...DEFAULTS, ...(config ?? {}) }
  const bundled = loadBundledSkills()

  if (bundled.length === 0) {
    ctx.logger.warn(`superpowers: no skills found under ${skillsDir}`)
  }

  if (options.skills) {
    const skills = ctx.get('skills')
    if (skills === undefined) {
      ctx.logger.warn('superpowers: no skill registry is mounted; the bundled skills are not registered')
    } else {
      for (const skill of bundled) skills.register(skill)
    }
  }

  if (!options.bootstrap) return

  const bootstrap = bundled.find(skill => skill.name === BOOTSTRAP_SKILL)
  if (bootstrap === undefined) {
    ctx.logger.warn(`superpowers: ${BOOTSTRAP_SKILL} is missing; the bootstrap section is not registered`)
    return
  }

  ctx.systemPrompt.section({
    name: 'superpowers:bootstrap',
    order: options.order,
    text: buildBootstrap(bootstrap.content, options.toolMapping),
  })
}
