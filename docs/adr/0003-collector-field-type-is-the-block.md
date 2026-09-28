# A collector field's type is its block, not a field on the block

A DataCollector's form is built from **one modular block per control** — text,
textarea, email, select, radio, checkbox — and a choice's options are a **nested
option block**, not a delimited string. A single `data_field` block carrying
`field_type` plus `options`, `placeholder`, `repeatable` and `max` as a bag of
optionals makes every invalid combination representable, and the app absorbed each
one silently: a hand-typed `options` value read as a single choice, a `repeatable`
`select` degrading to a text box, `max` on a non-repeatable field, a typo'd
`field_type` falling back to text. The type therefore moves from a value the
editor picks to the block the editor inserts, and the option list from a string
with an unenforced delimiter contract to records that cannot be mis-split.

This is the split already applied to the product panels, where one `product_tab`
block carrying a `tab` enum became two blocks whose type carries the meaning.

## Considered options

- **One `data_field` block with a `field_type` enum and conditional field
  visibility.** Rejected: visibility hides irrelevant fields, it does not forbid
  them. The invalid combinations stay representable, the renderer keeps its
  defensive branches, and `options` still has no contract — the defect that
  prompted this is a delimiter, not a display.
- **Options as `text`, one per line, with a hint.** Rejected: it is the status quo
  with a comment. The live sponsorship collector already holds the comma form
  (`"Yes, No"`) that the heuristic exists to rescue, so the contract has been
  broken in practice; a label containing a comma remains unrepresentable.
- **Options as `links` to a standalone option model.** Rejected for now: options
  would become global records to be curated in a collection of their own, and a
  `fail` cascade on every choice field. The nested block keeps an option owned by
  the field that uses it. It is the one shape that would also _enforce_ a minimum
  option count (`size.min`, the same stand-in-for-required `primary_products`
  uses), which a rich-text field cannot — see the consequence below.
- **Fewer blocks — one free-input block with its own sub-type.** Rejected: it
  reintroduces exactly the discriminator being removed.

## Consequences

- The renderer discriminates on the block record type, so an unrecognised field is
  no longer renderable at all: the "falls back to `text`" hazard is gone, and a new
  control is a new block, a new query fragment, and a new renderer case.
- **An empty option list stays representable.** DatoCMS rich-text validators carry
  no `required`, so "a choice has at least one option" is a hint rather than a
  constraint: the control renders with nothing to choose. This is the one invalid
  state the split does not close. Enforcing it means the linked-option model above.
- The `options` field's _type_ is still an improvement on its own — a list of
  records cannot be mis-split on a comma, and an option's label may contain one —
  which is the defect #122 surfaced.
- `CollectorField` becomes a discriminated union. The discriminant stays the
  string `type` with today's six values, because `order_registrations.fields` is a
  persisted snapshot of the old shape and must keep parsing.
- Values stay string-shaped, so the answers payload, the registration snapshot and
  the Stripe metadata summaries are unchanged.
- The blocks are global item types, so any future form model reuses them by
  listing them in its own rich-text validator. Reuse is a naming decision, not a
  structural one; the family stays `data_field_*` because `CONTEXT.md` calls this
  concept a Data collector and rejects "form".
- `data_collector.form_fields` widens to accept both shapes for the length of the
  migration, so a run that fails part-way leaves every record valid. The legacy
  block is destroyed only after every collector is converted and the validator is
  narrowed.
