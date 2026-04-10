

import "dotenv/config";
import { hasuraQuery, hasuraMutation } from "../utils/hasura.client";

// ─── CLI args ─────────────────────────────────────────────────────────────────

const targetService = (() => {
  const idx = process.argv.indexOf("--service");
  return idx !== -1 ? process.argv[idx + 1] : "all";
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => Promise<any>) {
  process.stdout.write(`  ► ${name} ... `);
  try {
    const result = await fn();
    const preview = JSON.stringify(result).slice(0, 120);
    console.log(`✅  ${preview}${preview.length >= 120 ? "…" : ""}`);
    passed++;
  } catch (err: any) {
    console.log(`❌  ${err.message}`);
    failed++;
  }
}

// ─── Test suites ──────────────────────────────────────────────────────────────

// ── 1. Connectivity ping ──────────────────────────────────────────────────────
async function testPing() {
  console.log("\n[PING] Hasura connectivity");
  await test("__typename", () => hasuraQuery(`query { __typename }`));
}

// ── 2. Analytics ─────────────────────────────────────────────────────────────
async function testAnalytics() {
  console.log("\n[ANALYTICS]");

  await test("crm_leads count", () =>
    hasuraQuery(`
      query { crm_leads_aggregate { aggregate { count } } }
    `)
  );

  await test("lead source breakdown (marketing_source + lead_score)", () =>
    hasuraQuery(`
      query {
        crm_leads(limit: 5) { marketing_source lead_score }
        crm_leads_aggregate { aggregate { count } }
      }
    `)
  );

  await test("pipeline funnel (stage_id grouping)", () =>
    hasuraQuery(`
      query {
        crm_leads(limit: 5) { stage_id }
        crm_stages { id name }
      }
    `)
  );

  await test("workload heatmap (advisor + stage)", () =>
    hasuraQuery(`
      query {
        crm_leads(
          where: {
            seller_advisor_id: { _is_null: false }
            stage_id: { _is_null: false }
          }
          limit: 5
        ) { seller_advisor_id stage_id }
        crm_employees(limit: 3) { id user_id initials }
        users(limit: 3) { id first_name last_name }
        crm_stages(limit: 3) { id name }
      }
    `)
  );
}

// ── 3. Deals ──────────────────────────────────────────────────────────────────
async function testDeals() {
  console.log("\n[DEALS]");

  await test("properties list (no filter)", () =>
    hasuraQuery(`
      query {
        properties(order_by: { created_at: desc }, limit: 3) {
          id address city state zip_code property_type
          bedrooms bathrooms sqft year_built
          stage listing_status deal_number price created_at
        }
      }
    `)
  );

  await test("properties list (with status filter)", () =>
    hasuraQuery(
      `
      query GetDeals($status: String, $limit: Int!) {
        properties(
          where: { _or: [{ stage: { _eq: $status } }, { listing_status: { _eq: $status } }] }
          order_by: { created_at: desc }
          limit: $limit
        ) { id address stage listing_status }
      }
    `,
      { status: "Active", limit: 3 }
    )
  );
}

// ── 4. Team Performance ───────────────────────────────────────────────────────
async function testTeamPerformance() {
  console.log("\n[TEAM PERFORMANCE]");

  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const end   = new Date().toISOString();

  await test("total leads (current month)", () =>
    hasuraQuery(
      `
      query($start: timestamptz!, $end: timestamptz!) {
        totalLeads: crm_leads_aggregate(
          where: {
            date_created: { _gte: $start, _lte: $end }
            _or: [
              { reason_for_failure: { _is_null: true } }
              { reason_for_failure: { _nilike: "%Test%" } }
            ]
          }
        ) { aggregate { count } }
      }
    `,
      { start, end }
    )
  );

  // crm_deals date columns are `date` type → pass YYYY-MM-DD
  const dateStart = start.split("T")[0];
  const dateEnd   = end.split("T")[0];

  await test("offers presented/accepted + PSA counts (date scalar)", () =>
    hasuraQuery(
      `
      query($dateStart: date!, $dateEnd: date!) {
        offersPresented: crm_deals_aggregate(
          where: { offer_presented_date: { _gte: $dateStart, _lte: $dateEnd } }
        ) { aggregate { count } }
        offersAccepted: crm_deals_aggregate(
          where: { offer_accepted_date: { _gte: $dateStart, _lte: $dateEnd } }
        ) { aggregate { count } }
        psasExecuted: crm_deals_aggregate(
          where: { psa_execution_date: { _gte: $dateStart, _lte: $dateEnd } }
        ) { aggregate { count } }
      }
    `,
      { dateStart, dateEnd }
    )
  );

  await test("closed deals avg revenue (date scalar)", () =>
    hasuraQuery(
      `
      query($dateStart: date!, $dateEnd: date!) {
        crm_deals(where: { actual_closing_date: { _gte: $dateStart, _lte: $dateEnd } }) {
          lead_id
        }
      }
    `,
      { dateStart, dateEnd }
    )
  );
}

// ── 5. Leaderboard ────────────────────────────────────────────────────────────
async function testLeaderboard() {
  console.log("\n[LEADERBOARD]");

  const start = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const end   = new Date().toISOString();

  await test("users (role + role_id)", () =>
    hasuraQuery(`
      query { users(limit: 3) { id first_name last_name role role_id } }
    `)
  );

  // crm_activities.created_at is `timestamp` (no tz) not `timestamptz`
  await test("crm_activities in date range (timestamp scalar)", () =>
    hasuraQuery(
      `
      query($start: timestamp!, $end: timestamp!) {
        crm_activities(
          where: { created_at: { _gte: $start, _lte: $end } }
          limit: 3
        ) { created_by activity_type_id created_at }
      }
    `,
      { start, end }
    )
  );

  await test("booking leads in date range", () =>
    hasuraQuery(
      `
      query($start: timestamptz!, $end: timestamptz!) {
        crm_leads(
          where: { scheduled_booking_date: { _gte: $start, _lte: $end } }
          limit: 3
        ) { seller_advisor_id scheduled_booking_date }
      }
    `,
      { start, end }
    )
  );

  await test("converted leads in date range", () =>
    hasuraQuery(
      `
      query($start: timestamptz!, $end: timestamptz!) {
        crm_leads(
          where: {
            result: { _eq: "Converted" }
            date_created: { _gte: $start, _lte: $end }
          }
          limit: 3
        ) { seller_advisor_id seller_manager_id }
      }
    `,
      { start, end }
    )
  );

  await test("all manager leads (for deal grouping)", () =>
    hasuraQuery(`
      query { crm_leads(limit: 3) { id seller_manager_id } }
    `)
  );
}

// ── 6. Individual Dashboard ───────────────────────────────────────────────────
async function testDashboard() {
  console.log("\n[INDIVIDUAL DASHBOARD]");

  // Grab a real user id first
  const userData = await hasuraQuery<{ users: { id: number; email: string | null }[] }>(
    `query { users(limit: 1) { id email } }`
  );
  const user = userData.users[0];
  if (!user) {
    console.log("  ⚠  No users found — skipping dashboard tests");
    return;
  }

  const empId  = String(user.id);
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.toISOString();
  const todayEnd   = new Date(new Date().setHours(23, 59, 59, 999)).toISOString();

  await test(`identity resolution (id=${empId})`, () =>
    hasuraQuery(
      `
      query($where: users_bool_exp!) {
        users(where: $where, limit: 1) { id first_name last_name email }
      }
    `,
      { where: { id: { _eq: user.id } } }
    )
  );

  // crm_activities.created_at → timestamp (no tz)
  await test("hot leads + activity count (timestamp scalar)", () =>
    hasuraQuery(
      `
      query($ts: timestamp!, $te: timestamp!) {
        crm_leads(where: { is_hot: { _eq: true } }, limit: 3) {
          id lead_number stage_id is_hot seller_advisor_id seller_manager_id
        }
        callsCount: crm_activities_aggregate(
          where: {
            activity_type_id: { _eq: 1 }
            created_at: { _gte: $ts, _lte: $te }
          }
        ) { aggregate { count } }
      }
    `,
      { ts: todayStart, te: todayEnd }
    )
  );
}

// ── 7. Team Directory ─────────────────────────────────────────────────────────
async function testDirectory() {
  console.log("\n[TEAM DIRECTORY]");

  await test("crm_roles lookup", () =>
    hasuraQuery(`query { crm_roles { id name } }`)
  );

  await test("users lookup", () =>
    hasuraQuery(`query { users(limit: 3) { id first_name last_name email role } }`)
  );

  await test("crm_employees (active, no first/last_name — those live in users)", () =>
    hasuraQuery(`
      query {
        crm_employees(where: { is_active: { _eq: true } }, limit: 3) {
          id user_id initials department
          employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
        }
      }
    `)
  );

  await test("crm_sellers sample", () =>
    hasuraQuery(`
      query {
        crm_sellers(limit: 2) {
          id lead_id first_name last_name phone email mailing_state
        }
      }
    `)
  );

  await test("lead count by staff member (Int user_id)", async () => {
    const emp = await hasuraQuery<{ crm_employees: { id: string; user_id: number | null }[] }>(
      `query { crm_employees(where: { user_id: { _is_null: false } }, limit: 1) { id user_id } }`
    );
    const uid = emp.crm_employees[0]?.user_id;
    if (!uid) return "no employees with user_id";
    return hasuraQuery(
      `
      query($uid: Int!) {
        crm_leads_aggregate(
          where: {
            _or: [
              { seller_advisor_id:           { _eq: $uid } }
              { seller_manager_id:           { _eq: $uid } }
              { investor_advisor_id:         { _eq: $uid } }
              { cold_outreach_specialist_id: { _eq: $uid } }
              { transaction_coordinator_id:  { _eq: $uid } }
            ]
          }
        ) { aggregate { count } }
      }
    `,
      { uid }
    );
  });
}

// ── 8. Lead Details ───────────────────────────────────────────────────────────
async function testLeadDetails() {
  console.log("\n[LEAD DETAILS]");

  // Grab a real lead id first
  const leadData = await hasuraQuery<{ crm_leads: { id: string; property_id: string | null }[] }>(
    `query { crm_leads(limit: 1) { id property_id } }`
  );
  const lead = leadData.crm_leads[0];
  if (!lead) {
    console.log("  ⚠  No leads found — skipping lead details tests");
    return;
  }

  await test(`lead by id (${lead.id})`, () =>
    hasuraQuery(
      `
      query($leadId: uuid!) {
        crm_leads(where: { id: { _eq: $leadId } }) {
          id lead_number is_hot lead_score stage_id s2r_net_revenue
          contract_price marketing_source seller_segment
          last_updated created_at property_id seller_advisor_id seller_manager_id
        }
        crm_sellers(where: { lead_id: { _eq: $leadId } }) {
          id first_name last_name phone email mailing_address mailing_city mailing_state mailing_zip
        }
      }
    `,
      { leadId: lead.id }
    )
  );

  if (lead.property_id) {
    await test(`property details (${lead.property_id})`, () =>
      hasuraQuery(
        `
        query($propertyId: String!) {
          properties(where: { id: { _eq: $propertyId } }) {
            id address city state zip_code county
          }
          crm_property_financials(
            where: { property_id: { _eq: $propertyId } }
            limit: 1
          ) {
            id is_in_foreclosure mtg_remaining_balance
          }
          properties_lead_scoring(where: { property_id: { _eq: $propertyId } }) {
            section seller_score property_score transaction_score investor_score s2r_fee
          }
          crm_property_realtor_info(
            where: { property_id: { _eq: $propertyId } }
            limit: 1
          ) { property_id days_on_market }
        }
      `,
        { propertyId: lead.property_id }
      )
    );
  }

  await test("employee user_id lookup (Int)", async () => {
    const empData = await hasuraQuery<{ crm_employees: { id: string; user_id: number | null }[] }>(
      `query { crm_employees(where: { user_id: { _is_null: false } }, limit: 1) { id user_id } }`
    );
    const emp = empData.crm_employees[0];
    if (!emp?.user_id) return "no employee with user_id";
    return hasuraQuery(
      `
      query($ids: [Int!]!) {
        users(where: { id: { _in: $ids } }) { id first_name last_name }
      }
    `,
      { ids: [emp.user_id] }
    );
  });
}

// ── 9. Pipeline Relations ─────────────────────────────────────────────────────
async function testPipeline() {
  console.log("\n[PIPELINE]");

  await test("user identity resolution (by email)", () =>
    hasuraQuery(
      `
      query($where: users_bool_exp!) {
        users(where: $where, limit: 1) { id }
      }
    `,
      { where: { email: { _eq: "test@example.com" } } }
    )
  );

  await test("stage name → id resolution", () =>
    hasuraQuery(
      `
      query($names: [String!]!) {
        crm_stages(where: { name: { _in: $names } }) { id name }
      }
    `,
      { names: ["New Lead", "Initial Booking"] }
    )
  );

  await test("pipeline leads (no filters, limit 3)", () =>
    hasuraQuery(
      `
      query($where: crm_leads_bool_exp!, $limit: Int!, $offset: Int!) {
        crm_leads(where: $where, limit: $limit, offset: $offset, order_by: { last_updated: desc }) {
          id property_id stage_id seller_advisor_id seller_manager_id
          investor_advisor_id is_hot lead_score seller_segment marketing_source
          lead_notes days_in_current_stage pipeline_type s2r_net_revenue
          cap_rate contract_price last_updated lead_number result
        }
        crm_leads_aggregate(where: $where) { aggregate { count } }
      }
    `,
      { where: {}, limit: 3, offset: 0 }
    )
  );

  // Grab real lead + property IDs from above
  const leadsData = await hasuraQuery<{
    crm_leads: { id: string; property_id: string | null; seller_advisor_id: string | null }[]
  }>(`query { crm_leads(limit: 3) { id property_id seller_advisor_id } }`);

  const leadIds    = leadsData.crm_leads.map((l) => l.id);
  const propertyIds= leadsData.crm_leads.map((l) => l.property_id).filter(Boolean) as string[];
  const empIds     = leadsData.crm_leads.map((l) => l.seller_advisor_id).filter(Boolean) as string[];

  // empIds from seller_advisor_id are Int (FK → users.id)
  const userIntIds = leadsData.crm_leads
    .map((l) => l.seller_advisor_id)
    .filter(Boolean)
    .map(Number);

  await test("pipeline relations batch (uuid leads + String properties + Int userIds)", () =>
    hasuraQuery(
      `
      query PipelineRelations(
        $leadIds:     [uuid!]!
        $propertyIds: [String!]!
        $userIds:     [Int!]!
      ) {
        crm_sellers(where: { lead_id: { _in: $leadIds } }) {
          lead_id first_name last_name mailing_state
        }
        crm_property_financials(where: { property_id: { _in: $propertyIds } }) {
          property_id is_in_foreclosure
        }
        crm_stages { id name }
        properties(where: { id: { _in: $propertyIds } }) {
          id address city state zip_code seller_name
        }
        properties_lead_scoring(where: { property_id: { _in: $propertyIds } }) {
          property_id section seller_score property_score transaction_score investor_score s2r_fee
        }
        crm_deals(where: { lead_id: { _in: $leadIds } }) {
          lead_id offer_presented_date
        }
        crm_property_realtor_info(where: { property_id: { _in: $propertyIds } }) {
          property_id days_on_market
        }
        users(where: { id: { _in: $userIds } }) {
          id first_name last_name
        }
      }
    `,
      {
        leadIds,
        propertyIds: propertyIds.length > 0 ? propertyIds : ["__none__"],
        userIds:     userIntIds.length > 0 ? userIntIds : [-1],
      }
    )
  );
}

// ── 10. Sync mutations ────────────────────────────────────────────────────────
async function testSync() {
  console.log("\n[SYNC — read-only checks, no actual mutation]");

  await test("stage lookup (by name + type)", () =>
    hasuraQuery(
      `
      query($name: String!, $type: String!) {
        crm_stages(where: { name: { _eq: $name }, stage_type: { _eq: $type } }, limit: 1) { id }
      }
    `,
      { name: "New Lead", type: "LEAD" }
    )
  );

  await test("lead lookup by property_id (String)", () =>
    hasuraQuery(
      `
      query($propertyId: String!) {
        crm_leads(where: { property_id: { _eq: $propertyId } }, limit: 1) { id }
      }
    `,
      { propertyId: "__test__" }
    )
  );

  await test("seller lookup by lead_id (uuid)", async () => {
    const d = await hasuraQuery<{ crm_leads: { id: string }[] }>(
      `query { crm_leads(limit: 1) { id } }`
    );
    const leadId = d.crm_leads[0]?.id;
    if (!leadId) return "no leads";
    return hasuraQuery(
      `
      query($leadId: uuid!) {
        crm_sellers(where: { lead_id: { _eq: $leadId } }, limit: 1) { id }
      }
    `,
      { leadId }
    );
  });

  await test("max deal_number aggregate", () =>
    hasuraQuery(`
      query {
        crm_deals_aggregate { aggregate { max { deal_number } } }
      }
    `)
  );

  await test("summary counts (leads + deals + properties + stages)", () =>
    hasuraQuery(`
      query {
        crm_leads_aggregate      { aggregate { count } }
        crm_deals_aggregate      { aggregate { count } }
        properties_aggregate     { aggregate { count } }
        crm_stages_aggregate     { aggregate { count } }
      }
    `)
  );
}

// ─── Runner ───────────────────────────────────────────────────────────────────

const suites: Record<string, () => Promise<void>> = {
  ping:            testPing,
  analytics:       testAnalytics,
  deals:           testDeals,
  teamPerformance: testTeamPerformance,
  leaderboard:     testLeaderboard,
  dashboard:       testDashboard,
  directory:       testDirectory,
  leadDetails:     testLeadDetails,
  pipeline:        testPipeline,
  sync:            testSync,
};

(async () => {
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Hasura Query Smoke Tests");
  console.log(`  Endpoint : ${process.env.HASURA_ENDPOINT ?? "(not set)"}`);
  console.log(`  Target   : ${targetService}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Always run ping first
  await testPing();

  if (targetService === "all") {
    for (const [name, fn] of Object.entries(suites)) {
      if (name === "ping") continue;
      await fn();
    }
  } else {
    const fn = suites[targetService];
    if (!fn) {
      console.error(`\nUnknown service "${targetService}". Valid values: ${Object.keys(suites).join(", ")}`);
      process.exit(1);
    }
    if (targetService !== "ping") await fn();
  }

  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  process.exit(failed > 0 ? 1 : 0);
})();
