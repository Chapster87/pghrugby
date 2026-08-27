# Triage Labels

This repository uses the following labels to move issues through the triage state machine.

## Label mapping

| Role              | Label Name        | Description                                                     |
| :---------------- | :---------------- | :-------------------------------------------------------------- |
| `needs-triage`    | `needs-triage`    | New issues that need evaluation from a maintainer.              |
| `needs-info`      | `needs-info`      | Issues waiting on more information from the reporter.           |
| `ready-for-agent` | `ready-for-agent` | Fully specified issues that an agent can pick up and implement. |
| `ready-for-human` | `ready-for-human` | Issues that require human implementation or context.            |
| `wontfix`         | `wontfix`         | Issues that will not be actioned.                               |

## Rules

- The `triage` skill will apply these labels using `gh issue edit`.
- If a label does not exist on GitHub, the skill will attempt to create it.
