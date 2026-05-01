// To run this script:
// npx dotenv -c ..\pghrugby\nextjs\.env.local -- node migrate-pages.js
// npx dotenv -c ..\pghrugby\nextjs\.env.local -- node migrate-pages.js --dry-run
// npx dotenv -c ..\pghrugby\nextjs\.env.local -- node migrate-pages.js --test-slug about

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const cheerio = require("cheerio"); // For parsing HTML

const WORDPRESS_URL = "https://pghrugby.com";
const WORDPRESS_API_USERNAME = process.env.WORDPRESS_APP_USERNAME;
const WORDPRESS_API_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const STRAPI_URL = "http://localhost:1337"; // Assuming Strapi is running locally on default port
const STRAPI_API_TOKEN = process.env.STRAPI_API_KEY;

// Specific to WordPress URLs that might vary
const WORDPRESS_OLD_HOSTING_URL =
  "http://secure245.inmotionhosting.com/~pgphru5/";

/**
 * Normalizes a WordPress image URL to a consistent format.
 * - Replaces specific old hosting domains with the canonical WORDPRESS_URL.
 * - Ensures HTTPS for the canonical domain.
 * - Removes common image size suffixes if present to get a base image URL.
 * @param {string} url - The original WordPress image URL.
 * @returns {string} The normalized URL.
 */
function normalizeUrl(url) {
  if (!url) return url;

  let normalized = url.replace(WORDPRESS_OLD_HOSTING_URL, WORDPRESS_URL + "/");

  // Ensure HTTPS for the main WordPress domain
  if (
    normalized.startsWith("http://") &&
    normalized.includes(new URL(WORDPRESS_URL).hostname)
  ) {
    normalized = normalized.replace("http://", "https://");
  }

  // Remove common WordPress image size suffixes (e.g., -300x300.png) before the extension
  // This is crucial for matching the base image in the map.
  normalized = normalized.replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, ".$1");

  return normalized;
}

