# The Steel City 7s refund agreement is a required collector checkbox

The live WordPress registration stated the entry cancellation policy in the product
description — copy the buyer was expected to have read — and the PDP's collector
carried no equivalent. Copy alone is not a record: it cannot show that the buyer saw
or accepted the term, which is the gap
[#124](https://github.com/Chapster87/pghrugby/issues/124) names. The agreement
therefore becomes a **required `checkbox`** on the Steel City 7s collector
("Steel City 7s — Team & contact"), its label carrying the policy text, and the
answer is snapshotted onto the registration like every other collector field. The
golf outing's collector is left alone.

The wording paraphrases the live WordPress product's "Entry Cancellation Policy":
75% refund through 11:59 pm 7/5/2026, no refund on or after 7/6/2026. The dates are
the 2026 tournament's and the owner re-authors them per tournament; the label is a
collector field, so updating it is a CMS edit rather than a code change.

## Considered options

- **The policy as page copy only (the WordPress shape).** Rejected: a policy in the
  description is exactly what leaves no evidence the buyer accepted it. The
  collector's snapshot — `order_registrations.fields` / `answers` — is the record.
- **The same field on the golf outing's collector.** Rejected: the live WordPress
  golf product states no refund or cancellation policy, so there is nothing to
  acknowledge. Revisit only if the club adopts one.
- **A code-level checkbox on the PDP rather than a collector field.** Rejected:
  collectors are CMS content, the `checkbox` block already exists
  ([ADR-0003](0003-collector-field-type-is-the-block.md)), and the PDP already
  renders it — so a field on the collector is the whole change.

## Consequences

- An SC7s registration cannot be committed without the tick, and the answer rides
  the registration snapshot into the order records
  (`order_registrations.fields` / `answers`) like every other collector field. The
  Stripe `reg_N` summary keeps to names — `registrationNames` skips
  acknowledgements rather than printing the `"true"` marker.
- The acknowledgement is per collector entry. SC7s is a `variation` page where each
  add is one side, so a multi-side buyer ticks once per side they register.
- The policy dates live in the field's label, not the page copy, so the term is
  visible in the buy box beside the control rather than only below the fold.
