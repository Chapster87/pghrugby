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

**Clean URL**:
The public root URL of a product detail page (e.g. `/dues`), produced by rewriting the
internal product route. Products win slug ownership over pages.
_Avoid_: pretty URL, friendly URL, nice URL
