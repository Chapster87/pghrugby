/**
 * Utility function to fetch data from the Strapi GraphQL API.
 * @param {string} query The GraphQL query string.
 * @param {Object} variables An object containing variables for the GraphQL query.
 * @returns {Promise<any>} A promise that resolves to the JSON response from the Strapi API.
 */
export async function fetchStrapiGQL(query: string, variables = {}) {
  const strapiGraphQLEndpoint =
    process.env.STRAPI_GRAPHQL_ENDPOINT || "http://localhost:1337/graphql"

  const res = await fetch(strapiGraphQLEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
    next: {
      revalidate: 60, // Revalidate every 60 seconds
    },
  })

  if (!res.ok) {
    console.error(
      "Failed to fetch Strapi GraphQL data:",
      res.status,
      res.statusText
    )
    const errorBody = await res.text()
    console.error("Error response body:", errorBody)
    throw new Error(`Failed to fetch Strapi GraphQL data: ${res.statusText}`)
  }

  const json = await res.json()

  if (json.errors) {
    console.error("Strapi GraphQL errors:", json.errors)
    throw new Error(
      `Error from Strapi GraphQL: ${json.errors
        .map((e: any) => e.message)
        .join(", ")}`
    )
  }

  return json.data
}
