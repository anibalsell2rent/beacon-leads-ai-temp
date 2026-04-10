import { IndividualDashboardService } from "../../services/individualDashboard.service";

export const individualDashboardResolvers = {
    Query: {
        getIndividualDashboard: (_: any, { employeeId }: { employeeId: string }) => {
            return IndividualDashboardService.getIndividualDashboard(employeeId);
        },
    },
};
