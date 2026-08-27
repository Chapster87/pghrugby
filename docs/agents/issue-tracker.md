# Issue Tracker: GitHub Issues

This repository uses GitHub Issues to track feature requests, bugs, and tasks.

## Skills configuration

- **Type**: `github`
- **Triage external PRs**: `false`

## Workflows

### Triage (`/triage`)

The `/triage` skill will use the `gh` CLI to fetch issues from GitHub. It will skip pull requests (as configured above).

### Creating tickets (`/to-tickets`)

The `/to-tickets` skill will create new issues on GitHub using `gh issue create`.

### Referencing issues

When an agent needs to reference an issue, it should use the `#123` format.
