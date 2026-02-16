# Document Guard

**Take control of what your AI assistant can change.**

Claude Code is powerful — it can read, write, and rewrite any file in your project. But power without guardrails is just risk. Document Guard gives you configurable, layered file protection that inspects every edit *before* it hits disk.

No config required. Install it, and 11 protection rules are active immediately.

## The Problem

Claude Code has permission rules to control *which tools* can run. But once an Edit or Write is approved, nothing validates *what it writes*. That means:

- A credential gets written into a git-tracked file — and pushed before you notice
- A full-file rewrite silently drops sections from your `CLAUDE.md`
- A config "fix" deletes top-level keys from your YAML
- A "cleanup" strips the shebang from a shell script that runs in CI

These aren't hypotheticals. They're the kinds of mistakes any AI assistant makes when it's optimizing for the task in front of it without awareness of the consequences.

## See It In Action

Claude tries to edit your `.env` file:

```
DOCUMENT GUARD [CRITICAL]: Edit blocked on .env

Violations:
  - [no_write_allowed] Root .env file cannot be modified by Claude. Edit manually.

Matched rules: Root .env - total block

To override: Ask the user for explicit approval, then write this file:
  Path: .claude/logs/.document-guard-overrides.json
  Content: {"overrides":[{"file":".env","reason":"User approved","expires":1739207400000}]}
Then retry the edit. The override expires in 120 seconds and is single-use.
```

Claude tries to rewrite `CLAUDE.md` and drops a section:

```
DOCUMENT GUARD [CRITICAL]: Edit blocked on .claude/CLAUDE.md

Violations:
  - [section_preservation] Section "## Key References" would be removed
  - [heading_structure] Heading "### Search Strategy" would be removed

Matched rules: CLAUDE.md (nested) - protect structure
```

Claude writes code that contains an API key:

```
DOCUMENT GUARD [CRITICAL]: Edit blocked on src/config.js

Violations:
  - [credential_scan] Potential AWS Access Key detected in edit content

Matched rules: credential_scan
```

Every block is logged. Every override requires explicit user approval and expires automatically.

## How It Compares

Document Guard fills a specific gap in the Claude Code safety stack:

