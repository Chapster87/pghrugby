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

**Product detail page (PDP)**:
A buyable product page, one per Stripe-backed product (dues, golf outing, Steel City 7s,
donations). Rendered from an internal product route and rewritten to a clean root URL.
_Avoid_: flow page, product page, buy page

**Clean URL**:
The public root URL of a product detail page (e.g. `/dues`), produced by rewriting the
internal product route. Products win slug ownership over pages.
_Avoid_: pretty URL, friendly URL, nice URL
