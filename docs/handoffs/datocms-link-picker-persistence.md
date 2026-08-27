# Handoff: DatoCMS Link Picker Persistence & UI Refinement

## Overview

This document summarizes the troubleshooting and hardening of the custom DatoCMS Link Picker plugin, specifically focusing on persistence issues within Structured Text blocks and SDK v2 compatibility.

## Current Status

The plugin's communication with the DatoCMS UI is now robust, but backend persistence (specifically data surviving a page refresh) remains an outstanding issue.

### Accomplishments

- **Fixed "Dirty" Form Detection**: The main DatoCMS "Save" button now correctly activates immediately upon any user input. This was achieved by:
  - Switching to immediate `setFieldValue` calls (removed debounce).
  - Explicitly providing the field's API Key to the `setFieldValue(apiKey, value)` call.
  - Implementing `onFieldValueChange` in `main.tsx` to align with SDK expectations.
- **Hardened State Management**: Implemented a `Ref`-based persistence architecture (`internalValueRef`). This ensures that during rapid DatoCMS re-initializations (common when saving blocks), the plugin uses its latest memory to re-push state if `ctx.value` is unexpectedly reset to `undefined`.
- **SDK Workaround (Model Picker)**: Resolved the "Couldn't find a model with ID [ID1,ID2]" error. Since `ctx.selectItem` in this environment appears limited to one model at a time, a "Pre-Selection" UI was implemented with separate buttons for **Pick Page** and **Pick Homepage**.
- **UI/UX Cleanup**:
  - Removed debug buttons and version labels.
  - Disabled redundant toast notifications.
  - Improved Next.js 15+ developer overlay hiding script (hides "N" logo and toasts).
  - Integrated `ctx.startAutoResizer()` for consistent iframe heights.

## Pending Issues

- **Refresh Clears Data**: Even though the main "Save" button works and the plugin logs "Save successful," the data is often lost after a full page refresh.
  - _Hypothesis 1_: backend validation error. The JSON structure might not perfectly match what DatoCMS expects for a custom block field.
  - _Hypothesis 2_: Record/Block ID mismatch. The console shows `cannot find record [ID] for a block node!`, which suggests a race condition where the block isn't fully committed before the plugin attempts its final save.

## Key Files

- `pghrugby/nextjs/src/app/(plugin)/private-datocms-plugin/_plugin/entrypoints/LinkPicker.tsx`: Primary logic and UI.
- `pghrugby/nextjs/src/app/(plugin)/private-datocms-plugin/_plugin/main.tsx`: Entry point and SDK registration.

## Suggested Skills

- **`browser_action`**: Use to inspect the browser console while performing a save and refresh cycle to see if DatoCMS returns a specific error body in the network tab.
- **`read_file`**: Examine the parent record's model configuration or the Structured Text field definition to ensure the `JSON` field allows the structure we are sending.

## Technical Notes for Next Agent

The plugin currently sends a JSON object with the following keys: `label`, `type`, `url`, `recordId`, `recordType`. Verify if DatoCMS backend requires these to be wrapped or if any keys are restricted.
