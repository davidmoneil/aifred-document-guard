/**
 * Document Guard - Universal Default Configuration
 *
 * Protects common files in any Claude Code project.
 * For project-specific rules, create a project override at:
 *   .claude/hooks/document-guard.config.js
 *
 * Tiers:
 *   critical - Block all violations, override requires user approval
 *   high     - Block all violations, override requires user approval
 *   medium   - Warn but allow (injected into context)
 *   low      - Log only
 *
 * Version: 1.0.0
 */

module.exports = {

  // --- Settings ---
  settings: {
    enabled: true,              // Master kill switch (also: DOCUMENT_GUARD_ENABLED env var)
    v1: {
      enabled: true,            // All V1 structural checks
      credentialScan: true,     // Credential pattern detection
      structuralChecks: true,   // section/heading/key/frontmatter/shebang
    },
    v2: {
      enabled: false,           // Semantic checks (requires local Ollama - opt in)
      ollamaUrl: 'http://localhost:11434',
      model: 'qwen2.5:7b-instruct',
      timeout: 5000,            // Hard timeout in ms
      minContentLength: 50,     // Skip semantic check for tiny edits
    },
    failMode: 'open',           // 'open' = allow on hook error, 'closed' = block on error
    overrideTTL: 120,            // seconds before override expires
    maxViolationsShown: 5,       // limit violations in block message
  },

  // --- General Rules (checked for ALL edited files) ---
  general: [
    {
      name: 'credential_scan',
      check: 'credential_scan',
      action: 'block',
    },
  ],

  // --- Path Rules (matched by glob pattern) ---
  // Order doesn't matter - most specific pattern wins.
  // If multiple patterns match equally, all their checks run.
  rules: [

    // ===== CRITICAL TIER =====

    {
      name: 'Credential files - total block',
      pattern: '.credentials/**',
      tier: 'critical',
      checks: ['no_write_allowed'],
      message: 'Credential files cannot be modified by Claude. Edit these manually.',
    },
    {
      name: 'Root .env - total block',
      pattern: '.env',
      tier: 'critical',
      checks: ['no_write_allowed'],
      message: 'Root .env file cannot be modified by Claude. Edit manually.',
    },
    {
      name: 'External .env files - total block',
      pattern: '**/.env',
      tier: 'critical',
      checks: ['no_write_allowed'],
      message: '.env files cannot be modified by Claude.',
    },
    {
      name: 'Main settings - protect permissions',
      pattern: '.claude/settings.json',
      tier: 'critical',
      checks: ['key_deletion_protection'],
    },
    {
      name: 'CLAUDE.md (nested) - protect structure',
      pattern: '.claude/CLAUDE.md',
      tier: 'critical',
      checks: ['section_preservation', 'heading_structure'],
    },
    {
      name: 'CLAUDE.md (root) - protect structure',
      pattern: 'CLAUDE.md',
      tier: 'critical',
      checks: ['section_preservation', 'heading_structure'],
    },

    // ===== HIGH TIER =====

    {
      name: 'Hooks - protect shebang',
      pattern: '.claude/hooks/*.js',
      tier: 'high',
      checks: ['shebang_preservation'],
    },
    {
      name: 'Skills - protect frontmatter identity',
      pattern: '.claude/skills/*/SKILL.md',
      tier: 'high',
      checks: ['frontmatter_preservation'],
      lockedFields: ['name', 'created', 'category'],
    },
    {
      name: 'Commands - protect frontmatter routing',
      pattern: '.claude/commands/*.md',
      tier: 'high',
      checks: ['frontmatter_preservation'],
      lockedFields: ['skill'],
    },

    // ===== MEDIUM TIER =====

    {
      name: 'Shell scripts - protect shebang',
      pattern: '**/*.sh',
      tier: 'medium',
      checks: ['shebang_preservation'],
    },
    {
      name: 'Gitignore - protect security patterns',
      pattern: '.gitignore',
      tier: 'medium',
      checks: ['section_preservation'],
    },
  ],

  // --- Credential Patterns (used by credential_scan check) ---
  credentialPatterns: [
    { name: 'AWS Access Key',     regex: /AKIA[0-9A-Z]{16}/ },
    { name: 'GitHub Token',       regex: /ghp_[a-zA-Z0-9]{36}/ },
    { name: 'GitHub OAuth',       regex: /gho_[a-zA-Z0-9]{36}/ },
    { name: 'Anthropic Key',      regex: /sk-ant-[a-zA-Z0-9\-_]{20,}/ },
    { name: 'OpenAI Key',         regex: /sk-[a-zA-Z0-9]{32,}/ },
    { name: 'Slack Token',        regex: /xox[bpors]-[a-zA-Z0-9-]+/ },
    { name: 'Stripe Key',        regex: /sk_(?:live|test)_[a-zA-Z0-9]{20,}/ },
    { name: 'Private Key Block',  regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/ },
    { name: 'JWT Token',          regex: /eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+/ },
    { name: 'Generic Password',   regex: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"'\s${\n]{8,}["']/i },
    { name: 'Generic API Key',    regex: /(?:api[_-]?key|apikey)\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/i },
    { name: 'Generic Secret',     regex: /(?:secret|token)\s*[:=]\s*["'][a-zA-Z0-9]{20,}["']/i },
    { name: 'Database URL',       regex: /(?:postgres|mysql|mongodb):\/\/[^:]+:[^@\s]+@/ },
  ],

  // --- Placeholder Patterns (false positive exclusions) ---
  placeholderPatterns: [
    /example/i, /placeholder/i, /your[_-]/i, /test[_-]/i,
    /dummy/i, /fake/i, /mock/i, /sample/i, /todo/i,
    /\$\{/, /\{\{/, /<[A-Z_]+>/, /xxx/i,
  ],

};
