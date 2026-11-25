---
name: Pittsburgh Forge Rugby Club
description: Black-and-gold matchday system for a historic two-side rugby club
colors:
  stadium-gold: "#ffb81c"
  stadium-gold-light: "#ffd75e"
  anvil-black: "#222222"
  signal-red: "#c60c30"
  forge-grey-800: "#343a40"
  forge-grey-700: "#495057"
  forge-grey-600: "#6c757d"
  forge-grey-300: "#dee2e6"
  forge-grey-100: "#f8f9fa"
  chalk-white: "#ffffff"
  success-green: "#198754"
  info-blue: "#377cfb"
typography:
  display:
    fontFamily: "Oswald, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "2.5rem"
    fontWeight: 500
    lineHeight: 1.1
  headline:
    fontFamily: "Oswald, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 500
    lineHeight: 1.4
  title:
    fontFamily: "Oswald, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 500
    lineHeight: 1.1
  body:
    fontFamily: "Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Noto Sans, Helvetica Neue, Helvetica, Arial, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.stadium-gold}"
    textColor: "{colors.anvil-black}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.stadium-gold-light}"
  button-secondary:
    backgroundColor: "{colors.forge-grey-800}"
    textColor: "{colors.chalk-white}"
    rounded: "{rounded.sm}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "#4b5563"
  field-control:
    backgroundColor: "{colors.chalk-white}"
    textColor: "{colors.anvil-black}"
    rounded: "{rounded.sm}"
    padding: "8px 12px"
  badge:
    backgroundColor: "{colors.chalk-white}"
    textColor: "{colors.anvil-black}"
    rounded: "{rounded.lg}"
    padding: "8px 16px"
  nav-link:
    textColor: "{colors.chalk-white}"
    padding: "16px 0"
---

# Design System: Pittsburgh Forge Rugby Club

## Overview

**Creative North Star: "Forged Steel"**

The system is built on Pittsburgh's black-and-gold sports grammar: a near-black field, a single hot gold that behaves like stadium light, and condensed Oswald headlines that read like a matchday program. It is not a generic rugby template and not a polished SaaS product — it is a club that has been around, competes, and fields both a women's and a men's side.

The ambition is split by surface. Marketing surfaces (home, club story, matchday) lean gritty and proud: bold type, strong black/gold blocks, real photography, a gold rule that slides under a nav link like a scoreboard light. Data and commerce surfaces (standings, schedules, checkout, registration) lean sharp and modern: tight radii, high contrast, legible forms, and no decoration competing with the task.

Depth is deliberately flat. The page is a printed program, not a stack of floating cards; shadows appear only where something genuinely floats above the page (menus, badges) or responds to state.

**Key Characteristics:**
- Black-and-gold palette with one red reserved for error and required states.
- Oswald for headings, Noto Sans for body and UI.
- Tight radii (4px controls, 8px panels, 12px badges).
- Flat surfaces; shadows only for floating elements and state.
- 8px spacing grid, 1536px max container.

## Colors

A black-and-gold palette with a single red signal; gold carries identity and action, black carries weight and text.

