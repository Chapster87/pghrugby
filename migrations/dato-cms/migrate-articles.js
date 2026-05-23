// to run this script:
// npx dotenv -c .\.env.local -- node migrate-articles.js
// npx dotenv -c .\.env.local -- node migrate-articles.js --dry-run
// npx dotenv -c .\.env.local -- node migrate-articles.js --test-slug forge-rugby-announces-2026-scholarship-winners

import axios from "axios";
import dotenv from "dotenv";
import { buildClient } from "@datocms/cma-client-node";
import { decode } from "html-entities";
import { JSDOM } from "jsdom";

const { window } = new JSDOM("");
global.DOMParser = window.DOMParser;

import htmlToStructuredText from "./utils/htmlToStructuredText.js";
import convertImgsToBlocks from "./utils/convertImgsToBlocks.js";

const WORDPRESS_URL = process.env.WORDPRESS_URL || "https://pghrugby.com";
const WORDPRESS_API_USERNAME = process.env.WORDPRESS_APP_USERNAME;
const WORDPRESS_API_PASSWORD = process.env.WORDPRESS_APP_PASSWORD;
const DATOCMS_API_TOKEN = process.env.DATOCMS_API_TOKEN;
const DATOCMS_ENVIRONMENT = process.env.DATOCMS_ENVIRONMENT || "main";

let client;
if (DATOCMS_API_TOKEN) {
  client = buildClient({
    apiToken: DATOCMS_API_TOKEN,
    environment: DATOCMS_ENVIRONMENT,
  });
  console.log(
    `DatoCMS client initialized for environment: ${DATOCMS_ENVIRONMENT}`,
  );
}

const authorMap = {
  19: "VhyHpSpgQaSyapdNYbEtMw", // Forge
  1: "VhyHpSpgQaSyapdNYbEtMw", // Forge
  4: "brDR2k80RJqbDwzneyrM7w", // Me
  5: "K8lV1sM2SO-yiunu6WFGbQ", // Bill
  15: "XprDwB0JRFaggDKgfbMrIA", // Billy
  13: "GUrCF2uXSqiASLuXm2xgVg", // Hannah
};

/**
 * Normalizes a WordPress image URL to a consistent Cloudinary format.
 */
function normalizeUrl(node) {
  const { src, dataPublicId, dataSrcset } = node.properties;
  let finalUrl = null;

  if (dataSrcset) {
    const srcsetEntries = dataSrcset.split(/,\s+/).map((s) => s.trim());
    let cloudinaryUrlCandidate = null;
    for (const entry of srcsetEntries) {
      const urlAndDescriptor = entry.split(" ");
      if (urlAndDescriptor[0].includes("res.cloudinary.com")) {
        cloudinaryUrlCandidate = urlAndDescriptor[0];
        break;
      }
    }

    if (cloudinaryUrlCandidate) {
      let cleanedUrl = cloudinaryUrlCandidate.split("?")[0];
      const cloudinaryPathRegex =
        /(https:\/\/res.cloudinary.com\/dvwhsjqsl\/(?:image\/upload|images)\/)((?:[^/]+\/)*?)(.+)$/;
      const match = cleanedUrl.match(cloudinaryPathRegex);
      if (match && match.length === 4) {
        finalUrl = match[1] + match[3];
      } else {
        finalUrl = cleanedUrl;
      }
    }
  }

  if (!finalUrl && dataPublicId) {
    finalUrl = `https://res.cloudinary.com/dvwhsjqsl/image/upload/${dataPublicId}`;
  }

  if (!finalUrl) return null;

  let normalized = finalUrl.replace(/(?<!:)\/\/+/g, "/");
  if (normalized.startsWith("http://"))
    normalized = normalized.replace("http://", "https://");
  normalized = normalized.replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)$/i, ".$1");

  return normalized;
}

