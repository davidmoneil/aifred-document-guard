# Document Guard

**Prevents Claude from accidentally damaging important files.**

A [Claude Code](https://docs.anthropic.com/en/docs/claude-code) plugin that intercepts Edit/Write operations and validates them against configurable protection rules. Blocks credential leaks, structural damage to config files, and accidental overwrites of critical infrastructure.

## Quick Install

```bash
claude plugin add /path/to/aifred-document-guard
```

Or from the plugin directory:

```bash
claude plugin add .
```

That's it. Document Guard starts protecting your project immediately with sensible defaults.

## What It Protects (Out of the Box)

| Tier | What | Why |
|------|------|-----|
| **Critical** | `.env` files | Prevents exposing secrets |
| **Critical** | `.credentials/**` | Total write block on credential directories |
| **Critical** | `.claude/settings.json` | Prevents key deletion in Claude settings |
| **Critical** | `CLAUDE.md` | Prevents section/heading removal from project instructions |
| **High** | `.claude/hooks/*.js` | Prevents shebang line removal |
| **High** | `.claude/skills/*/SKILL.md` | Locks frontmatter identity fields |
| **High** | `.claude/commands/*.md` | Locks skill routing field |
| **Medium** | `**/*.sh` | Warns if shebang line is removed |
| **Medium** | `.gitignore` | Warns if sections are removed |
| **All files** | Credential scan | Blocks writes containing API keys, tokens, passwords |

## Check Types

Document Guard runs 7 types of validation checks:

### V1 Checks (enabled by default)

1. **no_write_allowed** - Total write block. The file cannot be modified at all.
2. **credential_scan** - Scans edit content for 13 credential patterns (AWS keys, GitHub tokens, private keys, etc.) with false-positive exclusions for placeholders.
3. **key_deletion_protection** - Prevents removal of top-level YAML/config keys in full-file writes.
4. **section_preservation** - Detects removal of `## Heading` sections in markdown files. Optionally restrict to specific section names.
5. **heading_structure** - Detects removal of any heading (`#` through `######`) in full-file writes.
6. **frontmatter_preservation** - Locks specific YAML frontmatter fields (e.g., `name`, `skill`, `created`).
7. **shebang_preservation** - Detects removal of `#!/...` lines from scripts.

### V2 Check (opt-in, requires Ollama)

8. **semantic_relevance** - Uses a local Ollama model to check if written content matches the file's declared purpose. Always warns (medium tier), never blocks.

## Two-Tier Configuration

Document Guard uses a two-tier config system:

1. **Project override** (highest priority): `.claude/hooks/document-guard.config.js`
2. **Plugin default** (fallback): Bundled with the plugin

The project config takes **full precedence** - if it exists, the plugin default is ignored entirely.

## Creating a Project Override

```bash
# Copy the plugin's default config as a starting point
mkdir -p .claude/hooks
cp "$(claude plugin path document-guard)/config/document-guard.config.js" \
   .claude/hooks/document-guard.config.js
```

Then add project-specific rules:

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

## Override Mechanism

When Document Guard blocks an edit, it provides instructions to create a single-use override:

1. Claude asks the user for explicit approval
2. A JSON override file is written with the approved file path and expiration
3. The edit is retried and succeeds
4. The override is consumed (single-use) and logged

Overrides expire after a configurable TTL (default: 120 seconds).

## V2 Semantic Checks

Enable Ollama-based semantic validation for content relevance:

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

Add a `purpose` field to any rule to enable semantic checking:

```javascript
{
  name: 'API docs',
  pattern: 'docs/api/**',
  tier: 'high',
  checks: ['section_preservation', 'semantic_relevance'],
  purpose: 'REST API endpoint documentation',
}
```

V2 checks always fail open (if Ollama is unavailable, the check is skipped) and always warn at medium tier (never block).

## Audit Log

All guard actions are logged to `.claude/logs/document-guard.jsonl`:

```json
{"timestamp":"2026-02-10T15:30:00.000Z","hook":"document-guard","version":2,"action":"blocked","file":".env","violations":[{"check":"no_write_allowed","tier":"critical","message":"Root .env file cannot be modified by Claude. Edit manually."}],"rules":["Root .env - total block"]}
```

Actions: `blocked`, `warned`, `logged`, `override_used`

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `DOCUMENT_GUARD_ENABLED` | `true` | Emergency kill switch (`false`/`0` disables all checks) |
| `CLAUDE_PROJECT_DIR` | (set by Claude Code) | Project root for path resolution |
| `CLAUDE_PLUGIN_ROOT` | (set by Claude Code) | Plugin root for default config |

## Status Command

Check the current state of Document Guard:

```
/document-guard:status
```

Shows: active config source, settings, rules table, recent audit log entries, and active overrides.

## Part of the AIfred Ecosystem

Document Guard is extracted from the [AIfred](https://github.com/davidmoneil/AIfred) Claude Code starter kit. AIfred provides a complete foundation for Claude Code projects including hooks, skills, patterns, and automation.

## License

MIT
