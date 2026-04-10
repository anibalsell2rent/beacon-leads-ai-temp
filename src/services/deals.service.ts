import { hasuraQuery } from "../utils/hasura.client";

export class DealsService {
  static async getDeals(status?: string, limit: number = 50) {
    const whereClause = status
      ? `where: { _or: [{ stage: { _eq: $status } }, { listing_status: { _eq: $status } }] }`
      : "";

    const data = await hasuraQuery<{
      properties: {
        id: string;
        address: string | null;
        city: string | null;
        state: string | null;
        zip_code: string | null;
        property_type: string | null;
        bedrooms: string | null;
        bathrooms: string | null;
        sqft: string | null;
        year_built: string | null;
        stage: string | null;
        listing_status: string | null;
        deal_number: string | null;
        price: string | null;
        created_at: string | null;
      }[];
    }>(
      `
      query GetDeals($status: String, $limit: Int!) {
        properties(
          ${status ? "where: { _or: [{ stage: { _eq: $status } }, { listing_status: { _eq: $status } }] }" : ""}
          order_by: { created_at: desc }
          limit: $limit
        ) {
          id address city state zip_code property_type
          bedrooms bathrooms sqft year_built
          stage listing_status deal_number price created_at
        }
      }
    `,
      { status: status ?? null, limit }
    );

    const properties = data.properties;
    if (properties.length === 0) return [];

    return properties.map((property) => {
      const property_address = [
        property.address || "",
        property.city || "",
        property.state || "",
      ]
        .filter(Boolean)
        .join(", ") || "Unknown Address";

      const mappedProperty = {
        id: property.id,
        address: property.address ?? null,
        city: property.city ?? null,
        state: property.state ?? null,
        zip_code: property.zip_code ?? null,
        property_type: property.property_type ?? null,
        bedrooms: property.bedrooms ? parseInt(property.bedrooms) : null,
        bathrooms: property.bathrooms ? parseFloat(property.bathrooms) : null,
        sqft: property.sqft ? parseInt(property.sqft) : null,
        year_built: property.year_built ? parseInt(property.year_built) : null,
      };

      return {
        id: property.id,
        deal_number: property.deal_number ?? null,
        lead_id: null,
        stage_id: null,
        status: property.stage ?? property.listing_status,
        status_label: property.stage ?? property.listing_status,
        offer_value: property.price ? parseFloat(property.price) : null,
        actual_closing_date: null,
        property_id: property.id,
        property_address,
        property: mappedProperty,
        created_at: property.created_at
          ? new Date(property.created_at).toISOString()
          : null,
      };
    });
  }
}
