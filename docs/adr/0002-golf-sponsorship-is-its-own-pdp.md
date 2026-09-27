# Golf outing sponsorship is its own PDP, not add-ons on the golf page

The club's golf-outing sponsorship packages were never sellable on this site. The
live WordPress product is a WooCommerce **variable** product: five fixed-price tiers
(Masters $5,000, Pro $2,500, Hole-in-One $1,000, Eagle $500, Birdie $250), each with
its own perks, plus a sixth "Custom Sponsor" option carrying no price and asking the
buyer to email before purchasing. Sponsorship gets **its own PDP** (clean URL
`/golf-outing-sponsorship`), composed as a **`variation`** whose primaries are the
five fixed-price tiers, reported under its own **`family=sponsorship`**. The Custom
Sponsor is deliberately **not** a product. A sponsorship is bought by a business, not
by a golfer: it is not an add-on to a registration, and the golf page's shape — a
quantity-bearing registration with a per-golfer collector — fits neither the buyer
nor the thing being bought.

## Considered options

- **The five tiers as `addon_products` on the existing `golf-outing` page.** Rejected:
  an add-on is something a player attaches to their own registration, and it would
  leave sponsorship revenue inside the `golf` family, indistinguishable from entries.
- **The Custom Sponsor as a sixth, open-amount tier.** Rejected: the live option has
  no price, and a Stripe `custom_unit_amount` price must be the session's only line
  item, forbidding discounts and promotion codes — the same constraint that made
  any-amount giving a standalone flow. Contact-direct is the cheaper answer, and it
  is what the live store already does.
- **Reusing `family=golf`.** Rejected: the family is the coarse axis orders are
  reported on; a naming-rights sale is not a registration.

## Consequences

- A `variation` page now renders the **selected** option's own description beneath
  its price card, and no longer emits the implicit Description panel built from the
  first primary — on such a page the copy belongs to the chosen option. Because the
  Dues and Steel City 7s products already carry descriptions, this changes what those
  live pages show. `simple` and `grouped` pages are unchanged.
- The storefront migration manifest gains a field for the WordPress variation label:
  a variable product has one serving slug and many variations, so a row identified by
  slug alone cannot name its tier.
