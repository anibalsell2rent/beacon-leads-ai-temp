import { hasuraQuery } from "../utils/hasura.client";
import {
  ACTIVITY_TYPES,
  ContactHistoryActivityDTO,
  ContactHistoryFilters,
  ContactHistoryResult,
  ContactHistoryTeamMember,
  RawActivityRow,
} from "../graphql/types/contactHistory.types";

// ─── Query documents ─────────────────────────────────────────────────────────

const ACTIVITY_FIELDS = `
  id
  activity_type_id
  notes
  created_by
  created_at
  seller_id
  lead_id
  property_id
  due_date
  zoho_id
  user {
    id
    first_name
    last_name
    initials
  }
  crm_activity_type {
    id
    name
  }
`;

const COUNTS_BLOCK = (scopeVar: string) => `
  call: crm_activities_aggregate(
    where: { ${scopeVar}: { _eq: $${scopeVar} }, activity_type_id: { _eq: 1 } }
  ) {
    aggregate { count }
  }
  sms: crm_activities_aggregate(
    where: { ${scopeVar}: { _eq: $${scopeVar} }, activity_type_id: { _eq: 2 }, created_by: { _neq: $aiUserId } }
  ) {
    aggregate { count }
  }
  email: crm_activities_aggregate(
    where: { ${scopeVar}: { _eq: $${scopeVar} }, activity_type_id: { _eq: 3 } }
  ) {
    aggregate { count }
  }
  note: crm_activities_aggregate(
    where: { ${scopeVar}: { _eq: $${scopeVar} }, activity_type_id: { _eq: 4 } }
  ) {
    aggregate { count }
  }
  ai_call: crm_activities_aggregate(
    where: { ${scopeVar}: { _eq: $${scopeVar} }, activity_type_id: { _eq: 7 } }
  ) {
    aggregate { count }
  }
  ai_sms: crm_activities_aggregate(
    where: { ${scopeVar}: { _eq: $${scopeVar} }, activity_type_id: { _eq: 2 }, created_by: { _eq: $aiUserId } }
  ) {
    aggregate { count }
  }
`;

// ─── Service ─────────────────────────────────────────────────────────────────

