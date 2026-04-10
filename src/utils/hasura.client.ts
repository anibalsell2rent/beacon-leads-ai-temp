/**
 * hasura.client.ts
 *
 * Lightweight typed client for the Hasura GraphQL endpoint.
 * Replaces all direct Sequelize / raw-SQL access in service files.
 *
 * Usage:
 *   import { hasuraQuery, hasuraMutation } from "../utils/hasura.client";
 *
 *   const data = await hasuraQuery<{ crm_leads: Lead[] }>(`
 *     query { crm_leads(limit: 10) { id stage_id } }
 *   `);
 */

const HASURA_ENDPOINT =
  process.env.HASURA_ENDPOINT ?? "https://s2rdev.hasura.app/v1/graphql";

const HASURA_ADMIN_SECRET = process.env.HASURA_ADMIN_SECRET ?? "";

// ─── Core fetch ───────────────────────────────────────────────────────────────

async function hasuraRequest<T = any>(
  document: string,
  variables?: Record<string, any>
): Promise<T> {
  const response = await fetch(HASURA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-hasura-admin-secret": HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query: document, variables: variables ?? {} }),
  });

  if (!response.ok) {
    throw new Error(
      `Hasura HTTP error: ${response.status} ${response.statusText}`
    );
  }

  const json: { data?: T; errors?: { message: string; extensions?: any }[] } =
    await response.json();

  if (json.errors?.length) {
    const msgs = json.errors.map((e) => e.message).join(" | ");
    throw new Error(`Hasura GraphQL error: ${msgs}`);
  }

  return json.data as T;
}

// ─── Public helpers ───────────────────────────────────────────────────────────

/** Execute a GraphQL query and return the data object. */
export const hasuraQuery = hasuraRequest;

/** Execute a GraphQL mutation and return the data object. */
export const hasuraMutation = hasuraRequest;