async function migratePages(dryRun = false, testSlug = null) {
  try {
    // 1. Authenticate with WordPress
    console.log("Attempting to authenticate with WordPress...");
    console.log(`WordPress Username: ${WORDPRESS_API_USERNAME}`);
    console.log(
      `WordPress Password: ${WORDPRESS_API_PASSWORD ? "********" : "NOT SET"}`,
    );

    if (!WORDPRESS_API_USERNAME || !WORDPRESS_API_PASSWORD) {
      console.error(
        "WordPress API username or password not set in .env.local.",
      );
      return;
    }

    const auth = Buffer.from(
      `${WORDPRESS_API_USERNAME}:${WORDPRESS_API_PASSWORD}`,
    ).toString("base64");
    console.log(
      `Generated Auth Header (first 10 chars): Basic ${auth.substring(0, 10)}...`,
    );

    const wpHeaders = {
      Authorization: `Basic ${auth}`,
    };

    // 2. Fetch pages from WordPress
    console.log("Fetching pages from WordPress...");
    let wordpressApiUrl = `${WORDPRESS_URL}/wp-json/wp/v2/pages?per_page=100`;
    if (testSlug) {
      wordpressApiUrl = `${WORDPRESS_URL}/wp-json/wp/v2/pages?slug=${testSlug}`;
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

    const authorMap = {
      1: 1, // Forge
      4: 4, // Andy Chapman
      5: 5, // Bill Marnell
      15: 2, // Billy Gordon
      13: 3, // Hannah Zibert
    };

    // Map WordPress statuses to Strapi enumeration values
    const statusMap = {
      publish: "publish",
      future: "future",
      draft: "draft",
      pending: "pending",
      private: "private",
      trash: "trash",
      "auto-draft": "auto-draft",
      inherit: "inherit",
      // Add any other WordPress statuses that need mapping to a default Strapi status
      // e.g., "any_other_wp_status": "draft"
    };

    const IMAGE_MAP_FILE = path.join(__dirname, "image-map.json");
    let imageMap = {};
    try {
      const data = await fs.readFile(IMAGE_MAP_FILE, "utf8");
      imageMap = JSON.parse(data);
      console.log(
        `Loaded ${Object.keys(imageMap).length} image mappings for page content relinking.`,
      );
    } catch (error) {
      if (error.code === "ENOENT") {
        console.warn(
          "No image-map.json found. Images in content might not be relinked.",
        );
      } else {
        console.error("Error loading image map for pages:", error);
      }
    }

    console.log(`Found ${wpPages.length} pages in WordPress.`);

    // 3. Migrate pages to Strapi
    const strapiHeaders = {
      Authorization: `Bearer ${STRAPI_API_TOKEN}`,
      "Content-Type": "application/json",
    };

    for (const wpPage of wpPages) {
      const strapiPageData = {
        data: {
          title: wpPage.title.rendered,
          slug: wpPage.slug,
          excerpt: wpPage.excerpt.rendered,
          status: statusMap[wpPage.status] || "draft", // Default to "draft" if status is not mapped
          publishedAt: wpPage.date_gmt
            ? new Date(wpPage.date_gmt).toISOString()
            : null,
          creationDate: wpPage.date_gmt
            ? new Date(wpPage.date_gmt).toISOString()
            : null,
          lastModified: wpPage.modified_gmt
            ? new Date(wpPage.modified_gmt).toISOString()
            : null,
          author: authorMap[wpPage.author],
          seo: {
            metaTitle: wpPage.yoast_head_json?.title || wpPage.title.rendered,
            metaDescription:
              wpPage.yoast_head_json?.description || wpPage.excerpt.rendered,
            canonicalURL: wpPage.yoast_head_json?.canonical || null,
            metaRobots: wpPage.yoast_head_json?.robots || null,
          },
          wpData: wpPage || null, // drops a copy of export into an attr to save data
        },
      };

      // Handle featured media
      if (wpPage.featured_media && wpPage.featured_media > 0) {
        const mappedImage = imageMap[wpPage.featured_media.toString()]; // WP ID should be string key
        if (mappedImage && mappedImage.strapiId) {
          strapiPageData.data.featured_media = mappedImage.strapiId;
          console.log(
            `Linked featured media for "${wpPage.title.rendered}" (WP ID: ${wpPage.featured_media}) to Strapi Asset ID: ${mappedImage.strapiId}`,
          );
        } else {
          console.warn(
            `Featured media for "${wpPage.title.rendered}" (WP ID: ${wpPage.featured_media}) not found in image map. Skipping.`,
          );
        }
      }

      // Process content for embedded images
      if (wpPage.content && wpPage.content.rendered) {
        let processedContent = wpPage.content.rendered;
        const $ = cheerio.load(processedContent);

        $("img").each((_, element) => {
          const $img = $(element);
          const originalSrc = $img.attr("src");
          if (originalSrc) {
            const normalizedSrc = normalizeUrl(originalSrc);
            const mappedImage = imageMap[normalizedSrc];
            if (mappedImage && mappedImage.strapiUrl) {
              // Prepend STRAPI_URL to make the URL absolute
              const absoluteStrapiUrl = `${STRAPI_URL}${mappedImage.strapiUrl}`;
              $img.attr("src", absoluteStrapiUrl);
              console.log(
                `Relinked image SRC: ${originalSrc} (normalized: ${normalizedSrc}) -> ${absoluteStrapiUrl}`,
              );
            } else {
              console.warn(
                `Image SRC "${originalSrc}" (normalized: ${normalizedSrc}) not found in map for page "${wpPage.title.rendered}". Keeping original.`,
              );
            }
          }

          const originalSrcset = $img.attr("srcset");
          if (originalSrcset) {
            const newSrcset = originalSrcset
              .split(",")
              .map((s) => {
                const parts = s.trim().split(" ");
                const url = parts[0];
                const descriptor = parts[1];
                const normalizedUrl = normalizeUrl(url);
                const mappedImage = imageMap[normalizedUrl];
                if (mappedImage && mappedImage.strapiUrl) {
                  // Prepend STRAPI_URL to make the URL absolute for srcset
                  const absoluteStrapiUrl = `${STRAPI_URL}${mappedImage.strapiUrl}`;
                  return `${absoluteStrapiUrl} ${descriptor}`;
                }
                return s; // Keep original if not found
              })
              .join(", ");
            $img.attr("srcset", newSrcset);
            // console.log(`Relinked image SRCSET for: ${originalSrc}`);
          }
        });
        strapiPageData.data.content = $("body").html(); // Save the modified HTML content without the html/head/body wrapper
      } else {
        strapiPageData.data.content = ""; // Ensure content is not null if empty
      }

      if (dryRun) {
        console.log(`[DRY RUN] Would migrate page: ${wpPage.title.rendered}`);
        console.log(JSON.stringify(strapiPageData, null, 2));
      } else {
        console.log(`Attempting to post to Strapi: ${STRAPI_URL}/api/pages`);
        // console.log("Payload:", JSON.stringify(strapiPageData, null, 2)); // Log the payload
        console.log("wpPage:", wpPage);
        try {
          await axios.post(`${STRAPI_URL}/api/wp-pages`, strapiPageData, {
            headers: strapiHeaders,
          });
          console.log(`Successfully migrated page: ${wpPage.title.rendered}`);
        } catch (strapiError) {
          console.error(
            `Error migrating page ${wpPage.title.rendered}. Strapi API Response Error:`,
            strapiError.response?.status,
            strapiError.response?.data,
            strapiError.message,
          );
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
