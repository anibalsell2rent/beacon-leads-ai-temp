import { hasuraQuery } from "../utils/hasura.client";

export class LeadDetailsService {
  static async getLeadById(leadId: string) {
    if (!leadId) {
      throw new Error("Lead ID is required");
    }

    // 1. Fetch all lead data + associations in a single Hasura query
    const data = await hasuraQuery<{
      crm_leads: {
        id: string;
        lead_number: string | null;
        is_hot: boolean | null;
        lead_score: number | null;
        stage_id: string | null;
        s2r_net_revenue: string | null;
        contract_price: string | null;
        marketing_source: string | null;
        seller_segment: string | null;
        pippin_status: string | null;
        last_updated: string | null;
        created_at: string | null;
        property_id: string | null;
        seller_advisor_id: string | null;
        seller_manager_id: string | null;
      }[];
      crm_sellers: any[];
      crm_property_financials: any[];
      properties: any[];
      properties_lead_scoring: {
        section: string;
        seller_score: string | null;
        property_score: string | null;
        transaction_score: string | null;
        investor_score: string | null;
        s2r_fee: string | null;
      }[];
      crm_property_realtor_info: { property_id: string; days_on_market: number | null }[];
    }>(
      `
      query LeadDetails($leadId: uuid!) {
        crm_leads(where: { id: { _eq: $leadId } }) {
          id lead_number is_hot lead_score stage_id s2r_net_revenue
          contract_price marketing_source seller_segment pippin_status
          last_updated created_at property_id seller_advisor_id seller_manager_id
        }
        crm_sellers(where: { lead_id: { _eq: $leadId } }) {
          id first_name last_name phone mobile alt_phone email alt_email
          preferred_contact_method best_time_to_call idenfy_status
          second_seller_first_name second_seller_last_name second_seller_phone
          second_seller_email second_seller_relationship
          story urgency motivation reason_for_selling timeline_flexibility
          wants_or_needs ultimate_seller_goals relationship_to_property
          ownership_type need_to_sell_by desired_timeline current_marriage_status
          spouse_name divorce_status divorce_attorney probate_status estate_attorney
          has_power_of_attorney poa_name date_of_birth age occupation employer
          employment_status years_employed military_status is_veteran
          years_lived_at_property occupants_count occupant_details
          has_pets pet_types pet_count asking_price minimum_acceptable_price
          sales_proceeds_needed equity_needed seller_annual_income total_household_income
          credit_score_range monthly_debts debt_to_income_ratio is_in_bankruptcy
          bankruptcy_type bankruptcy_status bankruptcy_discharge_date
          desired_leaseback_period max_monthly_rent preferred_move_out_date
          open_to_leaseback leaseback_terms
          mailing_address mailing_city mailing_state mailing_zip
        }
      }
    `,
      { leadId }
    );

    const lead = data.crm_leads[0];
    if (!lead) {
      throw new Error("Lead not found");
    }

    const dbSeller = data.crm_sellers[0] ?? null;

    // 2. Fetch property-related data (only if property_id exists)
    let financials: any      = null;
    let property: any        = null;
    let scoreRows: any[]     = [];
    let realtorInfo: any     = null;
    let advisorUser: any     = null;
    let managerUser: any     = null;

    if (lead.property_id) {
      const propData = await hasuraQuery<{
        crm_property_financials: any[];
        properties: any[];
        properties_lead_scoring: any[];
        crm_property_realtor_info: any[];
      }>(
        `
        query PropertyDetails($propertyId: String!) {
          crm_property_financials(
            where: { property_id: { _eq: $propertyId } }
            limit: 1
          ) {
            id mtg_remaining_balance mtg_monthly_payment second_mtg_balance
            second_mtg_monthly_payment interest_rate va_fha_mortgage
            taxes_per_year tax_debt home_insurance_yearly financed_solar_balance
            hei_in_place home_equity_investor_info other_liens debt_total
            is_in_foreclosure estimated_foreclosure_date block_foreclosure
          }
          properties(where: { id: { _eq: $propertyId } }) {
            id address city state zip_code county
          }
          properties_lead_scoring(where: { property_id: { _eq: $propertyId } }) {
            section seller_score property_score transaction_score investor_score s2r_fee
          }
          crm_property_realtor_info(
            where: { property_id: { _eq: $propertyId } }
            limit: 1
          ) {
            property_id days_on_market
          }
        }
      `,
        { propertyId: lead.property_id }
      );

      financials  = propData.crm_property_financials[0] ?? null;
      property    = propData.properties[0] ?? null;
      scoreRows   = propData.properties_lead_scoring;
      realtorInfo = propData.crm_property_realtor_info[0] ?? null;
    }

    // 3. Fetch advisor / manager directly from users (seller_advisor_id / seller_manager_id are Int → users.id)
    const advisorId = lead.seller_advisor_id ? Number(lead.seller_advisor_id) : null;
    const managerId = lead.seller_manager_id ? Number(lead.seller_manager_id) : null;

    if (advisorId || managerId) {
      const userIds = [advisorId, managerId].filter((id): id is number => id != null);

      const userData = await hasuraQuery<{
        users: { id: number; first_name: string | null; last_name: string | null; email: string | null }[];
      }>(
        `query UserNames($ids: [Int!]!) {
          users(where: { id: { _in: $ids } }) {
            id first_name last_name email
          }
        }`,
        { ids: userIds }
      );

      const usersById = new Map(userData.users.map((u) => [u.id, u]));

      if (advisorId) {
        const u = usersById.get(advisorId);
        if (u) advisorUser = { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email };
      }
      if (managerId) {
        const u = usersById.get(managerId);
        if (u) managerUser = { id: u.id, first_name: u.first_name, last_name: u.last_name, email: u.email };
      }
    }

    // 4. Build primary seller (fallback to property data)
    let primarySeller: any = dbSeller;
    if (!primarySeller && property?.seller_name) {
      const [firstName, ...rest] = property.seller_name.split(" ");
      primarySeller = {
        first_name: firstName || "Unknown",
        last_name:  rest.join(" ") || "Seller",
      };
    }

    // 5. Score sections
    const scoreInitial = scoreRows.find((r: any) => r.section === "initial") ?? null;
    const scoreFinal   = scoreRows.find((r: any) => r.section === "final") ?? null;

    const buildScoreSection = (row: any) =>
      row
        ? {
            seller_score:      row.seller_score      ? parseFloat(row.seller_score)      : null,
            property_score:    row.property_score    ? parseFloat(row.property_score)    : null,
            transaction_score: row.transaction_score ? parseFloat(row.transaction_score) : null,
            investor_score:    row.investor_score    ? parseFloat(row.investor_score)    : null,
            s2r_fee:           row.s2r_fee           ? parseFloat(row.s2r_fee)           : null,
            total: [
              row.seller_score,
              row.property_score,
              row.transaction_score,
              row.investor_score,
              row.s2r_fee,
            ].reduce((sum: number, v: any) => sum + (parseFloat(v) || 0), 0),
          }
        : null;

    const finalScore   = buildScoreSection(scoreFinal);
    const initialScore = buildScoreSection(scoreInitial);
    const totalLeadScore = Math.round(
      finalScore
        ? finalScore.total
        : initialScore
        ? initialScore.total
        : lead.lead_score ?? 0
    );

    // 6. Address parsing (fallback for incomplete property records)
    let parsedCity  = property?.city  ?? null;
    let parsedState = property?.state ?? null;
    let parsedZip   = null as string | null;

    if (property?.address && (!parsedCity || !parsedState)) {
      const parts    = property.address.split(",").map((s: string) => s.trim()).filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const match    = lastPart?.match(/^([A-Z]{2})\s+(\d{5}(-\d{4})?)$/i);
      if (match) {
        if (!parsedState) parsedState = match[1].toUpperCase();
        parsedZip = match[2];
        if (!parsedCity && parts.length >= 2) parsedCity = parts[parts.length - 2];
      }
    }

    // 7. Assemble response
    return {
      id:               lead.id,
      lead_number:      lead.lead_number,
      seller_name:      primarySeller
        ? `${primarySeller.first_name ?? ""} ${primarySeller.last_name ?? ""}`.trim()
        : "Unknown Seller",
      is_hot:           lead.is_hot,
      lead_score:       totalLeadScore,
      stage_id:         lead.stage_id,
      s2r_net_revenue:  lead.s2r_net_revenue,
      contract_price:   lead.contract_price,
      marketing_source: lead.marketing_source,
      seller_segment:   lead.seller_segment,
      pippin_status:    lead.pippin_status,
      last_updated:     lead.last_updated,
      created_at:       lead.created_at,

      seller: primarySeller
        ? {
            id:                          primarySeller.id,
            first_name:                  primarySeller.first_name,
            last_name:                   primarySeller.last_name,
            phone:                       primarySeller.phone,
            mobile:                      primarySeller.mobile,
            alt_phone:                   primarySeller.alt_phone,
            email:                       primarySeller.email,
            alt_email:                   primarySeller.alt_email,
            preferred_contact_method:    primarySeller.preferred_contact_method,
            best_time_to_call:           primarySeller.best_time_to_call,
            idenfy_status:               primarySeller.idenfy_status,
            second_seller_first_name:    primarySeller.second_seller_first_name,
            second_seller_last_name:     primarySeller.second_seller_last_name,
            second_seller_phone:         primarySeller.second_seller_phone,
            second_seller_email:         primarySeller.second_seller_email,
            second_seller_relationship:  primarySeller.second_seller_relationship,
            story:                       primarySeller.story,
            urgency:                     primarySeller.urgency,
            motivation:                  primarySeller.motivation,
            reason_for_selling:          primarySeller.reason_for_selling,
            timeline_flexibility:        primarySeller.timeline_flexibility,
            wants_or_needs:              primarySeller.wants_or_needs,
            ultimate_seller_goals:       primarySeller.ultimate_seller_goals,
            relationship_to_property:    primarySeller.relationship_to_property,
            ownership_type:              primarySeller.ownership_type,
            need_to_sell_by:             primarySeller.need_to_sell_by,
            desired_timeline:            primarySeller.desired_timeline,
            current_marriage_status:     primarySeller.current_marriage_status,
            spouse_name:                 primarySeller.spouse_name,
            divorce_status:              primarySeller.divorce_status,
            divorce_attorney:            primarySeller.divorce_attorney,
            probate_status:              primarySeller.probate_status,
            estate_attorney:             primarySeller.estate_attorney,
            has_power_of_attorney:       primarySeller.has_power_of_attorney,
            poa_name:                    primarySeller.poa_name,
            date_of_birth:               primarySeller.date_of_birth,
            age:                         primarySeller.age,
            occupation:                  primarySeller.occupation,
            employer:                    primarySeller.employer,
            employment_status:           primarySeller.employment_status,
            years_employed:              primarySeller.years_employed,
            military_status:             primarySeller.military_status,
            is_veteran:                  primarySeller.is_veteran,
            years_lived_at_property:     primarySeller.years_lived_at_property,
            occupants_count:             primarySeller.occupants_count,
            occupant_details:            primarySeller.occupant_details,
            has_pets:                    primarySeller.has_pets,
            pet_types:                   primarySeller.pet_types,
            pet_count:                   primarySeller.pet_count,
            asking_price:                primarySeller.asking_price,
            minimum_acceptable_price:    primarySeller.minimum_acceptable_price,
            sales_proceeds_needed:       primarySeller.sales_proceeds_needed,
            equity_needed:               primarySeller.equity_needed,
            seller_annual_income:        primarySeller.seller_annual_income,
            total_household_income:      primarySeller.total_household_income,
            credit_score_range:          primarySeller.credit_score_range,
            monthly_debts:               primarySeller.monthly_debts,
            debt_to_income_ratio:        primarySeller.debt_to_income_ratio,
            is_in_bankruptcy:            primarySeller.is_in_bankruptcy,
            bankruptcy_type:             primarySeller.bankruptcy_type,
            bankruptcy_status:           primarySeller.bankruptcy_status,
            bankruptcy_discharge_date:   primarySeller.bankruptcy_discharge_date,
            desired_leaseback_period:    primarySeller.desired_leaseback_period,
            max_monthly_rent:            primarySeller.max_monthly_rent,
            preferred_move_out_date:     primarySeller.preferred_move_out_date,
            open_to_leaseback:           primarySeller.open_to_leaseback,
            leaseback_terms:             primarySeller.leaseback_terms,
            mailing_address:             primarySeller.mailing_address,
            mailing_city:                primarySeller.mailing_city,
            mailing_state:               primarySeller.mailing_state,
            mailing_zip:                 primarySeller.mailing_zip,
          }
        : null,

      financials: financials
        ? {
            id:                          financials.id,
            mtg_remaining_balance:       financials.mtg_remaining_balance,
            mtg_monthly_payment:         financials.mtg_monthly_payment,
            second_mtg_balance:          financials.second_mtg_balance,
            second_mtg_monthly_payment:  financials.second_mtg_monthly_payment,
            interest_rate:               financials.interest_rate,
            va_fha_mortgage:             financials.va_fha_mortgage,
            taxes_per_year:              financials.taxes_per_year,
            tax_debt:                    financials.tax_debt,
            home_insurance_yearly:       financials.home_insurance_yearly,
            financed_solar_balance:      financials.financed_solar_balance,
            hei_in_place:                financials.hei_in_place,
            home_equity_investor_info:   financials.home_equity_investor_info,
            other_liens:                 financials.other_liens,
            debt_total:                  financials.debt_total,
            is_in_foreclosure:           financials.is_in_foreclosure,
            estimated_foreclosure_date:  financials.estimated_foreclosure_date,
            block_foreclosure:           financials.block_foreclosure,
            // sellers_gross_equity / hoa_balance / cash_to_seller are on crm_leads, not here
          }
        : null,

      property: property
        ? {
            id:             property.id,
            street_address: property.address,
            city:           parsedCity,
            state:          parsedState,
            zip:            parsedZip,
            county:         property.county,
            days_on_market: realtorInfo?.days_on_market ?? 0,
          }
        : null,

      score: { initial: initialScore, final: finalScore },

      advisor: advisorUser,
      manager: managerUser,
    };
  }
}
