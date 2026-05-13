// to run this script:
// npx dotenv -c .\.env.local -- node migrate-pages.js
// npx dotenv -c .\.env.local -- node migrate-pages.js --dry-run
// npx dotenv -c .\.env.local -- node migrate-pages.js --test-slug about

import axios from "axios";
import dotenv from "dotenv";
import { buildClient } from "@datocms/cma-client-node";
import { decode } from "html-entities";
import { JSDOM } from "jsdom"; // Import JSDOM at the top
// Polyfill DOMParser for Node.js environment
const { window } = new JSDOM("");
global.DOMParser = window.DOMParser;

// import htmlToDast from "./html-to-dast.js";
import htmlToStructuredText from "./utils/htmlToStructuredText.js";
import convertImgsToBlocks from "./utils/convertImgsToBlocks.js";
const WORDPRESS_URL = process.env.WORDPRESS_URL || "https://pghrugby.com";
const WORDPRESS_API_USERNAME = process.env.WORDPRESS_APP_USERNAME;
const WORDPRESS_API_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;
const DATOCMS_ENVIRONMENT = process.env.DATOCMS_ENVIRONMENT || "main"; // Default to 'main'

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
 * Normalizes a WordPress image URL to a consistent Cloudinary format.
 * @param {HastElementNode} node - The image HAST node.
 * @returns {string | null} The normalized Cloudinary URL, or null if no valid URL can be extracted.
 */
function normalizeUrl(node) {
  const {
    src,
    dataPublicId, // Use camelCase for data-public-id
    dataSrcset, // Use camelCase for data-srcset
  } = node.properties;

  let finalUrl = null;

  // console.log("--- normalizeUrl debug ---");
  // console.log("Original src:", src);
  // console.log("data-public-id:", dataPublicId);
  // console.log("data-srcset exists:", !!dataSrcset); // Check if it's truthy

  // Prioritize Cloudinary URL from data-srcset or data-public-id
  if (dataSrcset) {
    // Split the srcset string into individual entries.
    // The standard separator for srcset entries is a comma followed by a space.
    const srcsetEntries = dataSrcset.split(/,\s+/).map((s) => s.trim());
    // console.log("srcsetEntries (split by ', '):", srcsetEntries);

    let cloudinaryUrlCandidate = null;
    for (const entry of srcsetEntries) {
      const urlAndDescriptor = entry.split(" ");
      if (urlAndDescriptor[0].includes("res.cloudinary.com")) {
        cloudinaryUrlCandidate = urlAndDescriptor[0]; // This is the full Cloudinary URL for this specific entry
        break; // Take the first Cloudinary URL found
      }
    }
    // console.log(
    //   "Found cloudinaryUrlCandidate (full URL from entry):",
    //   cloudinaryUrlCandidate,
    // );

    if (cloudinaryUrlCandidate) {
      // Now apply the existing logic to clean this full URL by stripping query params and transformations
      let cleanedUrl = cloudinaryUrlCandidate.split("?")[0];
      // console.log("cleanedUrl after stripping query params:", cleanedUrl);

      const cloudinaryPathRegex =
        /(https:\/\/res.cloudinary.com\/dvwhsjqsl\/(?:image\/upload|images)\/)((?:[^/]+\/)*?)(.+)$/;
      const match = cleanedUrl.match(cloudinaryPathRegex);
      // console.log("Regex match result:", match);

      if (match && match.length === 4) {
        const baseUrlWithService = match[1];
        const publicIdPath = match[3];
        finalUrl = baseUrlWithService + publicIdPath; // Reconstruct without transformations
        // console.log("Final URL from srcset regex (success):", finalUrl);
      } else {
        // console.warn(
        //   "Regex failed to match Cloudinary path in srcset. Using cleanedUrl as fallback for srcset.",
        // );
        finalUrl = cleanedUrl; // Fallback if regex doesn't match
      }
    }
  }

  if (!finalUrl && dataPublicId) {
    // If no Cloudinary URL from srcset, but data-public-id exists, construct a basic Cloudinary URL
    // Assuming a base Cloudinary URL and path from data-public-id
    // Example: https://res.cloudinary.com/dvwhsjqsl/image/upload/v123456789/Crest/Crest.png
    // Given the previous task context, data-public-id is expected to be the full Cloudinary path after /upload/
    finalUrl = `https://res.cloudinary.com/dvwhsjqsl/image/upload/${dataPublicId}`;
    // console.warn(
    //   `Constructing Cloudinary URL from data-public-id: ${dataPublicId}. Please verify this path includes a version (e.g., v123456789/...) for optimal Cloudinary caching.`,
    // );
  }

  if (!finalUrl) {
    // Retain this warning as it indicates a failure to extract a hosted URL
    console.warn(
      `Skipping image: could not extract a valid hosted URL from node properties. Original src: ${src}`,
    );
    return null;
  }

  // Basic cleanup (remove redundant slashes, ensure HTTPS)
  let normalized = finalUrl.replace(/(?<!:)\/\/+/g, "/");
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }

  // Remove common WordPress image size suffixes from extracted Cloudinary URL
  normalized = normalized.replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, ".$1");

  return normalized;
}
// wp_id: strapi_id
const authorMap = {
  19: "VhyHpSpgQaSyapdNYbEtMw", // Forge
  1: "VhyHpSpgQaSyapdNYbEtMw", // Forge
  4: "brDR2k80RJqbDwzneyrM7w", // Me
  5: "K8lV1sM2SO-yiunu6WFGbQ", // Bill
  15: "XprDwB0JRFaggDKgfbMrIA", // Billy
  13: "GUrCF2uXSqiASLuXm2xgVg", // Hannah
};

