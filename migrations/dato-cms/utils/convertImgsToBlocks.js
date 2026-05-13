import * as datoCmsClientNode from "@datocms/cma-client-node";
const { buildBlockRecord, SimpleSchemaTypes } = datoCmsClientNode;
import { visit, find } from "unist-utils-core";
import _datocmsHtmlToStructuredText from "datocms-html-to-structured-text";
const { HastNode, HastElementNode, CreateNodeFunction, Context, Options } =
  _datocmsHtmlToStructuredText;

/**
 * @typedef {object} UploadId
 * @property {string} id
 */

/**
 * @callback OnImageFunction
 * @param {HastElementNode} node
 * @returns {Promise<{ url: string | null }>}
 */

/**
 * @param {Record<string, { id: string }>} modelIds
 * @param {OnImageFunction} onImage
 * @returns {Options}
 */
export default function convertImgsToBlocks(modelIds, onImage) {
  return {
    preprocess: (tree) => {
      const liftedImages = new WeakSet();

      const body = find(
        tree,
        (node) =>
          (node.type === "element" && node.tagName === "body") ||
          node.type === "root",
      );

      visit(body, (node, index, parents) => {
        if (
          node.type !== "element" ||
          node.tagName !== "img" ||
          liftedImages.has(node) ||
          parents.length === 1
        ) {
          return;
        }

        const imgParent = parents[parents.length - 1];
        imgParent.children.splice(index, 1);

        let i = parents.length;
        let splitChildrenIndex = index;
        let childrenAfterSplitPoint = [];

        while (--i > 0) {
          const parent = parents[i];
          const parentsParent = parents[i - 1];

          childrenAfterSplitPoint = parent.children.splice(splitChildrenIndex);
          splitChildrenIndex = parentsParent.children.indexOf(parent);

          let nodeInserted = false;

          if (i === 1) {
            splitChildrenIndex += 1;
            parentsParent.children.splice(splitChildrenIndex, 0, node);
            liftedImages.add(node);

            nodeInserted = true;
          }

          splitChildrenIndex += 1;

          if (childrenAfterSplitPoint.length > 0) {
            parentsParent.children.splice(splitChildrenIndex, 0, {
              ...parent,
              children: childrenAfterSplitPoint,
            });
          }

          if (parent.children.length === 0) {
            splitChildrenIndex -= 1;
            parentsParent.children.splice(
              nodeInserted ? splitChildrenIndex - 1 : splitChildrenIndex,
              1,
            );
          }
        }
      });
    },
    // now that images are top-level, convert them into `block` dast nodes
    handlers: {
      img: async (createNode, node, _context) => {
        // console.log("--- convertImgsToBlocks img handler debug ---");
        // console.log("Node type:", node.type);
        // console.log("Node tag name:", node.tagName);
        // console.log("Node properties (raw):", node.properties);
        // console.log(
        //   "Node properties data-public-id:",
        //   node.properties["data-public-id"],
        // );
        // console.log(
        //   "Node properties data-srcset:",
        //   node.properties["data-srcset"],
        // );

        if (node.type !== "element" || !node.properties) {
          return;
        }

        const { src: url } = node.properties;

        // The normalization logic is now in migrate-pages.js, and it handles data: URIs by returning null.
        // We no longer need to explicitly skip here.
        const linkedImage = await onImage(node); // Pass the entire node now

        if (!linkedImage || !linkedImage.url) {
          console.warn(
            `Skipping image block creation due to invalid or null URL from onImage: ${url}`,
          );
          return null;
        }

        return createNode("block", {
          item: buildBlockRecord({
            item_type: {
              id: modelIds.external_image_block.id,
              type: "item_type",
            },
            url: linkedImage.url,
          }),
        });
      },
    },
  };
}
