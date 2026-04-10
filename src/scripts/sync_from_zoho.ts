/**
 * sync_from_zoho.ts
 *
 * Pulls real Leads and Deals from Zoho CRM and populates:
 *   - properties
 *   - crm_stages            (upserted from real stage names found)
 *   - crm_leads
 *   - crm_deals
 *   - crm_sellers
 *
 * Run:
 *   npx ts-node src/scripts/sync_from_zoho.ts
 *   npx ts-node src/scripts/sync_from_zoho.ts --limit 10   (default: 10 each)
 *   npx ts-node src/scripts/sync_from_zoho.ts --limit 50
 */

import axios from "axios";
import * as crypto from "crypto";
import { hasuraQuery, hasuraMutation } from "../utils/hasura.client";

// ─── Config ───────────────────────────────────────────────────────────────────

const LIMIT = (() => {
  const idx = process.argv.indexOf("--limit");
  return idx !== -1 ? parseInt(process.argv[idx + 1], 10) : 10;
})();

const LEAD_STAGES = new Set([
  "New Lead",
  "Initial Booking",
  "Underwriting",
  "Propose to Seller (SQL)",
  "PSA Execution",
  "Analyze and Qualify",
  "Leads: Title Remediation",
  "Sales ICU",
  "Disqualified",
  "Referral",
  "Revisit Later",
  "Encouragement",
  "Unsubscribed",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const uuid = () => crypto.randomUUID();

/** Safe ISO date string or null */
const isoDate = (v: any): string | null => {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
};

/** Numeric coerce */
const num = (v: any): number | null => {
  if (v == null || v === "" || v === false) return null;
  const n = parseFloat(String(v).replace(/[^0-9.-]/g, ""));
  return isNaN(n) ? null : n;
};

/** Boolean coerce */
const boo = (v: any): boolean | null => {
  if (v == null) return null;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "Yes") return true;
  if (v === "false" || v === "No") return false;
  return null;
};

/** String coerce (nested objects → null) */
const str = (v: any): string | null => {
  if (v == null) return null;
  if (typeof v === "object") return null;
  return String(v).trim() || null;
};

/** Nested id extractor: { id: "...", name: "..." } → id string */
const nestedId = (v: any): string | null => {
  if (!v || typeof v !== "object") return null;
  return v.id ? String(v.id) : null;
};

// ─── Zoho API ─────────────────────────────────────────────────────────────────

const getToken = async (): Promise<string> => {
  const res = await axios.get<{ token?: string }>(
    "https://zohotoken-663034886613.us-central1.run.app/api/zoho/token"
  );
  if (!res.data.token) throw new Error("Could not get Zoho token");
  return res.data.token;
};

const zohoGet = async (
  token: string,
  module: string,
  page = 1,
  perPage = 200
) => {
  const url = `https://www.zohoapis.com/crm/v2/${module}?per_page=${perPage}&page=${page}`;
  const res = await axios.get<{ data?: any[]; info?: any }>(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });
  return res.data?.data ?? [];
};