// Map WordPress statuses to Strapi enumeration values
const statusMap = {
  publish: "published",
  future: "draft",
  draft: "draft",
  pending: "draft",
  private: "draft",
  trash: "draft",
  "auto-draft": "draft",
  inherit: "draft",
};

async function migratePages(dryRun = false, testSlug = null) {
  try {
    if (!DATOCMS_API_TOKEN) {
      console.error(
        "DatoCMS API token is missing. Please set DATOCMS_API_TOKEN in pghrugby/migrations/.env.local",
      );
      return;
    }

    // 1. Authenticate with WordPress
    console.log("Attempting to authenticate with WordPress...");
    if (!WORDPRESS_API_USERNAME || !WORDPRESS_API_PASSWORD) {
      console.error(
        "WordPress API username or password not set in pghrugby/migrations/.env.local.",
      );
      return;
    }

    const auth = Buffer.from(
      `${WORDPRESS_API_USERNAME}:${WORDPRESS_API_PASSWORD}`,
    ).toString("base64");

    const wpHeaders = {
      Authorization: `Basic ${auth}`,
    };

    // 2. Fetch pages from WordPress
    console.log("Fetching pages from WordPress...");
    let wordpressApiUrl = `${WORDPRESS_URL}/wp-json/wp/v2/pages?per_page=100&status=any`;
    if (testSlug) {
      wordpressApiUrl = `${WORDPRESS_URL}/wp-json/wp/v2/pages?slug=${testSlug}&status=any`;
      console.log(`Running in test mode for slug: ${testSlug}`);
    }

    const wpPagesResponse = await axios.get(wordpressApiUrl, {
      headers: wpHeaders,
    });
    let wpPages = wpPagesResponse.data;

    if (testSlug && wpPages.length === 0) {
      console.log(`No page found with slug: ${testSlug}`);
      return;
    }

    console.log(`Found ${wpPages.length} pages in WordPress.`);

    // Get DatoCMS "page" model ID
    const pageModel = await client.itemTypes.find("page"); // Assuming 'page' is the API ID of your DatoCMS page model
    if (!pageModel) {
      console.error(
        "DatoCMS 'page' model not found. Please check your DatoCMS setup.",
      );
      return;
    }
    const pageModelId = pageModel.id;
    console.log(`DatoCMS 'page' model ID: ${pageModelId}`);

    // Get DatoCMS "external_image_block" model ID
    const externalImageBlockModel = await client.itemTypes.find(
      "external_image_block",
    );
    if (!externalImageBlockModel) {
      console.error(
        "DatoCMS 'external_image_block' model not found. Please create an 'external_image_block' block model in DatoCMS with a single 'url' field.",
      );
      return;
    }
    const modelIds = {
      external_image_block: externalImageBlockModel,
    };

    const onImage = async (node) => {
      const normalizedUrl = normalizeUrl(node);
      if (!normalizedUrl) {
        return null; // Skip if no valid URL could be extracted
      }
      return { url: normalizedUrl }; // Directly return the normalized URL
    };

    // 3. Migrate pages to DatoCMS
    for (const wpPage of wpPages) {
      const decodedTitle = decode(wpPage.title?.rendered || "");
      const pageContent = wpPage.content?.rendered || "";
      // const dastHTML = await htmlToDast(pageContent);
      const structuredTextContent = await htmlToStructuredText(
        pageContent,
        convertImgsToBlocks(modelIds, onImage),
      );
      const datoCMSPayload = {
        item_type: { type: "item_type", id: pageModelId },
        title: decodedTitle,
        slug: wpPage.slug || "",
        author: authorMap[wpPage.author] || null,
        wpexcerpt: wpPage.excerpt?.rendered || null,
        content: structuredTextContent,
        wpcontent: pageContent,
        // featured_image:
        //   wpPage.featured_media > 0 ? wpPage.featured_media : null,
        meta_title: wpPage.yoast_head_json?.og_title
          ? decode(wpPage.yoast_head_json.og_title)
          : decodedTitle,
        meta_description: wpPage.yoast_head_json?.og_description || null,
        // meta_keywords: null,
        meta_image: JSON.stringify(wpPage.yoast_head_json?.og_image) || null,
        canonical_url: wpPage.yoast_head_json?.canonical || null,
        meta_robots: JSON.stringify(wpPage.yoast_head_json?.robots) || null,
        creation_date: wpPage.date_gmt
          ? new Date(wpPage.date_gmt).toISOString()
          : null,
        // Store raw WordPress data as JSON in a DatoCMS JSON field named 'wpData'
        wpdata: JSON.stringify(wpPage) || null,
      };

      console.log(
        `--- Processing Page: "${wpPage.title.rendered}" (WordPress ID: ${wpPage.id}) ---`,
      );
      console.log();

      let existingRecord = null;
      try {
        // Attempt to find an existing DatoCMS record by slug
        const records = await client.items.list({
          "filter[type]": pageModelId,
          "filter[fields][slug][eq]": wpPage.slug,
        });
        if (records.length > 0) {
          existingRecord = records[0];
          console.log(
            `Found existing DatoCMS record for slug "${wpPage.slug}" (DatoCMS ID: ${existingRecord.id})`,
          );
        }
      } catch (error) {
        console.warn(
          `Error searching for DatoCMS record by slug "${wpPage.slug}":`,
          error.message,
        );
      }

      if (dryRun) {
        console.log(
          `[DRY RUN] Would ${existingRecord ? "update" : "create"} page: ${wpPage.title.rendered}`,
        );
        // console.log(JSON.stringify(datoCMSPayload, null, 2)); // Comment out payload
      } else {
        // console.log(`[PAYLOAD] for ${wpPage.title.rendered}:`); // Comment out payload
        // console.log(JSON.stringify(datoCMSPayload, null, 2)); // Comment out payload
        if (existingRecord) {
          console.log(
            `Attempting to update DatoCMS record for: ${wpPage.title.rendered}`,
          );
          try {
            await client.items.update(existingRecord.id, datoCMSPayload);
            if (wpPage.status === "publish") {
              await client.items.publish(existingRecord.id); // Publish the updated record
              console.log(
                `Successfully updated and published DatoCMS page: ${wpPage.title.rendered} (ID: ${existingRecord.id})`,
              );
            } else {
              console.log(
                `Successfully updated DatoCMS page: ${wpPage.title.rendered} (ID: ${existingRecord.id})`,
              );
            }
          } catch (datoError) {
            console.error(
              `Error updating DatoCMS page ${wpPage.title.rendered} (ID: ${existingRecord.id}). DatoCMS API Response Error:`,
              datoError.statusCode,
              datoError.body || datoError.message,
            );
          }
        } else {
          console.log(
            `Attempting to create DatoCMS record for: ${wpPage.title.rendered}`,
          );
          try {
            const newRecord = await client.items.create(datoCMSPayload);
            if (wpPage.status === "publish") {
              await client.items.publish(newRecord.id); // Publish the newly created record
              console.log(
                `Successfully created and published DatoCMS page: ${wpPage.title.rendered}`,
              );
            } else {
              console.log(
                `Successfully updated DatoCMS page: ${wpPage.title.rendered}`,
              );
            }
          } catch (datoError) {
            console.error(
              `Error creating DatoCMS page ${wpPage.title.rendered}. DatoCMS API Response Error:`,
              datoError.statusCode,
              datoError.body || datoError.message,
            );
          }
        }
      }
    }
    console.log("Page migration complete.");
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
const testSlugIndex = args.indexOf("--test-slug");
let testSlugValue = null;
if (testSlugIndex > -1 && args[testSlugIndex + 1]) {
  testSlugValue = args[testSlugIndex + 1];
}

migratePages(dryRunFlag, testSlugValue);
