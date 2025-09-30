# AI Coding Agent Instructions for the `pghrugby` Repository

## Overview

This repository contains two main projects:

1. **pghrugby**: A Next.js-based frontend application for an e-commerce platform.
2. **pghrugby-store**: A Medusa.js-based backend for managing commerce logic.

The projects are tightly integrated, with the frontend consuming APIs from the backend. The architecture leverages modern frameworks like Next.js (frontend) and Medusa.js (backend) to provide a performant and scalable e-commerce solution.

---

## Key Architectural Components

### Frontend (`pghrugby`)

- **Framework**: Next.js with TypeScript.
- **Styling**:
  - CSS Modules and Tailwind CSS.
  - Favor use of css modules for component-specific styles, using tailwind sparingly for simple fixes.
  - Global styles are defined in `src/styles`
  - prefer use of css variables for colors, fonts, etc.
  - use px units for everything except for font sizes, which should use rem units.
- **Features**:
  - Product pages, collections, cart, and checkout.
  - User account management.
  - Server-side rendering (SSR) and static site generation (SSG).
- **Key Directories**:
  - `src/app`: Contains Next.js app router components.
  - `src/components`: Reusable UI components.
  - `src/modules`: Feature-specific modules (e.g., `cart`, `checkout`).
  - `src/sanity`: Integration with Sanity CMS.

### Backend (`pghrugby-store`)

- **Framework**: Medusa.js.
- **Features**:
  - Commerce modules for products, orders, and payments.
  - Stripe integration for payments.
  - Webhooks for syncing data with external services.
- **Key Directories**:
  - `src/api`: API routes for admin and store operations.
  - `src/modules`: Custom Medusa modules.
  - `src/subscribers`: Event-driven logic (e.g., order confirmation emails).
  - `src/workflows`: Background jobs and workflows.

---

## Developer Workflows

### Setting Up the Environment

1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   - Copy `.env.template` to `.env.local` in both `pghrugby` and `pghrugby-store`.
   - Populate the required values (e.g., `NEXT_PUBLIC_STRIPE_KEY`).

### Running the Projects

- **Frontend**:

  ```bash
  pnpm dev
  ```

  Access the app at `http://localhost:3000`.

- **Backend**:
  ```bash
  pnpm start
  ```
  The Medusa server runs on `http://localhost:9000`.

### Testing

- Integration tests for the backend are located in `pghrugby-store/integration-tests`.
- Run tests:
  ```bash
  pnpm test
  ```

---

## Project-Specific Conventions

### Frontend

- **Component Organization**: Components are grouped by feature in `src/modules`.
- **State Management**: Context API is used for global state.
- **Styling**: Tailwind CSS utilities are preferred over custom CSS.

### Backend

- **Event-Driven Architecture**: Use `src/subscribers` for handling Medusa events.
- **Custom Modules**: Extend Medusa functionality in `src/modules`.
- **Workflows**: Long-running tasks are implemented in `src/workflows`.

---

## Integration Points

### Sanity CMS

- Used for managing content (e.g., product descriptions).
- Configuration files are in `pghrugby/src/sanity`.

### Stripe

- Handles payment processing.
- Requires `NEXT_PUBLIC_STRIPE_KEY` in `.env.local`.

### Medusa.js

- Core backend framework.
- Extend functionality via custom modules and subscribers.

---

## Examples

### Adding a New API Route (Backend)

1. Create a new file in `src/api/store`.
2. Define the route handler:

   ```typescript
   import { Router } from "express"

   const route = Router()

   route.get("/custom-endpoint", (req, res) => {
     res.json({ message: "Hello, world!" })
   })

   export default route
   ```

3. Register the route in `src/api/index.ts`.

### Adding a New Page (Frontend)

1. Create a new directory in `src/app` (e.g., `src/app/new-page`).
2. Add a `page.tsx` file:
   ```tsx
   export default function NewPage() {
     return <h1>New Page</h1>
   }
   ```

---

## Resources

- [Medusa Documentation](https://docs.medusajs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

For any questions or issues, refer to the README files in the respective project directories.
