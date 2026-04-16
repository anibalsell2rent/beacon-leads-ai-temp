import { hasuraQuery } from "../utils/hasura.client";

// ─── Types ─────────────────────────────────────────────────────────────────────

// Actual crm_employees columns (no first_name/last_name — those live in users)
interface Employee {
  id: string;            // uuid
  user_id: number | null; // FK → users.id (Int)
  initials: string | null;
  department: string | null;
  employee_code: string | null;
  is_active: boolean | null;
  hire_date: string | null;
  monthly_goal: number | null;
  quarterly_goal: number | null;
  yearly_goal: number | null;
  role_id: string | null;
  // enriched from users table:
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Counts leads assigned to a staff member.
 * seller_advisor_id / seller_manager_id / investor_advisor_id in crm_leads
 * are Int columns (FK → users.id). We match by user_id.
 */
const countAssignedLeads = async (userIntId: number): Promise<number> => {
  if (!userIntId) return 0;
  try {
    const data = await hasuraQuery<{
      crm_leads_aggregate: { aggregate: { count: number } };
    }>(
      `
      query CountLeads($uid: Int!) {
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
      { uid: userIntId }
    );
    return data.crm_leads_aggregate.aggregate.count;
  } catch {
    return 0;
  }
};

/** Counts deals assigned to a staff member (crm_deals advisor IDs are uuid). */
const countAssignedDeals = async (empUuid: string): Promise<number> => {
  if (!empUuid) return 0;
  try {
    const data = await hasuraQuery<{
      crm_deals_aggregate: { aggregate: { count: number } };
    }>(
      `
      query CountDeals($staffId: uuid!) {
        crm_deals_aggregate(
          where: {
            _or: [
              { seller_advisor_id:          { _eq: $staffId } }
              { investor_advisor_id:        { _eq: $staffId } }
              { transaction_coordinator_id: { _eq: $staffId } }
            ]
          }
        ) { aggregate { count } }
      }
    `,
      { staffId: empUuid }
    );
    return data.crm_deals_aggregate.aggregate.count;
  } catch {
    return 0;
  }
};

// ─── Staff member builder ──────────────────────────────────────────────────────

const buildStaffMember = async (
  emp: Employee,
  rolesMap: Map<string, string>,
  usersMap: Map<number, { first_name: string | null; last_name: string | null; email: string | null; role: string | null }>
) => {
  if (!emp) return null;

  const userInfo = emp.user_id ? usersMap.get(emp.user_id) : null;
  const roleName = emp.role_id ? rolesMap.get(emp.role_id) ?? null : null;

  // leads: match by users.id (Int); deals: match by crm_employees.id (uuid)
  const [activeLeads, activeDeals] = await Promise.all([
    emp.user_id ? countAssignedLeads(emp.user_id) : Promise.resolve(0),
    countAssignedDeals(emp.id),
  ]);

  return {
    id:             emp.user_id ?? emp.id,
    first_name:     emp.first_name     ?? userInfo?.first_name     ?? null,
    last_name:      emp.last_name      ?? userInfo?.last_name      ?? null,
    email:          emp.email          ?? userInfo?.email          ?? null,
    initials:       emp.initials       ?? null,
    department:     emp.department     ?? null,
    employee_code:  emp.employee_code  ?? null,
    is_active:      emp.is_active      ?? null,
    hire_date:      emp.hire_date      ?? null,
    monthly_goal:   emp.monthly_goal   ?? null,
    quarterly_goal: emp.quarterly_goal ?? null,
    yearly_goal:    emp.yearly_goal    ?? null,
    role_name:      roleName           ?? userInfo?.role ?? null,
    role_type:      roleName           ?? userInfo?.role ?? null,
    active_leads_count: activeLeads,
    active_deals_count: activeDeals,
  };
};

// ─── Seller profile builder ────────────────────────────────────────────────────

const buildSellerProfile = async (
  seller: any,
  lead: any | null,
  stage: any | null,
  property: any | null,
  advisor: any | null,
  manager: any | null,
  rolesMap: Map<string, string>,
  usersMap: Map<number, any>
) => {
  return {
    id: String(seller.id),
    // Contact
    first_name:                seller.first_name                ?? null,
    last_name:                 seller.last_name                 ?? null,
    phone:                     seller.phone                     ?? null,
    mobile:                    seller.mobile                    ?? null,
    alt_phone:                 seller.alt_phone                 ?? null,
    email:                     seller.email                     ?? null,
    alt_email:                 seller.alt_email                 ?? null,
    preferred_contact_method:  seller.preferred_contact_method  ?? null,
    best_time_to_call:         seller.best_time_to_call         ?? null,
    language:                  seller.language                  ?? null,
    // Co-owner
    second_seller_first_name:  seller.second_seller_first_name  ?? null,
    second_seller_last_name:   seller.second_seller_last_name   ?? null,
    second_seller_phone:       seller.second_seller_phone       ?? null,
    second_seller_email:       seller.second_seller_email       ?? null,
    second_seller_relationship:seller.second_seller_relationship ?? null,
    // Mailing
    mailing_address:           seller.mailing_address           ?? null,
    mailing_city:              seller.mailing_city              ?? null,
    mailing_state:             seller.mailing_state             ?? null,
    mailing_zip:               seller.mailing_zip               ?? null,
    // Situation
    motivation:                seller.motivation                ?? null,
    urgency:                   seller.urgency                   ?? null,
    reason_for_selling:        seller.reason_for_selling        ?? null,
    timeline_flexibility:      seller.timeline_flexibility      ?? null,
    wants_or_needs:            seller.wants_or_needs            ?? null,
    ultimate_seller_goals:     seller.ultimate_seller_goals     ?? null,
    relationship_to_property:  seller.relationship_to_property  ?? null,
    need_to_sell_by:           seller.need_to_sell_by           ?? null,
    // Personal
    date_of_birth:             seller.date_of_birth             ?? null,
    age:                       seller.age                       ?? null,
    occupation:                seller.occupation                ?? null,
    employer:                  seller.employer                  ?? null,
    employment_status:         seller.employment_status         ?? null,
    military_status:           seller.military_status           ?? null,
    is_veteran:                seller.is_veteran                ?? null,
    current_marriage_status:   seller.current_marriage_status   ?? null,
    spouse_name:               seller.spouse_name               ?? null,
    // Leaseback
    open_to_leaseback:         seller.open_to_leaseback         ?? null,
    desired_leaseback_period:  seller.desired_leaseback_period  ?? null,
    max_monthly_rent:          seller.max_monthly_rent ? parseFloat(seller.max_monthly_rent) : null,
    // Financial
    asking_price:              seller.asking_price ? parseFloat(seller.asking_price) : null,
    minimum_acceptable_price:  seller.minimum_acceptable_price ? parseFloat(seller.minimum_acceptable_price) : null,
    seller_annual_income:      seller.seller_annual_income ? parseFloat(seller.seller_annual_income) : null,
    total_household_income:    seller.total_household_income ? parseFloat(seller.total_household_income) : null,
    credit_score_range:        seller.credit_score_range        ?? null,
    monthly_debts:             seller.monthly_debts ? parseFloat(seller.monthly_debts) : null,
    is_in_bankruptcy:          seller.is_in_bankruptcy          ?? null,
    // Identity
    idenfy_status:             seller.idenfy_status             ?? null,
    opt_out_dnc:               seller.opt_out_dnc               ?? null,
    text_opt_out:              seller.text_opt_out              ?? null,
    email_opt_out:             seller.email_opt_out             ?? null,
    // Linked lead & resolved info
    lead_id:            lead?.id     ?? null,
    lead_stage:         stage?.name  ?? null,
    property_address: property
      ? [property.address, property.city, property.state, property.zip_code]
          .filter(Boolean)
          .join(", ")
      : null,
    assigned_advisor: advisor
      ? await buildStaffMember(advisor, rolesMap, usersMap)
      : null,
    assigned_manager: manager
      ? await buildStaffMember(manager, rolesMap, usersMap)
      : null,
  };
};

// ─── Service ───────────────────────────────────────────────────────────────────

export class TeamDirectoryService {
  /** Fetch all shared lookup data (roles, users) in one call */
  private static async fetchLookups() {
    const data = await hasuraQuery<{
      crm_roles: { id: string; name: string }[];
      users: {
        id: number;
        first_name: string | null;
        last_name: string | null;
        email: string | null;
        role: string | null;
      }[];
    }>(`
      query Lookups {
        crm_roles { id name }
        users { id first_name last_name email role }
      }
    `);

    const rolesMap = new Map(data.crm_roles.map((r) => [r.id, r.name]));
    const usersMap = new Map(data.users.map((u) => [u.id, u]));
    return { rolesMap, usersMap };
  }

  // ── All sellers ────────────────────────────────────────────────────────────
  static async getAllSellers() {
    const { rolesMap, usersMap } = await this.fetchLookups();

    const data = await hasuraQuery<{
      crm_sellers: any[];
      crm_leads: any[];
      crm_stages: { id: string; name: string }[];
      properties: any[];
      crm_employees: Employee[];
    }>(`
      query AllSellers {
        crm_sellers {
          id lead_id first_name last_name phone mobile alt_phone email alt_email
          preferred_contact_method best_time_to_call language
          second_seller_first_name second_seller_last_name second_seller_phone
          second_seller_email second_seller_relationship
          mailing_address mailing_city mailing_state mailing_zip
          motivation urgency reason_for_selling timeline_flexibility
          wants_or_needs ultimate_seller_goals relationship_to_property need_to_sell_by
          date_of_birth age occupation employer employment_status
          military_status is_veteran current_marriage_status spouse_name
          open_to_leaseback desired_leaseback_period max_monthly_rent
          asking_price minimum_acceptable_price seller_annual_income total_household_income
          credit_score_range monthly_debts is_in_bankruptcy
          idenfy_status opt_out_dnc text_opt_out email_opt_out
        }
        crm_leads {
          id stage_id property_id seller_advisor_id seller_manager_id
        }
        crm_stages { id name }
        properties { id address city state zip_code }
        crm_employees {
          id user_id initials department
          employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
        }
      }
    `);

    const leadsMap     = new Map(data.crm_leads.map((l: any) => [String(l.id), l]));
    const stagesMap    = new Map(data.crm_stages.map((s) => [String(s.id), s]));
    const propertiesMap= new Map(data.properties.map((p: any) => [String(p.id), p]));
    const employeesMap = new Map(data.crm_employees.map((e) => [String(e.id), e]));

    // seller_advisor_id in crm_leads is Int (FK → users.id)
    // So we find the employee whose user_id matches
    const findEmployee = (advisorId: string | number): Employee | null => {
      const intId = Number(advisorId);
      for (const emp of data.crm_employees) {
        if (emp.user_id === intId) return emp;
      }
      return null;
    };

    return Promise.all(
      data.crm_sellers.map(async (seller: any) => {
        const lead    = seller.lead_id ? leadsMap.get(String(seller.lead_id)) ?? null : null;
        const stage   = lead?.stage_id ? stagesMap.get(String(lead.stage_id)) ?? null : null;
        const property= lead?.property_id ? propertiesMap.get(String(lead.property_id)) ?? null : null;
        const advisor = lead?.seller_advisor_id ? findEmployee(String(lead.seller_advisor_id)) : null;
        const manager = lead?.seller_manager_id ? findEmployee(String(lead.seller_manager_id)) : null;

        return buildSellerProfile(seller, lead, stage, property, advisor, manager, rolesMap, usersMap);
      })
    );
  }

  // ── Seller by lead_id ──────────────────────────────────────────────────────
  static async getSellerByLeadId(leadId: string) {
    const { rolesMap, usersMap } = await this.fetchLookups();

    const data = await hasuraQuery<{
      crm_sellers: any[];
      crm_leads: any[];
      crm_stages: { id: string; name: string }[];
      properties: any[];
      crm_employees: Employee[];
    }>(
      `
      query SellerByLead($leadId: uuid!) {
        crm_sellers(where: { lead_id: { _eq: $leadId } }) {
          id lead_id first_name last_name phone mobile alt_phone email alt_email
          preferred_contact_method best_time_to_call language
          second_seller_first_name second_seller_last_name second_seller_phone
          second_seller_email second_seller_relationship
          mailing_address mailing_city mailing_state mailing_zip
          motivation urgency reason_for_selling timeline_flexibility
          wants_or_needs ultimate_seller_goals relationship_to_property need_to_sell_by
          date_of_birth age occupation employer employment_status
          military_status is_veteran current_marriage_status spouse_name
          open_to_leaseback desired_leaseback_period max_monthly_rent
          asking_price minimum_acceptable_price seller_annual_income total_household_income
          credit_score_range monthly_debts is_in_bankruptcy
          idenfy_status opt_out_dnc text_opt_out email_opt_out
        }
        crm_leads(where: { id: { _eq: $leadId } }) {
          id stage_id property_id seller_advisor_id seller_manager_id
        }
        crm_stages { id name }
        properties { id address city state zip_code }
        crm_employees {
          id user_id initials department
          employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
        }
      }
    `,
      { leadId }
    );

    const seller = data.crm_sellers[0];
    if (!seller) return null;

    const lead     = data.crm_leads[0]  ?? null;
    const stagesMap = new Map(data.crm_stages.map((s) => [String(s.id), s]));
    const propertiesMap = new Map(data.properties.map((p: any) => [String(p.id), p]));

    const stage    = lead?.stage_id    ? stagesMap.get(String(lead.stage_id)) ?? null : null;
    const property = lead?.property_id ? propertiesMap.get(String(lead.property_id)) ?? null : null;

    const employeesMap = new Map(data.crm_employees.map((e) => [String(e.id), e]));
    const findEmployee = (id: string): Employee | null => {
      if (employeesMap.has(id)) return employeesMap.get(id)!;
      if (/^\d+$/.test(id)) {
        for (const emp of data.crm_employees) {
          if (emp.user_id === Number(id)) return emp;
        }
      }
      return null;
    };

    const advisor = lead?.seller_advisor_id ? findEmployee(String(lead.seller_advisor_id)) : null;
    const manager = lead?.seller_manager_id ? findEmployee(String(lead.seller_manager_id)) : null;

    return buildSellerProfile(seller, lead, stage, property, advisor, manager, rolesMap, usersMap);
  }

  // ── Staff member by id ─────────────────────────────────────────────────────
  static async getStaffMember(id: string) {
    const { rolesMap, usersMap } = await this.fetchLookups();

    const data = await hasuraQuery<{ crm_employees: Employee[] }>(
      `
      query GetEmployee($id: uuid!) {
        crm_employees(where: { id: { _eq: $id } }) {
          id user_id initials department
          employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
        }
      }
    `,
      { id }
    );

    const emp = data.crm_employees[0];
    if (!emp) return null;
    return buildStaffMember(emp, rolesMap, usersMap);
  }

  // ── Staff by role ID (filters by users.role_id) ─────────────────────────────
  static async getStaffByRoleId(roleId: string) {
    console.log("[v0] getStaffByRoleId called with roleId:", roleId);
    
    // First get the role name
    const roleData = await hasuraQuery<{
      roles_by_pk: { name: string } | null;
    }>(`
      query GetRoleName($roleId: uuid!) {
        roles_by_pk(id: $roleId) { name }
      }
    `, { roleId });
    console.log("[v0] roleData:", JSON.stringify(roleData));
    const roleName = roleData.roles_by_pk?.name ?? null;

    // Get users with the specified role_id (is_active can be null, so check for != false)
    const data = await hasuraQuery<{
      users: {
        id: number;
        email: string | null;
        first_name: string | null;
        last_name: string | null;
        is_active: boolean | null;
        department: string | null;
        monthly_goal: number | null;
        quarterly_goal: number | null;
        yearly_goal: number | null;
        hire_date: string | null;
        initials: string | null;
        slug: string | null;
      }[];
    }>(`
      query UsersByRoleId($roleId: uuid!) {
        users(where: { role_id: { _eq: $roleId }, is_active: { _eq: true } }) {
          id email first_name last_name is_active department
          monthly_goal quarterly_goal yearly_goal hire_date initials slug
        }
      }
    `, { roleId });
    console.log("[v0] users found:", data.users.length, JSON.stringify(data.users.slice(0, 2)));

    return data.users.map((u) => ({
      id: u.id,
      first_name: u.first_name,
      last_name: u.last_name,
      email: u.email,
      initials: u.initials,
      slug: u.slug,
      department: u.department,
      employee_code: null,
      is_active: u.is_active,
      hire_date: u.hire_date,
      monthly_goal: u.monthly_goal,
      quarterly_goal: u.quarterly_goal,
      yearly_goal: u.yearly_goal,
      role_name: roleName,
      role_type: roleName,
      active_leads_count: null,
      active_deals_count: null,
    }));
  }

  // ── Staff by role keyword ──────────────────────────────────────────────────
  static async getStaffByRoleKeyword(keyword: string) {
    const { rolesMap, usersMap } = await this.fetchLookups();

    const data = await hasuraQuery<{
      crm_roles: { id: string; name: string }[];
      crm_employees: Employee[];
    }>(`
      query StaffByRole {
        crm_roles { id name }
        crm_employees(where: { is_active: { _eq: true } }) {
          id user_id initials department
          employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
        }
      }
    `);

    const matchingRoleIds = data.crm_roles
      .filter((r) => r.name?.toUpperCase().includes(keyword.toUpperCase()))
      .map((r) => r.id);

    const employees =
      matchingRoleIds.length > 0
        ? data.crm_employees.filter((e) => e.role_id && matchingRoleIds.includes(e.role_id))
        : data.crm_employees; // fallback: all active

    return Promise.all(employees.map((e) => buildStaffMember(e, rolesMap, usersMap)));
  }

  // ── Team Members (frontend-specific) ──────────────────────────────────────
  static async getTeamMembers() {
    const { rolesMap, usersMap } = await this.fetchLookups();

    const data = await hasuraQuery<{ crm_employees: Employee[] }>(`
      query ActiveEmployees {
        crm_employees(where: { is_active: { _eq: true } }) {
          id user_id initials department
          employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
        }
      }
    `);

    const staffMembers = await Promise.all(
      data.crm_employees.map((e) => buildStaffMember(e, rolesMap, usersMap))
    );

    return staffMembers.filter(Boolean).map((s: any) => ({
      id:              Number(s.id),
      first_name:      s.first_name,
      last_name:       s.last_name,
      initials:        s.initials,
      email:           s.email,
      role:            s.role_name,
      active_leads:    s.active_leads_count,
      conversions:     0,
      conversion_rate: 0.0,
      leads_at_risk:   0,
      monthly_goal:    s.monthly_goal || 0,
    }));
  }

  // ── Full directory ─────────────────────────────────────────────────────────
  static async getTeamDirectory() {
    const { rolesMap, usersMap } = await this.fetchLookups();

    const [sellers, empData] = await Promise.all([
      this.getAllSellers(),
      hasuraQuery<{
        crm_employees: Employee[];
        crm_roles: { id: string; name: string }[];
      }>(`
        query AllEmployees {
          crm_employees {
            id user_id first_name last_name email initials department
            employee_code is_active hire_date monthly_goal quarterly_goal yearly_goal role_id
          }
          crm_roles { id name }
        }
      `),
    ]);

    const roleNameById = new Map(empData.crm_roles.map((r) => [r.id, r.name]));

    const getByRoleKeyword = (keyword: string) =>
      empData.crm_employees.filter((e) => {
        const roleName = e.role_id ? roleNameById.get(e.role_id) ?? "" : "";
        return roleName.toUpperCase().includes(keyword.toUpperCase());
      });

    const [sellerAdvisors, sellerManagers, investorAdvisors] = await Promise.all([
      Promise.all(getByRoleKeyword("SELLER_ADVISOR").map((e) => buildStaffMember(e, rolesMap, usersMap))),
      Promise.all(getByRoleKeyword("SELLER_MANAGER").map((e) => buildStaffMember(e, rolesMap, usersMap))),
      Promise.all(getByRoleKeyword("INVESTOR_ADVISOR").map((e) => buildStaffMember(e, rolesMap, usersMap))),
    ]);

    return {
      sellers,
      seller_advisors:   sellerAdvisors,
      seller_managers:   sellerManagers,
      investor_advisors: investorAdvisors,
      total_sellers:     sellers.length,
      total_staff:       empData.crm_employees.length,
    };
  }
}