### Primary
- **Stadium Gold** (#ffb81c): primary buttons, the nav underline, links on dark surfaces, and brand accents. This is the club's voice.
- **Stadium Gold Light** (#ffd75e): hover state for gold elements; never a resting fill.

### Secondary
- **Anvil Black** (#222222): body text on light surfaces, dark section backgrounds, the header base.
- **Forge Grey 800** (#343a40): secondary button fill and dark panels.

### Tertiary
- **Signal Red** (#c60c30): errors, invalid fields, required marks, and danger only.

### Neutral
- **Chalk White** (#ffffff): page surface and field backgrounds.
- **Forge Grey 100** (#f8f9fa): disabled fields and subtle fills.
- **Forge Grey 300** (#dee2e6): dividers and rules.
- **Forge Grey 600** (#6c757d): placeholders and muted text.
- **Forge Grey 700** (#495057): borders on dark panels.

### Named Rules
**The Black-and-Gold Rule.** Gold marks action and identity — primary buttons, the nav underline, links on dark. It is not a decorative wash; keep it to accents and primary actions.

**The Signal Red Rule.** Red means something is wrong or required. Never use it for emphasis, brand, or decoration.

## Typography

**Display Font:** Oswald (with Helvetica Neue, Helvetica, Arial, sans-serif)
**Body Font:** Noto Sans (with Helvetica Neue, Helvetica, Arial, sans-serif)
**Brand Face:** Lemon Milk is loaded and available for brand/display moments but is not currently applied anywhere. Reserve it; don't introduce it casually.

**Character:** Oswald's condensed weight gives headlines a matchday-program urgency; Noto Sans keeps long-form editorial and dense forms readable. The pairing is athletic without becoming a poster everywhere.

### Hierarchy
- **Display** (500, 2.5rem, 1.1): page and hero headlines.
- **Headline** (500, 1.5rem, 1.4): section headings.
- **Title** (500, 1.125rem, 1.1): card and subsection titles.
- **Body** (400, 1rem, 1.6): prose, forms, and UI copy.
- **Label** (600, 0.875rem, 0.08em uppercase): group headings and eyebrow labels.

### Named Rules
**The Oswald-For-Headings Rule.** Headings are Oswald; body and UI are Noto Sans. Never set body copy in Oswald.

## Layout

A centered container capped at 1536px with 12px gutters. The system is mobile-first, with breakpoints at 320, 480, 640, 768, 1024, 1280, and 1536px. Spacing follows an 8px grid (4px for tight internal gaps), and prose keeps a comfortable measure rather than stretching to the container.

The header is sticky and translucent: a dark `rgba(0,0,0,0.45)` field with a 5px backdrop blur and a 2px gold bottom border. On large screens the crest sits above the nav and shrinks as the header sticks.

## Elevation & Depth

Flat by default. Depth is conveyed by tonal layering — Anvil Black against Chalk White — and by the header's 2px gold rule, not by ambient shadows. Shadows are reserved for elements that genuinely float above the page and for state feedback.

### Shadow Vocabulary
- **floating-menu** (`box-shadow: 0 12px 32px rgba(0, 0, 0, 0.45)`): navigation dropdowns and overlays.
- **badge-rest** (`box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08)`): inline badges.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only on floating elements and in response to state.

## Shapes

Tight, structural geometry. Controls and buttons use a 4px radius, menus and panels 8px, badges 12px. Borders are thin (1px) and functional; the header uses a 2px gold rule as its one heavy line. No pill shapes and no large rounding — the form language is a printed program, not a soft app.

## Components

### Buttons
- **Shape:** 4px radius, inline-flex, 8px gap, 600 weight.
- **Primary:** Stadium Gold background, Anvil Black text, `10px 16px` padding.
- **Hover:** background shifts to Stadium Gold Light.
- **Secondary:** Forge Grey 800 background, white text; hover `#4b5563`.
- **Sizes:** small `4px 8px` / 14px; large `12px 24px` / 18px.
- **Focus:** 2px gold outline with `-2px` offset on nav and cart controls.

### Chips / Badges
- **Style:** 12px radius, `8px 16px` padding, 500 weight, white background, soft `0 2px 8px` shadow.

### Cards / Containers
- **Corner Style:** 8px for menus and panels.
- **Background:** Anvil Black or Forge Grey 800 on dark surfaces; white on light.
- **Shadow Strategy:** none at rest (see Elevation & Depth).
- **Border:** 1px Forge Grey 700 on dark panels.

### Inputs / Fields
- **Style:** 4px radius, 1px `#ccc` border, white background, `8px 12px` padding, max-width 420px.
- **Focus:** gold border with a 1px gold outline.
- **Error / Disabled:** Signal Red border and label on error; Forge Grey 100 background when disabled.

### Navigation
- **Style:** sticky dark translucent header, 5px blur, 2px gold bottom border.
- **Links:** 18px, 600 weight, white; hover slides a 3px gold underline in from the left.
- **Dropdown:** Anvil Black panel, 8px radius, 1px Forge Grey 700 border, floating-menu shadow.
- **Mobile:** full-screen Anvil Black overlay, 18px links, gold hover.

## Do's and Don'ts

### Do:
- **Do** use Stadium Gold for primary actions and the nav underline.
- **Do** set headings in Oswald and body/UI in Noto Sans.
- **Do** keep radii tight: 4px controls, 8px panels, 12px badges.
- **Do** space on the 8px grid.
- **Do** keep surfaces flat at rest and reserve shadows for floating elements and state.

### Don't:
- **Don't** use Signal Red for emphasis, brand, or decoration.
- **Don't** introduce pill shapes or large corner radii.
- **Don't** add ambient shadows to resting cards.
- **Don't** set body copy in Oswald.
- **Don't** apply Lemon Milk casually; it is reserved for brand/display moments.
