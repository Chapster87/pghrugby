// To run this script (full migration):
// npx dotenv -c ..\pghrugby\nextjs\.env.local -- node migrate-wp-images-to-strapi.js

// To run in test mode (migrates the first 10 images):
// npx dotenv -c ..\pghrugby\nextjs\.env.local -- node migrate-wp-images-to-strapi.js --test

const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const cheerio = require("cheerio"); // For parsing HTML
const FormData = require("form-data"); // For Node.js compatible FormData

const WORDPRESS_URL = "https://pghrugby.com";
const WORDPRESS_API_USERNAME = process.env.WORDPRESS_APP_USERNAME;
const WORDPRESS_API_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const STRAPI_URL = "http://localhost:1337";
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

const IMAGE_MAP_FILE = path.join(__dirname, "image-map.json");

const wpHeaders = {};
const strapiHeaders = {
  Authorization: `Bearer ${STRAPI_API_TOKEN}`,
  "Content-Type": "application/json",
};

// Store unique image data: { wordpressUrlOrId: { strapiId: number, strapiUrl: string } }
let imageMap = {};

async function initializeAuth() {
  if (!WORDPRESS_API_USERNAME || !WORDPRESS_API_PASSWORD) {
    console.error("WordPress API username or password not set in .env.local.");
    throw new Error("WordPress credentials missing.");
  }
  const auth = Buffer.from(
    `${WORDPRESS_API_USERNAME}:${WORDPRESS_API_PASSWORD}`,
  ).toString("base64");
  wpHeaders.Authorization = `Basic ${auth}`;
}

async function loadExistingImageMap() {
  try {
    const data = await fs.readFile(IMAGE_MAP_FILE, "utf8");
    imageMap = JSON.parse(data);
    console.log(
      `Loaded ${Object.keys(imageMap).length} existing image mappings.`,
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log("No existing image map found. Starting fresh.");
    } else {
      console.error("Error loading image map:", error);
    }
  }
}

async function saveImageMap() {
  await fs.writeFile(IMAGE_MAP_FILE, JSON.stringify(imageMap, null, 2), "utf8");
  console.log(`Image map saved to ${IMAGE_MAP_FILE}`);
}

async function fetchWordPressPostsAndPages() {
  console.log("Fetching all WordPress posts and pages to extract images...");
  const allWpEntities = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const postsUrl = `${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=100&page=${page}`;
    const pagesUrl = `${WORDPRESS_URL}/wp-json/wp/v2/pages?per_page=100&page=${page}`;

    const [postsResponse, pagesResponse] = await Promise.all([
      axios.get(postsUrl, { headers: wpHeaders }).catch((e) => {
        console.error(`Error fetching posts page ${page}:`, e.message);
        return { data: [] };
      }),
      axios.get(pagesUrl, { headers: wpHeaders }).catch((e) => {
        console.error(`Error fetching pages page ${page}:`, e.message);
        return { data: [] };
      }),
    ]);

    const currentPosts = postsResponse.data;
    const currentPages = pagesResponse.data;

    allWpEntities.push(...currentPosts, ...currentPages);

    if (currentPosts.length === 0 && currentPages.length === 0) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log(`Found ${allWpEntities.length} WordPress posts and pages.`);
  return allWpEntities;
}

async function extractImageUrls(wpEntities) {
  const uniqueImageUrls = new Set();
  const uniqueMediaIds = new Set();

  for (const entity of wpEntities) {
    // Extract featured media ID
    if (entity.featured_media && entity.featured_media > 0) {
      uniqueMediaIds.add(entity.featured_media);
    }

    // Extract images from content
    if (entity.content && entity.content.rendered) {
      const $ = cheerio.load(entity.content.rendered);
      $("img").each((_, element) => {
        const src = $(element).attr("src");
        if (src) uniqueImageUrls.add(normalizeUrl(src));

        const srcset = $(element).attr("srcset");
        if (srcset) {
          srcset.split(",").forEach((s) => {
            const urlMatch = s.trim().match(/^(\S+)\s+\S+$/);
            if (urlMatch && urlMatch[1]) {
              uniqueImageUrls.add(normalizeUrl(urlMatch[1]));
            }
          });
        }
      });
    }

    // Extract images from Yoast SEO schema (often includes og:image)
    if (entity.yoast_head_json && entity.yoast_head_json.og_image) {
      for (const img of entity.yoast_head_json.og_image) {
        if (img.url) {
          uniqueImageUrls.add(normalizeUrl(img.url)); // Normalize here too
        }
      }
    }
  }

  console.log(
    `Extracted ${uniqueImageUrls.size} unique image URLs and ${uniqueMediaIds.size} unique media IDs.`,
  );
  return {
    uniqueImageUrls: Array.from(uniqueImageUrls),
    uniqueMediaIds: Array.from(uniqueMediaIds),
  };
}

async function fetchMediaMetadata(mediaIds) {
  if (mediaIds.length === 0) return {};
  console.log(
    `Fetching metadata for ${mediaIds.length} WordPress media items...`,
  );
  const metadataMap = {};
  // WordPress API only allows fetching one media item at a time by ID reliably,
  // or a list that might exceed URL length. Fetch individually.
  for (const id of mediaIds) {
    try {
      if (imageMap[id]) {
        // Skip if already mapped
        metadataMap[id] = { source_url: imageMap[id].originalUrl }; // Store originalUrl from map
        continue;
      }
      const response = await axios.get(
        `${WORDPRESS_URL}/wp-json/wp/v2/media/${id}`,
        { headers: wpHeaders },
      );
      if (response.data && response.data.source_url) {
        metadataMap[id] = { source_url: response.data.source_url };
      }
    } catch (error) {
      console.error(
        `Error fetching media metadata for ID ${id}:`,
        error.message,
      );
    }
  }
  return metadataMap;
}

