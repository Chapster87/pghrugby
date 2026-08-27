# Handoff: WordPress to DatoCMS Article Migration

## Current Task Status

The primary goal has been to migrate content (categories and articles/posts) from a WordPress instance to DatoCMS. The migration scripts (`migrate-categories.js` and `migrate-articles.js`) have been developed and refined.

## Completed Work

- **`migrate-categories.js`**: Successfully created and verified. It migrates WordPress categories to DatoCMS, mapping `name`, `slug`, and `description`. It handles pagination for all categories and avoids duplicates.
- **`migrate-articles.js`**:
  - **Core Migration**: Basic article content (title, slug, author, excerpt, structured content) is handled.
  - **Category Linking**: WordPress category IDs are correctly mapped to DatoCMS `category` record IDs.
  - **Tag Mapping**: WordPress tags are converted to a list of strings and stored as a JSON-stringified array in the DatoCMS `tags` field (as required by a specific DatoCMS plugin). All WordPress tags (over 100) are fetched using pagination.
  - **`featured_image` (Cloudinary Picker)**: The script successfully extracts Cloudinary metadata from WordPress embedded media, formats it into a stringified JSON object, and sends it to the `featured_image` field in DatoCMS. This format was derived from inspecting existing DatoCMS records.

## Completed Work: `featured_image_json` Fallback Field

The implementation was successfully completed with the following findings:

1. **API Requirements**: In DatoCMS, all simple JSON fields sent via the Content Management API (CMA) must be sent as a **JSON-stringified string**, rather than a raw JavaScript object.
2. **Payload Update**:
   - `featured_image` continues to receive `JSON.stringify(cloudinaryObj)`.
   - `featured_image_json` has been updated to receive `featuredImageJson ? JSON.stringify(featuredImageJson) : null`.
3. **Verification**:
   - The test migration command was run for `forge-rugby-announces-2026-scholarship-winners`:
     ```bash
     cd pghrugby/migrations/dato-cms
     npx dotenv -c .\.env.local -- node migrate-articles.js --test-slug forge-rugby-announces-2026-scholarship-winners
     ```
   - **Creation Flow**: Verified and successfully created the article on the first run.
   - **Update Flow**: Verified and successfully updated the article on the second run.

All tasks outlined in this handoff have been resolved.

