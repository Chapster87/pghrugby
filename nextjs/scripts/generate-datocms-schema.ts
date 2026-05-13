import fs from "fs-extra"
import { execSync } from "child_process"
import path from "path"
import dotenv from "dotenv"

// Load environment variables from the .env.local file located in the nextjs directory
dotenv.config({ path: path.resolve(__dirname, "../.env.local") })

const DATACMA_FULL_API_TOKEN = process.env.DATACMA_FULL_API_TOKEN

if (!DATACMA_FULL_API_TOKEN) {
  console.error("Error: DATACMA_FULL_API_TOKEN is not defined in .env.local")
  process.exit(1)
}

const NEXTJS_DIR = path.resolve(__dirname, "..") // Set NEXTJS_DIR to the parent directory of the script (pghrugby/nextjs)
const TEMP_TS_SCHEMA_FILE = path.join(NEXTJS_DIR, "temp_datocms_schema.ts") // Temporary TypeScript schema file
const FINAL_GQL_SCHEMA_FILE = path.join(NEXTJS_DIR, "schema.graphql") // Final GraphQL SDL output file

/**
 * Maps DatoCMS field types to GraphQL SDL types.
 * @param datoCMSType The DatoCMS type string.
 * @param fieldName The name of the field, used for link type inference.
 * @returns The corresponding GraphQL SDL type.
 */
function mapDatoCMSTypeToGraphQL(
  datoCMSType: string,
  fieldName: string
): string {
  switch (datoCMSType) {
    case "string":
    case "text":
    case "slug":
    case "date_time": // Represent date_time as String for simplicity. Could be a custom DateTime scalar.
      return "String"
    case "integer":
      return "Int"
    case "json":
      // Check for specific field names that should map to DatoCmsCloudinaryUrl
      if (fieldName === "cloudinary_url") {
        return "DatoCmsCloudinaryUrl"
      }
      return "JSON" // Custom scalar
    case "file":
      return "DatoCmsFile" // Custom type
    case "gallery":
      return "[DatoCmsFile!]" // Array of custom file type
    case "seo":
      return "DatoCmsSeo" // Custom type
    case "link":
      // This is a simplification. For actual linked types, we'd need more context
      // from the ItemTypeDefinition to know what specific type it links to.
      // For now, try to infer from fieldName or use a generic ID.
      // Example: 'author' field might link to 'WpAuthor'.
      if (fieldName.includes("author")) return "WpAuthor"
      if (fieldName.includes("category")) return "WpCategory"
      // Fallback for unknown link types
      return "ID"
    case "links":
      // Similar to 'link', for arrays of linked types.
      if (fieldName.includes("tags")) return "[WpArticle!]" // Assuming WpArticle if tags
      if (fieldName.includes("categories")) return "[WpCategory!]"
      return "[ID!]"
    case "structured_text":
      return "DatoCmsStructuredText" // Custom type
    case "rich_text":
      return "DatoCmsRichText" // Custom type
    default:
      console.warn(
        `Unknown DatoCMS type: ${datoCMSType} for field ${fieldName}. Defaulting to String.`
      )
      return "String"
  }
}

/**
 * Generates custom GraphQL SDL type definitions.
 * @returns A string containing custom GraphQL type definitions.
 */
function getCustomTypeDefinitions(): string {
  return `
scalar JSON

type DatoCmsFile {
  id: ID!
  url: String!
  filename: String
  width: Int
  height: Int
  size: Int
  alt: String
  title: String
}

type DatoCmsSeo {
  title: String
  description: String
  image: DatoCmsFile
  no_index: Boolean
  no_follow: Boolean
}

type DatoCmsStructuredText {
  value: JSON!
  blocks: [AnyBlock!]
  inlineBlocks: [AnyModel!]
}

type DatoCmsRichText {
  value: JSON!
  blocks: [AnyBlock!]
}

type DatoCmsCloudinaryUrl {
  bytes: Int
  created_at: String
  created_by: DatoCmsCloudinaryUser
  duration: Int
  format: String
  width: Int
  height: Int
  metadata: JSON
  public_id: String
  id: String
  resource_type: String
  secure_url: String
  tags: [String!]
  type: String
  uploaded_by: DatoCmsCloudinaryUser
  url: String
  version: Int
}

type DatoCmsCloudinaryUser {
  type: String
  id: String
}
`
}

