# Triage Labels

The skills speak in terms of five canonical triage roles. This file maps those
roles to the actual label strings used in this repo's issue tracker.

## State roles

| Label in mattpocock/skills | Label in our tracker | Meaning                                  |
| -------------------------- | -------------------- | ---------------------------------------- |
| `needs-triage`             | `needs-triage`       | Maintainer needs to evaluate this issue  |
| `needs-info`               | `needs-info`         | Waiting on reporter for more information |
| `ready-for-agent`          | `ready-for-agent`    | Fully specified, ready for an AFK agent  |
| `ready-for-human`          | `ready-for-human`    | Requires human implementation            |
| `wontfix`                  | `wontfix`            | Will not be actioned                     |

## Category roles

| Label in mattpocock/skills | Label in our tracker | Meaning                    |
| -------------------------- | -------------------- | -------------------------- |
| `bug`                      | `bug`                | Something is broken        |
| `enhancement`              | `enhancement`        | New feature or improvement |

## Rules

- When a skill mentions a role (e.g. "apply the AFK-ready triage label"), use the
  corresponding label string from the tables above.
- The `triage` skill applies these labels with `gh issue edit --add-label`.
- If a label does not exist on GitHub, the skill will attempt to create it.

Edit the right-hand columns to match whatever vocabulary you actually use.
