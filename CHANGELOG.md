# Changelog

## [1.0.0] - 2026-02-10

### Added
- Initial plugin release extracted from AIProjects Document Guard v2.1.0
- 7 check types: no_write_allowed, credential_scan, key_deletion_protection, section_preservation, heading_structure, frontmatter_preservation, shebang_preservation
- V2 semantic relevance checks via Ollama (opt-in)
- Two-tier config: project override > plugin default
- 11 universal protection rules covering credentials, .env files, CLAUDE.md, hooks, skills, commands, scripts, and .gitignore
- 13 credential patterns with 10+ placeholder exclusions
- Single-use override mechanism with configurable TTL
- JSONL audit logging
- `/document-guard:status` command