async function migrateArticles(dryRun = false, testSlug = null) {
  try {
    if (!DATOCMS_API_TOKEN)
      return console.error("DatoCMS API token is missing.");

    const auth = Buffer.from(
      `${WORDPRESS_API_USERNAME}:${WORDPRESS_API_PASSWORD}`,
    ).toString("base64");
    const wpHeaders = { Authorization: `Basic ${auth}` };

    // 1. Fetch auxiliary data from WP
    console.log("Fetching categories and tags from WordPress...");
    const fetchAll = async (url) => {
      let results = [];
      let page = 1;
      while (true) {
        const res = await axios.get(`${url}&page=${page}`, {
          headers: wpHeaders,
        });
        results = results.concat(res.data);
        if (res.data.length < 100) break;
        page++;
      }
      return results;
    };

    const [wpCats, wpTags] = await Promise.all([
      fetchAll(`${WORDPRESS_URL}/wp-json/wp/v2/categories?per_page=100`),
      fetchAll(`${WORDPRESS_URL}/wp-json/wp/v2/tags?per_page=100`),
    ]);

    const wpCatMap = Object.fromEntries(wpCats.map((c) => [c.id, c.slug]));
    const wpTagMap = Object.fromEntries(
      wpTags.map((t) => [t.id, decode(t.name)]),
    );

    // 2. Fetch DatoCMS categories to map slugs to record IDs
    console.log("Fetching categories from DatoCMS...");
    const datoCats = await client.items.list({
      "filter[type]": "SpVPQiajSfyUD7PoRt3Ljg",
    }); // Category model ID
    const datoCatMap = Object.fromEntries(datoCats.map((c) => [c.slug, c.id]));

    // 3. Fetch posts from WordPress
    console.log("Fetching posts from WordPress...");
    let wpPostsUrl = `${WORDPRESS_URL}/wp-json/wp/v2/posts?per_page=100&status=any&_embed=true`;
    if (testSlug)
      wpPostsUrl = `${WORDPRESS_URL}/wp-json/wp/v2/posts?slug=${testSlug}&status=any&_embed=true`;
    const wpPostsRes = await axios.get(wpPostsUrl, { headers: wpHeaders });
    const wpPosts = wpPostsRes.data;
    console.log(`Found ${wpPosts.length} posts in WordPress.`);

    const articleModel = await client.itemTypes.find("article");
    const externalImageBlockModel = await client.itemTypes.find(
      "external_image_block",
    );
    const modelIds = { external_image_block: externalImageBlockModel };

    const onImage = async (node) => {
      const normalizedUrl = normalizeUrl(node);
      return normalizedUrl ? { url: normalizedUrl } : null;
    };

    for (const wpPost of wpPosts) {
      const decodedTitle = decode(wpPost.title?.rendered || "");
      const postContent = wpPost.content?.rendered || "";
      const structuredTextContent = await htmlToStructuredText(
        postContent,
        convertImgsToBlocks(modelIds, onImage),
      );

      // Resolve Featured Image
      let featuredImageData = null;
      let featuredImageJson = null;
      const featuredMedia = wpPost._embedded?.["wp:featuredmedia"]?.[0];
      if (featuredMedia && featuredMedia.source_url) {
        const sourceUrl = featuredMedia.source_url;
        // Parse Cloudinary details from URL
        // Example: https://res.cloudinary.com/dvwhsjqsl/images/f_auto,q_auto/v1778038949/cropped-Crest-2/cropped-Crest-2.png?_i=AA
        const cloudinaryRegex =
          /res\.cloudinary\.com\/([^/]+)\/(?:image\/upload|images)\/(?:[^/]+\/)?v(\d+)\/(.+)$/;
        const match = sourceUrl.match(cloudinaryRegex);

        if (match) {
          const cloudName = match[1];
          const version = match[2];
          const publicIdWithExt = match[3].split("?")[0];
          const publicId = publicIdWithExt.replace(/\.[^/.]+$/, "");
          const format = featuredMedia.mime_type?.split("/")[1] || "jpg";

          // Construct a clean, standard Cloudinary URL as DatoCMS expects
          const cleanUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v${version}/${publicIdWithExt}`;

          const cloudinaryObj = {
            public_id: publicId,
            id: publicId,
            version: parseInt(version),
            format: format,
            width: featuredMedia.media_details?.width || 0,
            height: featuredMedia.media_details?.height || 0,
            bytes: 0,
            created_at: new Date().toISOString(),
            duration: null,
            metadata: {},
            resource_type: "image",
            type: "upload",
            url: cleanUrl,
            secure_url: cleanUrl,
            tags: [],
            created_by: { type: "api", id: "migration" },
            uploaded_by: { type: "api", id: "migration" },
          };
          // In this specific DatoCMS setup, the JSON field expects a stringified object
          featuredImageData = JSON.stringify(cloudinaryObj);
          featuredImageJson = cloudinaryObj;
        }
      }

      // Resolve categories to DatoCMS record IDs
      const categoryIds = (wpPost.categories || [])
        .map((id) => wpCatMap[id])
        .filter(Boolean)
        .map((slug) => datoCatMap[slug])
        .filter(Boolean);

      // Resolve tags to string names
      const tagNames = (wpPost.tags || [])
        .map((id) => wpTagMap[id])
        .filter(Boolean);

      const datoCMSPayload = {
        item_type: { type: "item_type", id: articleModel.id },
        title: decodedTitle,
        slug: wpPost.slug || "",
        author: authorMap[wpPost.author] || null,
        wpexcerpt: wpPost.excerpt?.rendered || null,
        content: structuredTextContent,
        wpcontent: postContent,
        categories: categoryIds.length > 0 ? categoryIds : null,
        tags: tagNames.length > 0 ? JSON.stringify(tagNames) : null,
        featured_image: featuredImageData,
        featured_image_json: featuredImageJson ? JSON.stringify(featuredImageJson) : null,
        meta_title: wpPost.yoast_head_json?.og_title
          ? decode(wpPost.yoast_head_json.og_title)
          : decodedTitle,
        meta_description: wpPost.yoast_head_json?.og_description || null,
        meta_image: JSON.stringify(wpPost.yoast_head_json?.og_image) || null,
        canonical_url: wpPost.yoast_head_json?.canonical || null,
        meta_robots: JSON.stringify(wpPost.yoast_head_json?.robots) || null,
        creation_date: wpPost.date_gmt
          ? new Date(wpPost.date_gmt).toISOString()
          : null,
        wpdata: JSON.stringify(wpPost) || null,
      };

      console.log(
        `--- Processing Article: "${decodedTitle}" (WP ID: ${wpPost.id}) ---`,
      );

      let existingRecord = null;
      try {
        const records = await client.items.list({
          "filter[type]": articleModel.id,
          "filter[fields][slug][eq]": wpPost.slug,
        });
        if (records.length > 0) existingRecord = records[0];
      } catch (e) {
        console.warn(`Error searching for record: ${e.message}`);
      }

      if (dryRun) {
        console.log(
          `[DRY RUN] Would ${existingRecord ? "update" : "create"} article: ${decodedTitle}`,
        );
      } else {
        try {
          if (existingRecord) {
            await client.items.update(existingRecord.id, datoCMSPayload);
            console.log(`Updated article: ${decodedTitle}`);
          } else {
            const newRecord = await client.items.create(datoCMSPayload);
            if (wpPost.status === "publish")
              await client.items.publish(newRecord.id);
            console.log(`Created article: ${decodedTitle}`);
          }
        } catch (datoError) {
          console.error(
            `Error migrating ${decodedTitle}:`,
            datoError.statusCode,
            datoError.body || datoError.message,
          );
        }
      }
    }
    console.log("Article migration complete.");
  } catch (error) {
    console.error(
      "Error during migration:",
      error.response?.data || error.message,
    );
  }
}

const args = process.argv.slice(2);
const dryRunFlag = args.includes("--dry-run");
const testSlugIndex = args.indexOf("--test-slug");
let testSlugValue = null;
if (testSlugIndex > -1 && args[testSlugIndex + 1])
  testSlugValue = args[testSlugIndex + 1];

migrateArticles(dryRunFlag, testSlugValue);
