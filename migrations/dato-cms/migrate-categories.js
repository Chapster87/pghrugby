// to run this script:
// npx dotenv -c .\.env.local -- node migrate-categories.js
// npx dotenv -c .\.env.local -- node migrate-categories.js --dry-run

import axios from "axios";
import dotenv from "dotenv";
import { buildClient } from "@datocms/cma-client-node";
import { decode } from "html-entities";

const WORDPRESS_URL = process.env.WORDPRESS_URL || "https://pghrugby.com";
const WORDPRESS_API_USERNAME = process.env.WORDPRESS_APP_USERNAME;
const WORDPRESS_API_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;
const DATOCMS_ENVIRONMENT = process.env.DATOCMS_ENVIRONMENT || "main";

// Initialize DatoCMS client
let client;
if (DATOCMS_API_TOKEN) {
  client = buildClient({
    apiToken: DATOCMS_API_TOKEN,
    environment: DATOCMS_ENVIRONMENT,
  });
  console.log(
    `DatoCMS client initialized for environment: ${DATOCMS_ENVIRONMENT}`,
  );
} else {
  console.error(
    "DATOCMS_API_TOKEN not set in .env.local. DatoCMS operations will fail.",
  );
}

/**
 * Migrates WordPress categories to DatoCMS.
 * @param {boolean} dryRun - If true, only logs the operations without executing them.
 */
async function migrateCategories(dryRun = false) {
  try {
    if (!DATOCMS_API_TOKEN) {
      console.error("DatoCMS API token is missing.");
      return;
    }

    // 1. Authenticate with WordPress
    console.log("Attempting to authenticate with WordPress...");
    if (!WORDPRESS_API_USERNAME || !WORDPRESS_API_PASSWORD) {
      console.error("WordPress API credentials not set.");
      return;
    }

    const auth = Buffer.from(
      `${WORDPRESS_API_USERNAME}:${WORDPRESS_API_PASSWORD}`,
    ).toString("base64");
    const wpHeaders = { Authorization: `Basic ${auth}` };

    // 2. Fetch categories from WordPress
    console.log("Fetching categories from WordPress...");
    const wpCategoriesResponse = await axios.get(
      `${WORDPRESS_URL}/wp-json/wp/v2/categories?per_page=100`,
      {
        headers: wpHeaders,
      },
    );
    const wpCategories = wpCategoriesResponse.data;
    console.log(`Found ${wpCategories.length} categories in WordPress.`);

    // 3. Get DatoCMS "category" model ID
    const categoryModel = await client.itemTypes.find("category");
    if (!categoryModel) {
      console.error(
        "DatoCMS 'category' model not found. Please ensure it exists with API ID 'category'.",
      );
      return;
    }
    const categoryModelId = categoryModel.id;

    // 4. Migrate each category
    for (const wpCategory of wpCategories) {
      const decodedName = decode(wpCategory.name || "");
      const decodedDescription = decode(wpCategory.description || "");

      const datoCMSPayload = {
        item_type: { type: "item_type", id: categoryModelId },
        name: decodedName,
        slug: wpCategory.slug,
        description: decodedDescription,
      };

      console.log(
        `--- Processing Category: "${decodedName}" (WP ID: ${wpCategory.id}) ---`,
      );

      let existingRecord = null;
      try {
        // Look for existing record by slug
        const recordsBySlug = await client.items.list({
          "filter[type]": categoryModelId,
          "filter[fields][slug][eq]": wpCategory.slug,
        });
        if (recordsBySlug.length > 0) {
          existingRecord = recordsBySlug[0];
        }
      } catch (error) {
        console.warn(`Error searching for existing record: ${error.message}`);
      }

      if (dryRun) {
        console.log(
          `[DRY RUN] Would ${existingRecord ? "update" : "create"} category: ${decodedName}`,
        );
      } else {
        try {
          if (existingRecord) {
            console.log(`Updating DatoCMS record: ${existingRecord.id}`);
            await client.items.update(existingRecord.id, datoCMSPayload);
          } else {
            console.log(`Creating new DatoCMS record...`);
            const newRecord = await client.items.create(datoCMSPayload);
            await client.items.publish(newRecord.id);
          }
          console.log(`Successfully processed: ${decodedName}`);
        } catch (datoError) {
          console.error(
            `Error migrating category ${decodedName}:`,
            datoError.statusCode,
            datoError.body || datoError.message,
          );
        }
      }
    }

    console.log("Category migration complete.");
  } catch (error) {
    console.error(
      "Error during migration:",
      error.response?.data || error.message,
    );
  }
}

// Command line arguments parsing
const args = process.argv.slice(2);
const dryRunFlag = args.includes("--dry-run");

migrateCategories(dryRunFlag);