async function generateAndConvertSchema() {
  console.log("1. Generating DatoCMS TypeScript schema...")
  try {
    // Ensure this command is run from the pghrugby/nextjs directory
    execSync(
      `npx datocms schema:generate ${path.basename(
        TEMP_TS_SCHEMA_FILE
      )} --api-token=${DATACMA_FULL_API_TOKEN}`,
      { stdio: "inherit", cwd: NEXTJS_DIR }
    )
    console.log("DatoCMS TypeScript schema generated successfully.")
  } catch (error) {
    console.error("Failed to generate DatoCMS TypeScript schema:", error)
    process.exit(1)
  }

  console.log("2. Reading generated TypeScript schema...")
  let tsSchemaContent: string
  try {
    tsSchemaContent = await fs.readFile(TEMP_TS_SCHEMA_FILE, "utf-8")
  } catch (error) {
    console.error("Failed to read generated TypeScript schema file:", error)
    process.exit(1)
  }

  console.log("3. Converting TypeScript schema to GraphQL SDL...")
  let graphQLSchema = getCustomTypeDefinitions()

  // Regex to find ItemTypeDefinition exports
  const itemTypeDefinitionRegex =
    /export type\s+(\w+)\s+=\s+ItemTypeDefinition<[^>]+,\s*'(?:[^']+)',\s*(\{[\s\S]*?\})\s*>;/g
  let match

  while ((match = itemTypeDefinitionRegex.exec(tsSchemaContent)) !== null) {
    const typeName = match[1]
    const propsContent = match[2]

    graphQLSchema += `\n\ntype ${typeName} {\n`

    // Regex to extract field names and types from the props content
    const fieldRegex =
      /(\w+):\s*\{\s*type:\s*'(string|text|slug|integer|json|file|gallery|seo|link|links|structured_text|rich_text|date_time)';[^}]*?\}/g
    let fieldMatch

    while ((fieldMatch = fieldRegex.exec(propsContent)) !== null) {
      const fieldName = fieldMatch[1]
      const datoCMSType = fieldMatch[2]
      const graphQLType = mapDatoCMSTypeToGraphQL(datoCMSType, fieldName)
      graphQLSchema += `  ${fieldName}: ${graphQLType}\n`
    }
    graphQLSchema += "}"
  }

  // Handle AnyBlock and AnyModel union types
  const anyBlockMatch = tsSchemaContent.match(
    /export type AnyBlock\s*=\s*(\|?\s*\w+\s*);/
  )
  if (anyBlockMatch) {
    const blocks = anyBlockMatch[1]
      .split("|")
      .map((b) => b.trim())
      .filter(Boolean)
    if (blocks.length > 0) {
      graphQLSchema += `\n\nunion AnyBlock = ${blocks.join(" | ")}`
    }
  }

  const anyModelMatch = tsSchemaContent.match(
    /export type AnyModel\s*=\s*(\|?\s*\w+\s*);/
  )
  if (anyModelMatch) {
    const models = anyModelMatch[1]
      .split("|")
      .map((m) => m.trim())
      .filter(Boolean)
    if (models.length > 0) {
      graphQLSchema += `\n\nunion AnyModel = ${models.join(" | ")}`
    }
  }

  console.log("4. Writing GraphQL SDL to output file...")
  try {
    await fs.writeFile(FINAL_GQL_SCHEMA_FILE, graphQLSchema)
    console.log(`GraphQL SDL written to ${FINAL_GQL_SCHEMA_FILE}`)
  } catch (error) {
    console.error("Failed to write GraphQL SDL file:", error)
    process.exit(1)
  }

  console.log("5. Cleaning up temporary TypeScript schema file...")
  try {
    await fs.remove(TEMP_TS_SCHEMA_FILE)
    console.log(`Removed temporary file: ${TEMP_TS_SCHEMA_FILE}`)
  } catch (error) {
    console.error("Failed to remove temporary TypeScript schema file:", error)
    // Don't exit here, as the main task of generating the schema is complete.
  }

  console.log("Schema conversion complete!")
}

generateAndConvertSchema().catch(console.error)