async function uploadImageToStrapi(imageUrl, wpId = null) {
  // Check if this image (by its original URL or WP ID) is already mapped
  const mapKey = wpId ? wpId.toString() : imageUrl; // The key for map lookup should be consistent
  if (imageMap[mapKey]) {
    // console.log(`Image ${mapKey} already migrated. Skipping.`);
    return imageMap[mapKey];
  }

  try {
    const imageResponse = await axios.get(imageUrl, {
      responseType: "stream", // Use stream to directly pipe to FormData
      headers: {
        ...wpHeaders, // Include WP auth if the image URL is on the WP domain and requires it
        Referer: WORDPRESS_URL, // Some servers check referer
      },
    });

    const formData = new FormData();
    formData.append(
      "files",
      imageResponse.data, // Stream the data directly
      {
        filename: path.basename(new URL(imageUrl).pathname),
        contentType: imageResponse.headers["content-type"], // Get content type from response
      },
    );

    const uploadResponse = await axios.post(
      `${STRAPI_URL}/api/upload`,
      formData,
      {
        headers: {
          ...strapiHeaders,
          ...formData.getHeaders(), // Get headers for multipart/form-data
        },
      },
    );

    if (uploadResponse.data && uploadResponse.data.length > 0) {
      const strapiAsset = uploadResponse.data[0];
      const newMapEntry = {
        strapiId: strapiAsset.id,
        strapiUrl: strapiAsset.url,
        originalUrl: imageUrl, // Store the original, potentially unnormalized URL for reference
      };
      // Store the mapping with the normalized URL as the key for consistency in lookup
      imageMap[normalizeUrl(imageUrl)] = newMapEntry;
      if (wpId) {
        imageMap[wpId.toString()] = newMapEntry; // Also map by WP ID
      }
      console.log(`Uploaded and mapped: ${imageUrl} -> ${strapiAsset.url}`);
      return newMapEntry;
    }
  } catch (error) {
    console.error(
      `Error uploading image ${imageUrl} to Strapi:`,
      error.message,
    );
    if (error.response) {
      console.error(
        "Strapi response:",
        error.response.status,
        error.response.data,
      );
    }
    // Optionally, store failed images for review
    imageMap[mapKey] = { originalUrl: imageUrl, error: error.message };
    return null;
  }
}

async function migrateImages(testMode = false) {
  await initializeAuth();
  await loadExistingImageMap();

  const wpEntities = await fetchWordPressPostsAndPages();
  const { uniqueImageUrls, uniqueMediaIds } =
    await extractImageUrls(wpEntities);

  const mediaMetadata = await fetchMediaMetadata(uniqueMediaIds);

  const allImageSourcesToMigrate = new Set();
  for (const imageUrl of uniqueImageUrls) {
    allImageSourcesToMigrate.add(imageUrl); // These are already normalized by extractImageUrls
  }
  for (const id of uniqueMediaIds) {
    if (mediaMetadata[id] && mediaMetadata[id].source_url) {
      allImageSourcesToMigrate.add(normalizeUrl(mediaMetadata[id].source_url));
    }
  }

  const imagesToProcess = Array.from(allImageSourcesToMigrate);

  if (testMode) {
    const numImagesToMigrate = Math.min(10, imagesToProcess.length);
    if (numImagesToMigrate === 0) {
      console.log("No images found to test.");
      return;
    }
    console.log(
      `Running in test mode: Migrating the first ${numImagesToMigrate} images.`,
    );

    const testUploadPromises = [];
    for (let i = 0; i < numImagesToMigrate; i++) {
      const imageUrl = imagesToProcess[i];
      // Note: wpId lookup here still uses original metadata source_url for a more accurate map key creation during upload.
      // The imageMap will store the normalized URL as its key.
      const wpId = uniqueMediaIds.find(
        (id) => normalizeUrl(mediaMetadata[id]?.source_url) === imageUrl, // Compare normalized URLs
      );
      testUploadPromises.push(uploadImageToStrapi(imageUrl, wpId));
      // To avoid overwhelming APIs, uncomment and adjust if needed:
      // await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }
    await Promise.allSettled(testUploadPromises);
  } else {
    console.log(
      `Starting migration of ${imagesToProcess.length} unique image sources.`,
    );

    const uploadPromises = [];
    for (const imageUrl of imagesToProcess) {
      const wpId = uniqueMediaIds.find(
        (id) => normalizeUrl(mediaMetadata[id]?.source_url) === imageUrl, // Compare normalized URLs
      );
      uploadPromises.push(uploadImageToStrapi(imageUrl, wpId));
      // To avoid overwhelming APIs, uncomment and adjust if needed:
      // await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
    }

    await Promise.allSettled(uploadPromises); // Allow some to fail without stopping others
  }

  await saveImageMap();
  console.log("Image migration process complete.");
}

// Command line arguments parsing
const args = process.argv.slice(2);
const testFlag = args.includes("--test");

migrateImages(testFlag).catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
