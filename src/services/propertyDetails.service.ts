import { hasuraQuery } from "../utils/hasura.client";

export class PropertyDetailsService {
  static async getPropertyDetailsById(propertyId: string) {
    if (!propertyId) {
      throw new Error("Property or Lead ID is required");
    }

    const validIdRegex = /^[a-zA-Z0-9-]+$/;
    if (!validIdRegex.test(propertyId)) {
      return null;
    }

    // 1. Resolve property (direct lookup, or via lead → property_id)
    let resolvedPropertyId = propertyId;

    const directData = await hasuraQuery<{
      properties: any[];
    }>(
      `query GetProperty($id: String!) {
        properties(where: { id: { _eq: $id } }, limit: 1) {
          id address city state zip_code latitude longitude
          seller_name property_type bedrooms bathrooms number_of_half_bathrooms
          sqft lot_acres year_built pool basement listing_status
          air_conditioning_type ac_age home_owners_association
          what_are_the_repairs_required electrical_condition
          hoa hoa_fee frequency_of_hoa rental_restrictions hoa_costs_yearly
          folio_number_apn mls_number taxes_per_year home_insurance_yr
          campaign_source
        }
      }`,
      { id: propertyId }
    );

    let property = directData.properties[0] ?? null;

    // Fallback: treat input as a lead UUID and resolve property_id
    if (!property) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId);
      if (isUuid) {
        const leadData = await hasuraQuery<{
          crm_leads: { property_id: string | null }[];
        }>(
          `query GetLeadProperty($id: uuid!) {
            crm_leads(where: { id: { _eq: $id } }, limit: 1) { property_id }
          }`,
          { id: propertyId }
        );
        const lead = leadData.crm_leads[0];
        if (lead?.property_id) {
          resolvedPropertyId = lead.property_id;
          const propData = await hasuraQuery<{ properties: any[] }>(
            `query GetProperty($id: String!) {
              properties(where: { id: { _eq: $id } }, limit: 1) {
                id address city state zip_code latitude longitude
                seller_name property_type bedrooms bathrooms number_of_half_bathrooms
                sqft lot_acres year_built pool basement listing_status
                air_conditioning_type ac_age home_owners_association
                what_are_the_repairs_required electrical_condition
                hoa hoa_fee frequency_of_hoa rental_restrictions hoa_costs_yearly
                folio_number_apn mls_number taxes_per_year home_insurance_yr
                campaign_source
              }
            }`,
            { id: resolvedPropertyId }
          );
          property = propData.properties[0] ?? null;
        }
      }
    }

    if (!property) return null;

    // 2. Smart address merge: find other records with same address and fill null fields
    if (property.address) {
      const cleanAddress = property.address.replace(/,$/, "").trim();
      const dupData = await hasuraQuery<{ properties: any[] }>(
        `query FindDuplicates($addr: String!, $excludeId: String!) {
          properties(where: {
            address: { _ilike: $addr }
            id: { _neq: $excludeId }
          }) {
            id address city state zip_code latitude longitude
            seller_name property_type bedrooms bathrooms number_of_half_bathrooms
            sqft lot_acres year_built pool basement listing_status
            air_conditioning_type ac_age home_owners_association
            what_are_the_repairs_required electrical_condition
            hoa hoa_fee frequency_of_hoa rental_restrictions hoa_costs_yearly
            folio_number_apn mls_number taxes_per_year home_insurance_yr
            campaign_source
          }
        }`,
        { addr: `%${cleanAddress}%`, excludeId: property.id }
      );

      if (dupData.properties.length > 0) {
        const allRecords = [property, ...dupData.properties];
        const merged: any = { ...property };
        for (const key of Object.keys(merged)) {
          if (merged[key] === null || merged[key] === undefined || merged[key] === "") {
            const better = allRecords.find(
              (r) => r[key] !== null && r[key] !== undefined && r[key] !== ""
            );
            if (better) merged[key] = better[key];
          }
        }
        property = merged;
      }
    }

    // 3. Address parser fallback
    if (property.address && (!property.city || !property.state || !property.zip_code)) {
      const parts = property.address
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const m = lastPart?.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
      if (m) {
        if (!property.state) property.state = m[1].toUpperCase();
        if (!property.zip_code) property.zip_code = m[2];
        if (!property.city && parts.length >= 2) property.city = parts[parts.length - 2];
      }
    }

    // 4. Fetch satellite data + seller data in parallel
    const [satData, sellerData] = await Promise.all([
      hasuraQuery<{
        crm_property_financials: any[];
        crm_property_valuations: any[];
        crm_property_realtor_info: any[];
        crm_property_files: { file_id: string }[];
      }>(
        `query SatelliteData($pid: String!) {
          crm_property_financials(where: { property_id: { _eq: $pid } }, limit: 1) {
            mtg_remaining_balance mtg_monthly_payment second_mtg_balance
            second_mtg_monthly_payment interest_rate va_fha_mortgage
            taxes_per_year tax_debt home_insurance_yearly financed_solar_balance
            other_liens debt_total is_in_foreclosure estimated_foreclosure_date
            hei_in_place arv rehab_estimate mao estimated_rent
          }
          crm_property_valuations(where: { property_id: { _eq: $pid } }, limit: 1) {
            house_canary batch_data_arv arv_after_repair zillow_estimate
            redfin_estimate appraisal_value appraisal_date price_per_sqft
          }
          crm_property_realtor_info(where: { property_id: { _eq: $pid } }, limit: 1) {
            listed_realtor realtor_name realtor_phone realtor_email
            realtor_company listing_price days_on_market
          }
          crm_property_files(where: { property_id: { _eq: $pid } }) {
            file_id
          }
        }`,
        { pid: resolvedPropertyId }
      ),

      hasuraQuery<{
        crm_leads: {
          id: string;
          seller_segment: string | null;
        }[];
        crm_sellers: {
          lead_id: string;
          motivation: string | null;
          urgency: string | null;
          current_marriage_status: string | null;
          ownership_type: string | null;
          reason_for_selling: string | null;
          timeline_flexibility: string | null;
          desired_timeline: string | null;
          open_to_leaseback: boolean | null;
          seller_annual_income: number | null;
          credit_score_range: string | null;
          sales_proceeds_needed: number | null;
          is_in_bankruptcy: boolean | null;
          asking_price: number | null;
          minimum_acceptable_price: number | null;
          monthly_debts: number | null;
          occupation: string | null;
          occupants_count: number | null;
          has_pets: boolean | null;
          desired_leaseback_period: number | null;
          years_lived_at_property: number | null;
          is_veteran: boolean | null;
          military_status: string | null;
        }[];
      }>(
        `query SellerData($pid: String!) {
          crm_leads(where: { property_id: { _eq: $pid } }, limit: 1) {
            id seller_segment
          }
          crm_sellers(where: { property_id: { _eq: $pid } }, limit: 1) {
            lead_id motivation urgency current_marriage_status ownership_type
            reason_for_selling timeline_flexibility desired_timeline open_to_leaseback
            seller_annual_income credit_score_range sales_proceeds_needed is_in_bankruptcy
            asking_price minimum_acceptable_price monthly_debts occupation occupants_count
            has_pets desired_leaseback_period years_lived_at_property is_veteran military_status
          }
        }`,
        { pid: resolvedPropertyId }
      ),
    ]);

    const financials = satData.crm_property_financials[0] ?? null;
    const externalVal = satData.crm_property_valuations[0] ?? null;
    const realtorInfo = satData.crm_property_realtor_info[0] ?? null;
    const fileIds = satData.crm_property_files.map((f) => f.file_id).filter(Boolean);

    // 5. Fetch file details
    let images: any[] = [];
    if (fileIds.length > 0) {
      const filesData = await hasuraQuery<{ crm_files: any[] }>(
        `query GetFiles($ids: [uuid!]!) {
          crm_files(where: { id: { _in: $ids } }) {
            id file_name file_url
          }
        }`,
        { ids: fileIds }
      );
      images = filesData.crm_files;
    }

    const lead = sellerData.crm_leads[0] ?? null;
    const seller = sellerData.crm_sellers[0] ?? null;

    return {
      id: property.id,
      seller_name: property.seller_name,

      physical: {
        property_type: property.property_type,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        number_of_half_bathrooms: property.number_of_half_bathrooms,
        sqft: property.sqft,
        lot_acres: property.lot_acres,
        year_built: property.year_built,
        pool: property.pool,
        basement: property.basement,
        listing_status: property.listing_status,
      },

      features: {
        air_conditioning_type: property.air_conditioning_type,
        ac_age: property.ac_age,
        home_owners_association: property.home_owners_association,
      },

      condition: {
        what_are_the_repairs_required: property.what_are_the_repairs_required,
        electrical_condition: property.electrical_condition,
      },

      location: {
        address: property.address,
        city: property.city,
        state: property.state,
        zip_code: property.zip_code,
        latitude: property.latitude,
        longitude: property.longitude,
        folio_number_apn: property.folio_number_apn,
        mls_number: property.mls_number,
      },

      hoa: {
        hoa: property.hoa,
        hoa_fee: property.hoa_fee,
        frequency_of_hoa: property.frequency_of_hoa,
        rental_restrictions: property.rental_restrictions,
        hoa_costs_yearly: property.hoa_costs_yearly,
      },

      financials: financials
        ? {
            mtg_remaining_balance: financials.mtg_remaining_balance,
            mtg_monthly_payment: financials.mtg_monthly_payment,
            second_mtg_balance: financials.second_mtg_balance,
            second_mtg_monthly_payment: financials.second_mtg_monthly_payment,
            interest_rate: financials.interest_rate,
            va_fha_mortgage: financials.va_fha_mortgage,
            taxes_per_year: financials.taxes_per_year ?? property.taxes_per_year,
            tax_debt: financials.tax_debt,
            home_insurance_yearly:
              financials.home_insurance_yearly ?? property.home_insurance_yr,
            financed_solar_balance: financials.financed_solar_balance,
            other_liens: financials.other_liens,
            debt_total: financials.debt_total,
            is_in_foreclosure: financials.is_in_foreclosure,
            estimated_foreclosure_date: financials.estimated_foreclosure_date,
            hei_in_place: financials.hei_in_place,
          }
        : null,

      valuations: {
        internal: financials
          ? {
              arv: financials.arv,
              rehab_estimate: financials.rehab_estimate,
              mao: financials.mao,
              estimated_rent: financials.estimated_rent,
            }
          : null,
        external: externalVal
          ? {
              house_canary: externalVal.house_canary,
              batch_data_arv: externalVal.batch_data_arv,
              arv_after_repair: externalVal.arv_after_repair,
              zillow_estimate: externalVal.zillow_estimate,
              redfin_estimate: externalVal.redfin_estimate,
              appraisal_value: externalVal.appraisal_value,
              appraisal_date: externalVal.appraisal_date,
              price_per_sqft: externalVal.price_per_sqft,
            }
          : null,
      },

      realtor: realtorInfo
        ? {
            listed_realtor: realtorInfo.listed_realtor,
            realtor_name: realtorInfo.realtor_name,
            realtor_phone: realtorInfo.realtor_phone,
            realtor_email: realtorInfo.realtor_email,
            realtor_company: realtorInfo.realtor_company,
            listing_price: realtorInfo.listing_price,
            days_on_market: realtorInfo.days_on_market,
          }
        : null,

      images: images.map((img) => ({
        file_id: img.id,
        file_name: img.file_name,
        file_url: img.file_url,
      })),

      seller_profile: {
        seller_segment: lead?.seller_segment ?? null,
        motivation: seller?.motivation ?? null,
        urgency: seller?.urgency ?? null,
        marriage_status: seller?.current_marriage_status ?? null,
        ownership_type: seller?.ownership_type ?? null,
        reason_for_selling: seller?.reason_for_selling ?? null,
        timeline_flexibility: seller?.timeline_flexibility ?? null,
        desired_timeline: seller?.desired_timeline ?? null,
        open_to_leaseback: seller?.open_to_leaseback ?? null,
      },

      financial_profile: {
        seller_annual_income: seller?.seller_annual_income ?? null,
        credit_score: seller?.credit_score_range ?? null,
        sales_proceeds_needed: seller?.sales_proceeds_needed ?? null,
        is_in_bankruptcy: seller?.is_in_bankruptcy ?? null,
        asking_price: seller?.asking_price ?? null,
        minimum_acceptable_price: seller?.minimum_acceptable_price ?? null,
        monthly_debts: seller?.monthly_debts ?? null,
      },

      living_situation: {
        occupation: seller?.occupation ?? null,
        people_in_home: seller?.occupants_count ?? null,
        has_pets: seller?.has_pets ?? null,
        desired_lease_period: seller?.desired_leaseback_period ?? null,
        years_lived_at_property: seller?.years_lived_at_property ?? null,
        is_veteran: seller?.is_veteran ?? null,
        military_status: seller?.military_status ?? null,
      },
    };
  }
}
