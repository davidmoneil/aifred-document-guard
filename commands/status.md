---
description: Show Document Guard status, active config, rules, and recent audit log
standalone: true
allowed-tools:
  - Bash(node *)
  - Read
---

# /document-guard:status

Show the current state of Document Guard.

## Instructions

Run the following diagnostic steps and present results:

### 1. Config Source

Check which config is active:

```bash
node -e "
const fs = require('fs');
const path = require('path');
const projectDir = process.env.CLAUDE_PROJECT_DIR || process.cwd();
const projectConfig = path.join(projectDir, '.claude', 'hooks', 'document-guard.config.js');
const pluginRoot = '${CLAUDE_PLUGIN_ROOT}' !== '' ? '${CLAUDE_PLUGIN_ROOT}' : path.resolve(__dirname, '..');
const pluginConfig = path.join(pluginRoot, 'config', 'document-guard.config.js');

let source = 'none';
if (fs.existsSync(projectConfig)) source = 'project: ' + projectConfig;
else if (fs.existsSync(pluginConfig)) source = 'plugin-default: ' + pluginConfig;
console.log('Config source: ' + source);
"
```

### 2. Current Settings

Read the active config file identified above. Report:
- **V1 enabled**: yes/no
- **Credential scan**: yes/no
- **Structural checks**: yes/no
- **V2 (semantic)**: yes/no
- **Fail mode**: open/closed
- **Override TTL**: N seconds

### 3. Active Rules Table

List all rules from the config in a table:

| Tier | Rule Name | Pattern | Checks |
|------|-----------|---------|--------|
| critical | ... | ... | ... |

### 4. Recent Audit Log

Read the last 5 entries from `.claude/logs/document-guard.jsonl` (if it exists):

```bash
tail -5 .claude/logs/document-guard.jsonl 2>/dev/null || echo "No audit log found"
```

Format each entry showing: timestamp, action (blocked/warned/override_used), file, violations.

### 5. Active Overrides

Check `.claude/logs/.document-guard-overrides.json` for any active overrides:

```bash
cat .claude/logs/.document-guard-overrides.json 2>/dev/null || echo "No active overrides"
```

### 6. Creating a Project Override

If the user wants to customize rules, explain:

> To create a project-specific config, copy the plugin default and modify it:
> ```bash
> mkdir -p .claude/hooks
> cp <plugin-config-path> .claude/hooks/document-guard.config.js
> ```
> The project config takes full precedence over the plugin default.