| Capability | Permission Rules | [Safety Net](https://github.com/kenryu42/claude-code-safety-net) | **Document Guard** |
|------------|:---:|:---:|:---:|
| Control which tools run | Yes | - | - |
| Block dangerous shell commands | - | Yes | - |
| Block credential leaks in file edits | - | - | Yes |
| Preserve config structure (YAML keys, sections) | - | - | Yes |
| Protect frontmatter fields | - | - | Yes |
| Detect shebang removal | - | - | Yes |
| Semantic content validation (Ollama) | - | - | Yes |
| Configurable per-project rules | - | Yes | Yes |
| Single-use override mechanism | - | - | Yes |
| Audit logging | - | - | Yes |

These tools are **complementary**. Permission Rules control access, Safety Net protects your shell, Document Guard protects your files. Use all three for defense in depth.

## Quick Install

```bash
# Add the marketplace
claude plugin marketplace add davidmoneil/aifred-document-guard

# Install the plugin
claude plugin install document-guard@aifred-document-guard
```

Or for quick testing without permanent install:

```bash
claude --plugin-dir /path/to/aifred-document-guard
```

That's it. No configuration needed — sensible defaults protect your project immediately.

## What It Protects (Out of the Box)

| Tier | What | Checks | Why |
|------|------|--------|-----|
| **Critical** | `.env` files | Total write block | Prevents exposing secrets |
| **Critical** | `.credentials/**` | Total write block | Credential directories are untouchable |
| **Critical** | `.claude/settings.json` | Key deletion protection | Prevents wiping Claude permissions |
| **Critical** | `CLAUDE.md` | Section + heading preservation | Protects your project instructions |
| **High** | `.claude/hooks/*.js` | Shebang preservation | Keeps your hooks executable |
| **High** | `.claude/skills/*/SKILL.md` | Frontmatter lock | Protects skill identity fields |
| **High** | `.claude/commands/*.md` | Frontmatter lock | Protects command routing |
| **Medium** | `**/*.sh` | Shebang preservation | Warns on shebang removal |
| **Medium** | `.gitignore` | Section preservation | Warns on section removal |
| **All files** | Every edit | Credential scan | Blocks 13 credential patterns (AWS, GitHub, Stripe, etc.) |

## How It Works

Document Guard is a [PreToolUse hook](https://docs.anthropic.com/en/docs/claude-code/hooks) — it runs *before* every Edit and Write operation. The flow:

```
Claude wants to edit a file
    ↓
Document Guard intercepts the call
    ↓
Match file path against rules (glob patterns)
    ↓
Run applicable checks (credential scan, structure, etc.)
    ↓
No violations? → Allow the edit
Violations found?
    → Critical/High: Block. Log. Provide override instructions.
    → Medium: Warn (inject context). Allow.
    → Low: Log only. Allow.
```

**Four response tiers** give you graduated control:

| Tier | Behavior | When to use |
|------|----------|-------------|
| `critical` | Block + require override | Secrets, credentials, permissions |
| `high` | Block + require override | Structural files, identity fields |
| `medium` | Warn + allow | Scripts, configs where removal is suspicious but not catastrophic |
| `low` | Log only | Audit trail without friction |

## Configuration

### Two-Tier Config System

1. **Project override** (highest priority): `.claude/hooks/document-guard.config.js`
2. **Plugin default** (fallback): Bundled with the plugin

If a project config exists, the plugin default is ignored entirely. This means you can fully customize behavior per-project.

### Creating a Project Override

```bash
# Copy the plugin's default config as a starting point
mkdir -p .claude/hooks
cp "$(claude plugin path document-guard)/config/document-guard.config.js" \
   .claude/hooks/document-guard.config.js
```

Then add your own rules:

```javascript
// .claude/hooks/document-guard.config.js
module.exports = {
  settings: { /* ... */ },
  general: [ { name: 'credential_scan', check: 'credential_scan', action: 'block' } ],
  rules: [
    // Keep universal rules...
    { name: 'Root .env', pattern: '.env', tier: 'critical', checks: ['no_write_allowed'] },

    // Add project-specific rules
    {
      name: 'Database migrations',
      pattern: 'migrations/**',
      tier: 'high',
      checks: ['no_write_allowed'],
      message: 'Migration files are immutable once created.',
    },
    {
      name: 'API schema',
      pattern: 'openapi.yaml',
      tier: 'high',
      checks: ['key_deletion_protection', 'section_preservation'],
    },
  ],
  credentialPatterns: [ /* ... */ ],
  placeholderPatterns: [ /* ... */ ],
};
```

## Check Types

Document Guard runs **7 structural checks** and **1 semantic check**:

### V1: Structural Checks (enabled by default)

| Check | What It Does |
|-------|-------------|
| `no_write_allowed` | Total write block — file cannot be modified at all |
| `credential_scan` | Scans for 13 credential patterns (AWS keys, GitHub tokens, private keys, JWTs, database URLs, etc.) with false-positive exclusions for placeholders |
| `key_deletion_protection` | Detects removal of top-level keys in YAML/config files during full-file writes |
| `section_preservation` | Detects removal of `## Heading` sections in markdown. Optionally restrict to specific sections |
| `heading_structure` | Detects removal of any heading (`#` through `######`) in full-file writes |
| `frontmatter_preservation` | Locks specific YAML frontmatter fields (e.g., `name`, `skill`, `created`) |
| `shebang_preservation` | Detects removal of `#!/...` lines from scripts |

### V2: Semantic Check (opt-in, requires Ollama)

| Check | What It Does |
|-------|-------------|
| `semantic_relevance` | Uses a local LLM to check if written content matches the file's declared purpose. Always warns, never blocks. Fails open if Ollama is unavailable. |

Enable V2 in your config:

```javascript
settings: {
  v2: {
    enabled: true,
    ollamaUrl: 'http://localhost:11434',
    model: 'qwen2.5:7b-instruct',
    timeout: 5000,
    minContentLength: 50,
  },
}
```

Add a `purpose` field to any rule to activate semantic checking:

```javascript
{
  name: 'API docs',
  pattern: 'docs/api/**',
  tier: 'high',
  checks: ['section_preservation', 'semantic_relevance'],
  purpose: 'REST API endpoint documentation',
}
```

## Override Mechanism

When Document Guard blocks an edit, it doesn't just say "no" — it tells Claude exactly how to get approval:

1. Claude asks you for explicit approval
2. A JSON override file is written with the file path and expiration
3. The edit is retried and succeeds
4. The override is consumed (single-use) and logged

Overrides expire after a configurable TTL (default: 120 seconds). No permanent bypasses.

## Audit Log

Every action is recorded in `.claude/logs/document-guard.jsonl`:

```json
{"timestamp":"2026-02-10T15:30:00.000Z","hook":"document-guard","version":2,"action":"blocked","file":".env","violations":[{"check":"no_write_allowed","tier":"critical","message":"Root .env file cannot be modified by Claude. Edit manually."}],"rules":["Root .env - total block"]}
```

Actions: `blocked`, `warned`, `logged`, `override_used`

## Status Command

Check the current state of Document Guard:

```
/document-guard:status
```

Shows: active config source, settings, rules table, recent audit log entries, and active overrides.

## Troubleshooting

### Hook Not Running

**Symptom**: Edits to protected files succeed without any block or warning messages.

1. Check if the plugin is installed: `claude plugin list`
2. Verify hook registration exists in `.claude-plugin/plugin.json`
3. Check the emergency kill switch: `echo $DOCUMENT_GUARD_ENABLED` (should not be `false` or `0`)
4. Run `/document-guard:status` for a full diagnostic

### Edit Allowed When It Should Block

**Symptom**: A file edit succeeds but you expected it to be blocked.

1. Run `/document-guard:status` to see the active config and rules
2. Verify your rule's glob pattern matches the file path — patterns are relative to project root
3. Check toggles: `settings.v1.enabled` and `settings.v1.structuralChecks` must be `true`
4. Check audit log for clues: `tail -5 .claude/logs/document-guard.jsonl`

### Override Not Working

**Symptom**: You created an override JSON but the edit is still blocked.

1. File path in the override must match exactly (relative to project root, e.g. `.env` not `/.env`)
2. The `expires` timestamp must be in the future and in **milliseconds** since epoch
3. Override file must be at `.claude/logs/.document-guard-overrides.json`
4. Overrides are single-use — they're consumed after one successful edit

### Semantic Check Not Working (V2)

**Symptom**: Rules with a `purpose` field don't trigger semantic validation.

1. Verify Ollama is running: `curl http://localhost:11434/api/tags`
2. Check V2 is enabled in config: `settings.v2.enabled: true`
3. Verify the model is available: `ollama list | grep qwen2.5`
4. Try increasing the timeout: `v2.timeout: 10000` in config

### Temporarily Disable All Checks

Set the environment variable before starting Claude:

```bash
export DOCUMENT_GUARD_ENABLED=false
claude
```

Or disable specific check categories in your config:

```javascript
settings: {
  v1: {
    credentialScan: false,      // Disable credential scanning
    structuralChecks: false,    // Disable structural checks
  }
}
```

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCUMENT_GUARD_ENABLED` | `true` | Emergency kill switch (`false`/`0` disables all checks) |
| `CLAUDE_PROJECT_DIR` | (set by Claude Code) | Project root for path resolution |
| `CLAUDE_PLUGIN_ROOT` | (set by Claude Code) | Plugin root for default config |

## Part of the AIfred Ecosystem

Document Guard is extracted from the [AIfred](https://github.com/davidmoneil/AIfred) Claude Code starter kit. AIfred provides a complete foundation for Claude Code projects including hooks, skills, patterns, and automation.

## License

MIT
