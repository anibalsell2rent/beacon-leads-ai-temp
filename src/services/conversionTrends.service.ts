import { Op } from "sequelize";
import { subMonths, startOfMonth, format } from "date-fns";
import { CrmLeads, CrmDeals } from "../models/index";
import { Property } from "../models/property.model";

interface MonthlyData {
    month: string;
    conversions: number;
    hitGoal: boolean;
}

interface SourceData {
    source: string;
    count: number;
    percentage: number;
}

export class ConversionTrendsService {
    static async getConversionDashboard() {
        const today = new Date();
        const twelveMonthsAgo = startOfMonth(subMonths(today, 12));

        // 1. Fetch ALL potential conversions from 3 sources
        const [convertedLeads, deals, dealProperties] = await Promise.all([
            // Source A: Leads marked as "Converted"
            CrmLeads.findAll({
                where: {
                    result: "Converted",
                    date_created: { [Op.gte]: twelveMonthsAgo }
                },
                attributes: ["property_id", "date_created", "marketing_source"],
                raw: true,
            }),
            // Source B: Any record in the Deals table (a deal is a conversion)
            CrmDeals.findAll({
                where: {
                    created_at: { [Op.gte]: twelveMonthsAgo }
                },
                attributes: ["property_id", "created_at"],
                raw: true,
            }),
            // Source C: Any property with a deal number (indicating success)
            Property.findAll({
                where: {
                    deal_number: { [Op.ne]: null },
                    created_at: { [Op.gte]: twelveMonthsAgo }
                },
                attributes: ["id", "created_at", "campaign_source", "deal_number"],
                raw: true,
            })
        ]);

        // 2. Unify and deduplicate using property_id
        const conversionsMap = new Map<string, { date: Date, source?: string }>();

        // Process Leads first
        convertedLeads.forEach(l => {
            if (l.property_id) {
                conversionsMap.set(l.property_id, { 
                    date: new Date(l.date_created), 
                    source: l.marketing_source 
                });
            }
        });

        // Process Properties (higher priority for physical deal creation date and campaign_source)
        dealProperties.forEach(p => {
            const existing = conversionsMap.get(p.id);
            conversionsMap.set(p.id, {
                date: new Date(p.created_at),
                source: p.campaign_source || existing?.source || "Unknown"
            });
        });

        // Process Deals (highest priority for date)
        deals.forEach(d => {
            if (d.property_id) {
                const existing = conversionsMap.get(d.property_id);
                conversionsMap.set(d.property_id, {
                    date: new Date(d.created_at),
                    source: existing?.source || "Unknown"
                });
            }
        });

        // 3. For any conversion still missing a source, try a broad lead lookup
        const missingSourcePropertyIds = Array.from(conversionsMap.entries())
            .filter(([_, data]) => !data.source || data.source === "Unknown")
            .map(([id, _]) => id);

        if (missingSourcePropertyIds.length > 0) {
            const relatedLeads = await CrmLeads.findAll({
                where: { property_id: { [Op.in]: missingSourcePropertyIds } },
                attributes: ["property_id", "marketing_source"],
                raw: true
            });
            relatedLeads.forEach(rl => {
                if (rl.property_id && rl.marketing_source) {
                    const conv = conversionsMap.get(rl.property_id);
                    if (conv && (!conv.source || conv.source === "Unknown")) {
                        conv.source = rl.marketing_source;
                    }
                }
            });
        }

        const allConversions = Array.from(conversionsMap.values());
        const totalConversions = allConversions.length;

        // 2. Calculate the dynamic goal (Monthly Average of TTM)
        const dynamicGoal = totalConversions > 0 ? parseFloat((totalConversions / 12).toFixed(1)) : 0;

        // 3. Process the "Conversion Trend" (Monthly grouped data)
        // Initialize exactly 12 buckets starting from 12 months ago to the current month
        const groupedTrends: Record<string, number> = {};
        for (let i = 12; i >= 0; i--) {
            const monthKey = format(subMonths(today, i), "MMM yyyy"); // e.g. "Aug 2025"
            groupedTrends[monthKey] = 0;
        }

        // Process "Lead Sources" (Donut Chart)
        const groupedSources: Record<string, number> = {};

        // Grouping iteration
        allConversions.forEach((conv) => {
            // Bucketing for Trends
            if (conv.date) {
                const monthKey = format(conv.date, "MMM yyyy");
                if (groupedTrends[monthKey] !== undefined) {
                    groupedTrends[monthKey]++;
                }
            }

            // Bucketing for Sources
            const source = conv.source || "Unknown";
            groupedSources[source] = (groupedSources[source] || 0) + 1;
        });

        // Formatting Trends Output
        const trends: MonthlyData[] = Object.entries(groupedTrends).map(
            ([month, count]) => ({
                month: month.split(" ")[0], // Return just 'Aug' to match UI
                conversions: count,
                hitGoal: count >= dynamicGoal,
            })
        );

        // Formatting Sources Output
        const sources: SourceData[] = Object.entries(groupedSources)
            .map(([source, count]) => {
                const percentage = totalConversions > 0 ? (count / totalConversions) * 100 : 0;
                return {
                    source,
                    count,
                    percentage: parseFloat(percentage.toFixed(1)), // Return 1 decimal e.g. 59.5
                };
            })
            .sort((a, b) => b.count - a.count); // Sort highest quantity first for the bar chart visuals

        return {
            dynamicGoal,
            trends, // Array of { month: 'Aug', conversions: 35, hitGoal: true }
            sources // Array of { source: 'Organic', count: 26, percentage: 59.0 }
        };
    }
}
