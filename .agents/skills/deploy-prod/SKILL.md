---
name: deploy-prod
description: Promote trunk onto main with a fast-forward and push it, triggering the production Netlify deploy without creating a new commit. Use when the user asks to deploy to production, promote or ship trunk to main, or release the current trunk build.
disable-model-invocation: true
---

# Deploy production

Promote `trunk` onto `main` with a **fast-forward only**, so `main` advances to
trunk's existing commit and **no new commit SHA is created**. Pushing `main`
starts the production Netlify deploy for that SHA.

This skill is the equivalent of:

```bash
git checkout main
git merge --ff-only trunk
git push origin main
git checkout trunk
```

It does **not** commit anything. If there is uncommitted work, stop — the deploy
must not carry half-finished changes.

## Preconditions — check every one, and stop on any unexpected result

Run these first and read the output before changing branches.

1. Working tree is clean:
   `git --no-optional-locks status --short`
   Any output (tracked or untracked) is a **stop**.
2. On `trunk`:
   `git --no-pager branch --show-current`
   Anything other than `trunk` is a **stop**; ask the user which branch to
   promote instead of guessing.
3. Remote refs are current:
   `git fetch origin --prune`
4. Fast-forward is possible — `origin/main` is an ancestor of `trunk`:
   `git merge-base --is-ancestor origin/main trunk`
   A non-zero exit is a **stop**: `main` has diverged. Report both sides
   (`git --no-pager log --oneline origin/main..trunk` and
   `git --no-pager log --oneline trunk..origin/main`) and ask the user how to
   proceed.
5. Show what will ship:
   `git --no-pager log --oneline origin/main..trunk`
   If `trunk` is also ahead of `origin/trunk`, say so — the push will include
   those unpushed commits.

## Deploy

Run in order, one command at a time so a failure is easy to locate. Prefix git
commands that could open an editor with `GIT_EDITOR=true`, and set `timeout_ms`
on the push.

1. `git checkout main`
2. `GIT_EDITOR=true git merge --ff-only trunk`
3. `git push origin main`
4. `git checkout trunk`

Never reach for `--force`, `--no-ff`, a bare `git merge`, or a rebase — each
either rewrites history or introduces a new merge SHA, which is exactly what
this skill exists to avoid.

## If something fails after step 1

Return the repo to how the user left it before reporting:

- `git checkout trunk`
- `git merge --abort` only if a merge is in progress (`--ff-only` should never
  create one)

Then report the failing command and its output. Do not retry with a weaker
guard (no force, no merge commit) — if `main` is branch-protected and the push
is rejected, say so and suggest a PR from `trunk` to `main` merged with
fast-forward or rebase.

## Confirm and report

After the push, verify `main` landed on trunk's commit:

- `git --no-pager log --oneline -1 origin/main`
- `git --no-pager log --oneline -1 trunk`

Both must show the same SHA. Report that SHA to the user and note that the push
started the production Netlify deploy for it, so they can watch that deploy for
the commit. This skill only guarantees **what was pushed** — the build and
release themselves are Netlify's.
