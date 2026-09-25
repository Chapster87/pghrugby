# Frontend (`pghrugby`)

The public Next.js site for Pittsburgh Forge Rugby Club: marketing pages, editorial
posts, and Stripe-backed buyable products (dues, registrations, donations).

## Language

**Page**:
An editorial content page rendered from CMS content, served at its root slug.
_Avoid_: landing page, static page

**Post**:
An editorial news entry, published under the posts prefix.
_Avoid_: article, blog post, news item

**Product**:
One Stripe-backed buyable, identified by its sku. A PDP composes products; a product
carries its own editorial content and availability (in stock or not, and whether it is
sold in multiples).
_Avoid_: item, variant

**Product detail page (PDP)**:
A buyable page that composes one or more products (dues, golf outing, Steel City 7s,
donations). Rendered from an internal product route and rewritten to a clean root URL.
_Avoid_: flow page, product page, buy page

**Product type**:
How a PDP composes its products — Simple, Variation, or Grouped.

**Simple** (PDP):
A PDP with a single product and no choice to make.

**Variation** (PDP):
A PDP whose products are alternatives — the buyer chooses exactly one.

**Grouped** (PDP):
A PDP whose products are multi-select, each chosen product with its own quantity.

**Data collector**:
The registration form attached to a PDP. Supplies the registration payload only — it
never determines quantity.
_Avoid_: form (ambiguous with a group of fields)

**Product tab**:
One authored piece of a PDP's below-fold content: a kind, a title, and its own
structured content. A PDP renders its tabs in order, and only those it has.
_Avoid_: section, accordion — and do not confuse it with a Panel, which is what
renders from it

**Panel**:
One below-fold section on a PDP, rendered from a Product tab. A single populated
panel renders as a plain section with its heading; two or more render as a tab
strip.
_Avoid_: tab, tab content

**Cart line**:
One entry in the browser-held cart — either a priced line or a collector entry.
_Avoid_: cart item

**Priced line**:
A cart line that is one sku with a buyer-set quantity, optionally linked to the line
it was added with. The only kind that becomes a Stripe line item.

**Collector entry**:
A cart line holding a DataCollector's answers. Carries no sku and no price; linked to
the priced line it was added with.
_Avoid_: registration line

**Order**:
The durable record of a purchase, holding the priced lines and their
registrations as Stripe recorded them.
_Avoid_: purchase, transaction

**Order line**:
A priced line as recorded on an order — one Stripe line item, tied optionally to the
add-on's primary line.
_Avoid_: order item

**Order registration**:
A collector entry as recorded on an order, tied to the order line it was added
with.

**Family**:
The product-metadata bucket a product belongs to (membership, dues, golf,
tournament, donation); the coarse axis orders are reported on. A product may have
no family.

**Clean URL**:
The public root URL of a product detail page (e.g. `/dues`), produced by rewriting the
internal product route. Products win slug ownership over pages.
_Avoid_: pretty URL, friendly URL, nice URL

**Live store**:
The WordPress/WooCommerce storefront serving the apex domain, which this app replaces at
cutover. Distinct from _this site_, which is the Next.js app in this repo.
_Avoid_: current site, old site, production site, staging site
