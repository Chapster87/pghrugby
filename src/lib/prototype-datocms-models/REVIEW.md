# DatoCMS Storefront Modeling — Updated Spec

This document records the final, decoupled architecture for our storefront.

## Core Architecture

- **`Product`**: Atomic editorial record, 1:1 with a Stripe SKU. Carries only editorial content (title, description, image).
- **`ProductDetailPage`**: The page container. Has its own slug, SEO fields, and a `Page Components` field.
- **`DataCollector`**: A generic block-based tool for collecting user input (replaces the rigid 'Form' concept). Contains a list of `DataField` blocks.

## Decisions

- **Decoupling**: We explicitly rejected "FlowGroup" models that contain products. Instead, `ProductDetailPage` records compose themselves by referencing atomic `Product` records and `DataCollector` records.
- **Independence**: `Product` records do not know about their parent pages or forms.
- **Flexibility**: `DataCollector` is now a generic tool, suitable for registration forms, T-shirt sizes, or any other user input needed.

## Schema Definition

| Model                 | API Key               | Fields                                                                       |
| :-------------------- | :-------------------- | :--------------------------------------------------------------------------- |
| **Product**           | `product`             | `title` (string), `sku` (string)                                             |
| **ProductDetailPage** | `product_detail_page` | `title`, `slug`, `page_components` (link field to Products & DataCollectors) |
| **DataCollector**     | `data_collector`      | `title`, `fields` (modular content block)                                    |
| **DataField**         | `data_field`          | `label`, `fieldName`, `fieldType`                                            |

## Routing Strategy

1. **URL Scheme**: Storefront PDPs use clean root slugs (e.g., `/dues`, `/golf-outing`).
2. **Implementation**:
   - `next.config.js` `beforeFiles` rewrites incoming `/product/[handle]` to the clean root slug.
   - `(core)/[slug]/page.tsx` acts as the unified entry point.
   - **Logic**: The route queries both `Page` (editorial) and `ProductDetailPage` (storefront) records. If the slug matches a `ProductDetailPage`, it renders the storefront layout; otherwise, it defaults to the standard editorial page layout.
