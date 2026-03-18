# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | Yes                |

## Scope

deltamind is a **TypeScript library and CLI** for active context compaction — processing LLM session deltas into structured memory. It processes local data only with no network access.

Packages:
- **@deltamind/core**: Context compaction engine (library)
- **@deltamind/cli**: Session inspection CLI

## Reporting a Vulnerability

If you discover a security issue:

1. **Email**: 64996768+mcp-tool-shop@users.noreply.github.com
2. **Subject**: `[SECURITY] deltamind: <brief description>`

We will acknowledge reports within 7 days and provide a fix within 30 days.

## Security Practices

- No secrets or credentials in this repository
- No network access — all processing is local
- Type-safe delta processing with TypeScript strict mode
- 181 tests covering core logic and edge cases
- CI runs tests on every push