const fetchAll = async (
  token: string,
  module: string,
  limit: number
): Promise<any[]> => {
  const perPage = Math.min(limit, 200);
  const records: any[] = [];
  let page = 1;

  while (records.length < limit) {
    const batch = await zohoGet(token, module, page, perPage);
    if (!batch.length) break;
    records.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return records.slice(0, limit);
};

// ─── Stage upsert helper ──────────────────────────────────────────────────────

const stageCache: Record<string, string> = {};

const ensureStage = async (
  name: string,
  type: "LEAD" | "DEAL",
  pos: number
): Promise<string> => {
  const key = `${name}:${type}`;
  if (stageCache[key]) return stageCache[key];

  // Check if stage already exists
  const existing = await hasuraQuery<{
    crm_stages: { id: string }[];
  }>(
    `
    query FindStage($name: String!, $type: String!) {
      crm_stages(
        where: { name: { _eq: $name }, stage_type: { _eq: $type } }
        limit: 1
      ) { id }
    }
  `,
    { name, type }
  );

  if (existing.crm_stages[0]) {
    stageCache[key] = existing.crm_stages[0].id;
    return existing.crm_stages[0].id;
  }

  const id = uuid();
  const isTerminal = [
    "Disqualified",
    "Referral",
    "Unsubscribed",
    "Closed",
    "Closed with NOC",
  ].includes(name);

  await hasuraMutation<{ insert_crm_stages_one: { id: string } }>(
    `
    mutation InsertStage($id: uuid!, $name: String!, $type: String!, $pos: Int!, $isTerminal: Boolean!) {
      insert_crm_stages_one(object: {
        id: $id
        name: $name
        stage_type: $type
        position: $pos
        is_terminal: $isTerminal
      }) { id }
    }
  `,
    { id, name, type, pos, isTerminal }
  );

  stageCache[key] = id;
  console.log(`   + Stage: "${name}" [${type}]`);
  return id;
};

// ─── Process a Zoho Lead record ───────────────────────────────────────────────

const processLead = async (z: any, idx: number): Promise<void> => {
  const stageName: string = str(z.Lead_Status) ?? "New Lead";
  const stageId = await ensureStage(stageName, "LEAD", idx + 1);

  const propertyRef = z.Property;
  const zohoLeadId  = String(z.id);
  const propertyId  = nestedId(propertyRef) ?? zohoLeadId;

  const address        = str(z.Property_Address ?? z.Street ?? z.Property_Address_2) ?? "Unknown";
  const sellerFullName = `${str(z.First_Name) ?? ""} ${str(z.Last_Name) ?? ""}`.trim() || null;

  // Upsert property
  await hasuraMutation(
    `
    mutation UpsertProperty($object: properties_insert_input!) {
      insert_properties_one(
        object: $object
        on_conflict: {
          constraint: properties_pkey
          update_columns: [stage, seller_name, updated_at]
        }
      ) { id }
    }
  `,
    {
      object: {
        id:            propertyId,
        address,
        city:          str(z.City),
        state:         str(z.State),
        zip_code:      str(z.Zip_Code),
        price:         num(z.How_much_do_you_think_your_house_is_worth),
        bedrooms:      num(z.Number_of_Bedrooms),
        sqft:          num(z.Square_Footage1),
        property_type: str(z.Type_of_Property) ?? str(z.Batch_data_Property_Type),
        year_built:    num(z.Estimated_Year_the_House_was_Built),
        stage:         stageName,
        seller_name:   sellerFullName,
        county:        str(z.County),
        listing_status:"Active",
        // timestamps handled by Hasura default values or explicit NOW()
      },
    }
  );

  // Check if lead already exists
  const existingLead = await hasuraQuery<{ crm_leads: { id: string }[] }>(
    `
    query FindLead($propertyId: uuid!) {
      crm_leads(where: { property_id: { _eq: $propertyId } }, limit: 1) { id }
    }
  `,
    { propertyId }
  );

  let leadId: string;

  if (existingLead.crm_leads[0]) {
    leadId = existingLead.crm_leads[0].id;

    await hasuraMutation(
      `
      mutation UpdateLead($id: uuid!, $stageId: uuid!, $result: String!) {
        update_crm_leads_by_pk(
          pk_columns: { id: $id }
          _set: { stage_id: $stageId, result: $result }
        ) { id }
      }
    `,
      { id: leadId, stageId: stageId, result: stageName }
    );

    console.log(`   ↻  Lead (${stageName}): updated [lead_id=${leadId}]`);
  } else {
    leadId = uuid();

    await hasuraMutation(
      `
      mutation InsertLead($object: crm_leads_insert_input!) {
        insert_crm_leads_one(object: $object) { id }
      }
    `,
      {
        object: {
          id:                        leadId,
          property_id:               propertyId,
          stage_id:                  stageId,
          result:                    stageName,
          pipeline_type:             "SELL_AND_STAY",
          lead_score:                num(z.Lead_Score),
          seller_subscore:           num(z.Seller_Final_Subscore),
          property_subscore:         num(z.Property_Subscore ?? z.Property_Final_Subscore),
          transaction_subscore:      num(z.Transaction_Final_Subscore),
          investor_subscore:         num(z.Investors_Final_Subscore ?? z.Investors_Subscore),
          lead_initial_score:        num(z.Lead_Initial_Score),
          cap_rate:                  str(z.Cap_Rate2 ?? z.Local_Gross_Cap_Rate),
          marketing_source:          str(z.Campaigns_Source ?? z.Lead_Source),
          campaign_medium:           str(z.Revived_Campaign_Medium),
          campaign_name:             str(z.Ad_Campaign_Name),
          where_did_you_hear:        str(z.Where_did_you_hear_about_us),
          lead_notes:                str(z.Notes ?? z.Lead_Description),
          reason_for_failure:        str(z.Reason_For_Failure_Detail ?? z.Past_Reason_for_Failure_Details),
          date_created:              isoDate(z.Created_Time),
          last_updated:              isoDate(z.Modified_Time),
          last_contact_date:         isoDate(z.Last_contact_date),
          follow_up_date:            isoDate(z.Follow_Up_Date ?? z.Flair_Appointment_Date),
          days_in_current_stage:     num(z.Current_Days_in_Status),
          stage_entered_at:          isoDate(z.Stage_entered_at ?? z.Date_Entered_to_Initial_Booking_Stage),
          scheduled_meeting_date:    isoDate(z.Scheduled_Meeting_At),
          scheduled_booking_date:    isoDate(z.Scheduled_Booking_Date),
          revival_attempt_date:      isoDate(z.Revival_Attempt_Date),
          revived_campaign_content:  str(z.Revived_Campaign_Content ?? z.Campaign_Content),
          pippin_order_id:           str(z.Pippin_Order_ID),
          pippin_order_tracking_url: str(z.Pippin_Order_Tracking_URL),
          pippin_100_payment:        boo(z.Pippin_100_Payment),
          pippin_60_payment:         boo(z.Pippin_60_Payment),
        },
      }
    );

    console.log(`   +  Lead (${stageName}): created [lead_id=${leadId}]`);
  }

  // Upsert seller (only if not yet created)
  const existingSeller = await hasuraQuery<{ crm_sellers: { id: number }[] }>(
    `
    query FindSeller($leadId: uuid!) {
      crm_sellers(where: { lead_id: { _eq: $leadId } }, limit: 1) { id }
    }
  `,
    { leadId }
  );

  if (!existingSeller.crm_sellers[0]) {
    await hasuraMutation(
      `
      mutation InsertSeller($object: crm_sellers_insert_input!) {
        insert_crm_sellers_one(object: $object) { id }
      }
    `,
      {
        object: {
          first_name:                str(z.First_Name),
          last_name:                 str(z.Last_Name),
          phone:                     str(z.Phone),
          email:                     str(z.Email),
          lead_id:                   leadId,
          mobile:                    str(z.Mobile),
          preferred_contact_method:  str(z.Contact_preference),
          language:                  str(z.Language),
          mailing_address:           address,
          mailing_city:              str(z.City),
          mailing_state:             str(z.State),
          mailing_zip:               str(z.Zip_Code),
          motivation:                str(z.Situation_Category),
          reason_for_selling:        str(z.Reason_for_Moving_Out),
          asking_price:              num(z.How_much_do_you_think_your_house_is_worth),
        },
      }
    );
    console.log(`   +  Seller (${str(z.First_Name)} ${str(z.Last_Name)}): created`);
  }
};

// ─── Process a Zoho Deal record ──────────────────────────────────────────────

const processDeal = async (z: any, idx: number): Promise<void> => {
  const stageName: string = str(z.Stage) ?? "Active";
  const stageId = await ensureStage(stageName, "DEAL", idx + 1);

  const zohoLeadId = nestedId(z.Lead_Name) ?? nestedId(z.Lead_ID);

  let leadId: string | null = null;

  if (zohoLeadId) {
    const found = await hasuraQuery<{ crm_leads: { id: string }[] }>(
      `
      query FindLeadByProperty($propertyId: uuid!) {
        crm_leads(where: { property_id: { _eq: $propertyId } }, limit: 1) { id }
      }
    `,
      { propertyId: zohoLeadId }
    );
    if (found.crm_leads[0]) leadId = found.crm_leads[0].id;
  }

  if (!leadId) {
    const propertyRef = nestedId(z.Property) ?? str(z.Account_Name)?.trim() ?? null;
    if (propertyRef) {
      const found = await hasuraQuery<{ crm_leads: { id: string }[] }>(
        `
        query FindLeadByPropertyRef($propertyId: uuid!) {
          crm_leads(where: { property_id: { _eq: $propertyId } }, limit: 1) { id }
        }
      `,
        { propertyId: propertyRef }
      );
      if (found.crm_leads[0]) leadId = found.crm_leads[0].id;
    }
  }

  if (!leadId) {
    console.log(`   ⚠  Deal "${stageName}" (${z.Deal_Name}): no matching lead found, skipping`);
    return;
  }

  // Check if deal already exists
  const existingDeal = await hasuraQuery<{ crm_deals: { id: string }[] }>(
    `
    query FindDeal($leadId: uuid!) {
      crm_deals(where: { lead_id: { _eq: $leadId } }, limit: 1) { id }
    }
  `,
    { leadId }
  );

  if (existingDeal.crm_deals[0]) {
    await hasuraMutation(
      `
      mutation UpdateDeal($id: uuid!, $stageId: uuid!, $status: String!) {
        update_crm_deals_by_pk(
          pk_columns: { id: $id }
          _set: { stage_id: $stageId, status_label: $status }
        ) { id }
      }
    `,
      { id: existingDeal.crm_deals[0].id, stageId: stageId, status: stageName }
    );
    console.log(`   ↻  Deal (${stageName}): updated [deal_id=${existingDeal.crm_deals[0].id}]`);
    return;
  }

  // Get next deal_number
  const maxData = await hasuraQuery<{
    crm_deals_aggregate: { aggregate: { max: { deal_number: number | null } } };
  }>(`
    query MaxDealNumber {
      crm_deals_aggregate { aggregate { max { deal_number } } }
    }
  `);
  const dealNumber = (maxData.crm_deals_aggregate.aggregate.max.deal_number ?? 2000) + 1;

  await hasuraMutation(
    `
    mutation InsertDeal($object: crm_deals_insert_input!) {
      insert_crm_deals_one(object: $object) { id }
    }
  `,
    {
      object: {
        id:                        uuid(),
        deal_number:               dealNumber,
        lead_id:                   leadId,
        stage_id:                  stageId,
        status:                    "Active",
        status_label:              stageName,
        view_on_marketplace:       true,
        offer_value:               num(z.Amount ?? z.PSA_Value ?? z.Offer_Value),
        proposed_rent:             num(z.Proposed_Rent ?? z.S2R_Rent_Value),
        gross_cap_rate:            num(z.Gross_Cap_Rate ?? z.Local_Gross_Cap_Rate),
        annual_taxes:              num(z.Annual_Taxes ?? z.Taxes_Per_Year),
        insurance_quote:           num(z.Insurance_Quote),
        prepaid_rent_value:        num(z.Prepaid_Rent_Value),
        desired_lease_period:      num(z.Desired_Lease_Period),
        prepaid_months:            num(z.Prepaid_Months),
        security_deposit:          num(z.Security_Deposit),
        s2r_estimated_market_value:num(z.S2R_Estimated_Market_Value ?? z.Amount),
        discount_to_market_pct:    num(z.Discount_to_Market_Pct),
        psa_value:                 num(z.PSA_Value ?? z.Amount),
        s2r_rent_value:            num(z.S2R_Rent_Value),
        investor_score_crm:        num(z.Investor_Score_CRM),
        offer_presented_date:      isoDate(z.Offer_Presented_Date),
        offer_accepted_date:       isoDate(z.Offer_Accepted_Date),
        psa_execution_date:        isoDate(z.PSA_Execution_Date ?? z.Closing_Date),
        psa_expiration_date:       isoDate(z.PSA_Expiration_Date),
        deal_launching_date:       isoDate(z.Deal_Launching_Date),
        contract_assigned_date:    isoDate(z.Contract_Assigned_Date),
        inspection_period_exp_date:isoDate(z.Inspection_Period_Exp_Date),
        emd_received_date:         isoDate(z.EMD_Received_Date),
        estimated_closing_date:    isoDate(z.Closing_Date ?? z.Estimated_Closing_Date),
        actual_closing_date:       isoDate(z.Actual_Closing_Date),
        noc_recorded_date:         isoDate(z.NOC_Recorded_Date),
        last_note:                 str(z.Description ?? z.Last_Note),
        days_in_current_stage:     num(z.Days_in_Current_Stage),
        stage_entered_at:          isoDate(z.Stage_Entered_At ?? z.Created_Time),
      },
    }
  );
  console.log(`   +  Deal (${stageName}): created [deal_number=${dealNumber}]`);
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const sync = async () => {
  console.log(`\n🔄  Syncing ${LIMIT} leads + ${LIMIT} deals from Zoho CRM...\n`);

  // Verify Hasura connectivity
  await hasuraQuery(`query Ping { __typename }`);
  console.log("✅  Hasura connected.");

  console.log("\n🔑  Fetching Zoho token...");
  const token = await getToken();
  console.log("✅  Token acquired.");

  // ── Leads ─────────────────────────────────────────────────────────────────
  console.log(`\n📥  Fetching up to ${LIMIT} leads from Zoho Leads module...`);
  const zohoLeads = await fetchAll(token, "Leads", LIMIT);
  console.log(`   → ${zohoLeads.length} leads fetched.`);

  console.log("\n👤  Processing leads...");
  for (let i = 0; i < zohoLeads.length; i++) {
    try {
      await processLead(zohoLeads[i], i);
    } catch (err: any) {
      console.error(`   ❌ Lead ${i + 1} failed:`, err?.message ?? err);
    }
  }

  // ── Deals ─────────────────────────────────────────────────────────────────
  console.log(`\n📥  Fetching up to ${LIMIT} deals from Zoho Deals module...`);
  const zohoDeals = await fetchAll(token, "Deals", LIMIT);
  console.log(`   → ${zohoDeals.length} deals fetched.`);

  console.log("\n💼  Processing deals...");
  for (let i = 0; i < zohoDeals.length; i++) {
    try {
      await processDeal(zohoDeals[i], i);
    } catch (err: any) {
      console.error(`   ❌ Deal ${i + 1} failed:`, err?.message ?? err);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const summary = await hasuraQuery<{
    crm_leads_aggregate:      { aggregate: { count: number } };
    crm_deals_aggregate:      { aggregate: { count: number } };
    properties_aggregate:     { aggregate: { count: number } };
    crm_stages_aggregate:     { aggregate: { count: number } };
  }>(`
    query SyncSummary {
      crm_leads_aggregate      { aggregate { count } }
      crm_deals_aggregate      { aggregate { count } }
      properties_aggregate     { aggregate { count } }
      crm_stages_aggregate     { aggregate { count } }
    }
  `);

  console.log(`
🎉  Sync complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Zoho leads fetched : ${zohoLeads.length}
  Zoho deals fetched : ${zohoDeals.length}
  DB properties      : ${summary.properties_aggregate.aggregate.count}
  DB crm_leads       : ${summary.crm_leads_aggregate.aggregate.count}
  DB crm_deals       : ${summary.crm_deals_aggregate.aggregate.count}
  DB crm_stages      : ${summary.crm_stages_aggregate.aggregate.count}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Lead stage identification (Zoho Lead_Status field):
  ${[...LEAD_STAGES].join(" | ")}
`);

  process.exit(0);
};

sync().catch((err) => {
  console.error("\n❌  Sync failed:", err?.message ?? err);
  process.exit(1);
});
