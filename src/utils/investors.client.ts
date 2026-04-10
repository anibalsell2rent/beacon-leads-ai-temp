/**
 * investors.client.ts
 *
 * HTTP client for the beacon-investors-service GraphQL endpoint.
 *
 * Usage:
 *   import { investorsQuery } from "../utils/investors.client";
 *
 *   const data = await investorsQuery<{ propertyDocuments: PropertyDocument[] }>(
 *     `query { propertyDocuments(property_id: "PROP123") { id file_name } }`,
 *     { property_id: "PROP123" }
 *   );
 */

const INVESTORS_SERVICE_ENDPOINT =
  process.env.INVESTORS_SERVICE_ENDPOINT ??
  "https://beacon-investors-service-663034886613.us-central1.run.app/api/marketing-tools/graphql";

const INVESTORS_SERVICE_API_KEY = process.env.INVESTORS_SERVICE_API_KEY ?? "";

async function investorsRequest<T = any>(
  document: string,
  variables?: Record<string, any>
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (INVESTORS_SERVICE_API_KEY) {
    headers["x-api-key"] = INVESTORS_SERVICE_API_KEY;
  }

  const response = await fetch(INVESTORS_SERVICE_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify({ query: document, variables: variables ?? {} }),
  });

  if (!response.ok) {
    throw new Error(
      `Investors service HTTP error: ${response.status} ${response.statusText}`
    );
  }

  const json: { data?: T; errors?: { message: string }[] } =
    await response.json();

  if (json.errors?.length) {
    const msgs = json.errors.map((e) => e.message).join(" | ");
    throw new Error(`Investors service GraphQL error: ${msgs}`);
  }

  return json.data as T;
}

export const investorsQuery = investorsRequest;
export const investorsMutation = investorsRequest;