export class ContactHistoryService {
  private static getAiUserId(): number {
    const raw = process.env.AI_USER_ID;
    if (!raw) {
      throw new Error("AI_USER_ID env var is not set");
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`AI_USER_ID env var is invalid: ${raw}`);
    }
    return parsed;
  }

  // ─── Team members ─────────────────────────────────────────────────────────

  static async getTeamMembers(): Promise<ContactHistoryTeamMember[]> {
    const aiUserId = this.getAiUserId();

    const data = await hasuraQuery<{
      users: ContactHistoryTeamMember[];
    }>(
      `query GetTeamMembers {
        users(where: { is_active: { _eq: true } }, order_by: { first_name: asc }) {
          id
          first_name
          last_name
          initials
        }
      }`
    );

    const others = data.users.filter((u) => u.id !== aiUserId);
    const aiFromDb = data.users.find((u) => u.id === aiUserId);

    const aiEntry: ContactHistoryTeamMember = aiFromDb ?? {
      id: aiUserId,
      first_name: "AI",
      last_name: null,
      initials: "AI",
    };

    return [aiEntry, ...others];
  }

  // ─── By seller ────────────────────────────────────────────────────────────

  static async getBySeller(
    sellerId: number,
    filters: ContactHistoryFilters = {}
  ): Promise<ContactHistoryResult> {
    if (!sellerId || !Number.isInteger(sellerId)) {
      throw new Error(`seller_id must be a valid integer, got: ${sellerId}`);
    }
    return this.getByScope("seller_id", "Int", sellerId, filters);
  }

  // ─── By lead ──────────────────────────────────────────────────────────────

  static async getByLead(
    leadId: string,
    filters: ContactHistoryFilters = {}
  ): Promise<ContactHistoryResult> {
    if (!leadId) {
      throw new Error("lead_id is required");
    }
    return this.getByScope("lead_id", "String", leadId, filters);
  }

  // ─── Core query (shared by seller/lead) ───────────────────────────────────

  private static async getByScope(
    scopeVar: "seller_id" | "lead_id",
    scopeGqlType: "String" | "Int",
    scopeValue: string | number,
    filters: ContactHistoryFilters
  ): Promise<ContactHistoryResult> {
    const aiUserId = this.getAiUserId();
    const MAX_LIMIT = 100;
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.limit && filters.limit > 0 ? Math.min(filters.limit, MAX_LIMIT) : 20;
    const offset = (page - 1) * limit;

    const whereConditions: Record<string, unknown>[] = [
      { [scopeVar]: { _eq: scopeValue } },
    ];

    const typeFilter = this.buildTypeFilter(filters.type, aiUserId);
    if (typeFilter) whereConditions.push(typeFilter);

    if (filters.team) {
      whereConditions.push({ created_by: { _eq: filters.team } });
    }

    const where = { _and: whereConditions };

    const document = `
      query ContactHistoryByScope(
        $where: crm_activities_bool_exp!
        $limit: Int!
        $offset: Int!
        $${scopeVar}: ${scopeGqlType}!
        $aiUserId: Int!
      ) {
        activities: crm_activities(
          where: $where
          order_by: { created_at: desc }
          limit: $limit
          offset: $offset
        ) {
          ${ACTIVITY_FIELDS}
        }
        total: crm_activities_aggregate(where: $where) {
          aggregate { count }
        }
        ${COUNTS_BLOCK(scopeVar)}
      }
    `;

    const data = await hasuraQuery<{
      activities: RawActivityRow[];
      total: { aggregate: { count: number } };
      call: { aggregate: { count: number } };
      sms: { aggregate: { count: number } };
      email: { aggregate: { count: number } };
      note: { aggregate: { count: number } };
      ai_call: { aggregate: { count: number } };
      ai_sms: { aggregate: { count: number } };
    }>(document, {
      where,
      limit,
      offset,
      [scopeVar]: scopeValue,
      aiUserId,
    });

    const activities = data.activities.map((row) =>
      this.mapActivityToDTO(row, aiUserId)
    );

    const counts = {
      call: data.call.aggregate.count,
      sms: data.sms.aggregate.count,
      email: data.email.aggregate.count,
      note: data.note.aggregate.count,
      ai_call: data.ai_call.aggregate.count,
      ai_sms: data.ai_sms.aggregate.count,
    };

    return {
      activities,
      counts: {
        all:
          counts.call +
          counts.sms +
          counts.email +
          counts.note +
          counts.ai_call +
          counts.ai_sms,
        ...counts,
      },
      pagination: {
        page,
        limit,
        total: data.total.aggregate.count,
      },
    };
  }

  // ─── Type filter (seller sms vs ai_sms distinction) ──────────────────────

  private static buildTypeFilter(
    type: string | undefined,
    aiUserId: number
  ): Record<string, unknown> | null {
    if (!type || type.toLowerCase() === "all") return null;

    switch (type.toLowerCase()) {
      case "call":
        return { activity_type_id: { _eq: ACTIVITY_TYPES.CALL } };
      case "sms":
        return {
          activity_type_id: { _eq: ACTIVITY_TYPES.SMS },
          created_by: { _neq: aiUserId },
        };
      case "email":
        return { activity_type_id: { _eq: ACTIVITY_TYPES.EMAIL } };
      case "note":
        return { activity_type_id: { _eq: ACTIVITY_TYPES.NOTE } };
      case "ai_call":
        return { activity_type_id: { _eq: ACTIVITY_TYPES.AI_CALL } };
      case "ai_sms":
        return {
          activity_type_id: { _eq: ACTIVITY_TYPES.SMS },
          created_by: { _eq: aiUserId },
        };
      default:
        return null;
    }
  }

  // ─── Mapper (ported 1:1 from Marketing_Sources_tracker) ──────────────────

  private static mapActivityToDTO(
    raw: RawActivityRow,
    aiUserId: number
  ): ContactHistoryActivityDTO {
    // `notes` may come as object or JSON string from the JSONB column
    let notes: Record<string, unknown> = {};
    if (raw.notes) {
      if (typeof raw.notes === "string") {
        try {
          notes = JSON.parse(raw.notes) as Record<string, unknown>;
        } catch {
          notes = {};
        }
      } else {
        notes = raw.notes;
      }
    }

    const isAI = raw.created_by === aiUserId;

    // Type label resolution
    let typeLabel = raw.crm_activity_type?.name || "Unknown";
    let type = typeLabel.toLowerCase();

    if (raw.activity_type_id === ACTIVITY_TYPES.AI_CALL) {
      typeLabel = "AI Call";
      type = "ai_call";
    } else if (raw.activity_type_id === ACTIVITY_TYPES.SMS && isAI) {
      typeLabel = "AI SMS";
      type = "ai_sms";
    }

    const direction = (notes.direction as string) || null;

    let content: string | null = null;
    let subject: string | null = null;
    let result: string | null = null;
    let duration: number | null = null;
    let recordingUrl: string | null = null;
    let thread: string[] | null = null;
    let tag: string | null = null;
    let status: string | null = null;

    switch (raw.activity_type_id) {
      case ACTIVITY_TYPES.CALL:
        content = (notes.content as string) || (notes.summary as string) || null;
        result = (notes.result as string) || (notes.outcome as string) || null;
        duration = (notes.duration as number) ?? null;
        recordingUrl = (notes.recording_url as string) || null;
        break;

      case ACTIVITY_TYPES.SMS:
        content = (notes.content as string) || null;
        result = (notes.status as string) || null;
        status = (notes.status as string) || null;
        break;

      case ACTIVITY_TYPES.EMAIL:
        content = (notes.content as string) || null;
        subject = (notes.subject as string) || null;
        result = (notes.status as string) || "Delivered";
        break;

      case ACTIVITY_TYPES.NOTE:
        content = (notes.content as string) || null;
        tag = (notes.tag as string) || null;
        thread = (notes.thread as string[]) || null;
        break;

      case ACTIVITY_TYPES.AI_CALL: {
        // AI Call stores content as a JSON string inside notes.content
        const contentStr = notes.content as string | undefined;
        if (contentStr) {
          try {
            const parsed = JSON.parse(contentStr);
            content = parsed.summary || parsed.transcript || null;
            result = parsed.outcome || parsed.status || null;
            duration = parsed.duration ?? null;
            recordingUrl = parsed.recording_url || null;
          } catch {
            content = contentStr;
          }
        }
        break;
      }
    }

    const user = raw.user;
    const userInitials =
      user?.initials ||
      (user
        ? `${user.first_name?.[0] || ""}${user.last_name?.[0] || ""}`.toUpperCase() ||
          null
        : null);

    return {
      id: String(raw.id),
      activity_type_id: raw.activity_type_id,
      type,
      type_label: typeLabel,
      is_ai: isAI || raw.activity_type_id === ACTIVITY_TYPES.AI_CALL,
      direction,
      created_at: raw.created_at,
      created_by: raw.created_by,
      seller_id: raw.seller_id,
      lead_id: raw.lead_id,
      property_id: raw.property_id,
      due_date: raw.due_date,
      zoho_id: raw.zoho_id,

      user_id: user?.id ?? null,
      user_name: user
        ? `${user.first_name || ""} ${user.last_name || ""}`.trim() || null
        : null,
      user_first_name: user?.first_name ?? null,
      user_last_name: user?.last_name ?? null,
      user_initials: userInitials,

      content,
      subject,
      result,
      duration,
      recording_url: recordingUrl,
      thread,
      tag,
      status,
      raw_notes: Object.keys(notes).length > 0 ? JSON.stringify(notes) : null,
    };
  }
}
