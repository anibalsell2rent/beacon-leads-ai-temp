import { teamPerformanceResolvers } from '../graphql/resolvers/teamPerformance.resolvers';
import { leaderboardResolvers } from '../graphql/resolvers/leaderboard.resolvers';
import { conversionTrendsResolvers } from '../graphql/resolvers/conversionTrends.resolvers';
import { pipelineResolvers } from '../graphql/resolvers/pipeline.resolvers';
import { individualDashboardResolvers } from '../graphql/resolvers/individualDashboard.resolvers';
import { genericMutationResolvers } from '../graphql/resolvers/genericMutation.resolvers';
import { leadDetailsResolvers } from '../graphql/resolvers/leadDetails.resolvers';
import { propertyDetailsResolvers } from '../graphql/resolvers/propertyDetails.resolvers';
import { pipelineProgressResolvers } from '../graphql/resolvers/pipelineProgress.resolvers';
import { teamDirectoryResolvers } from '../graphql/resolvers/teamDirectory.resolvers';
import { transactionResolvers } from '../graphql/resolvers/transaction.resolvers';
import { engagementResolvers } from '../graphql/resolvers/engagement.resolvers';
import { analyticsResolvers } from '../graphql/resolvers/analytics.resolvers';
import { dealsResolvers } from '../graphql/resolvers/deals.resolvers';
import { transactionCoordinatorResolvers } from '../graphql/resolvers/transactionCoordinator.resolvers';
import { contactHistoryResolvers } from '../graphql/resolvers/contactHistory.resolvers';
import { performanceGoalsResolvers } from '../graphql/resolvers/performanceGoals.resolvers';
import { leadManagementResolvers } from '../graphql/resolvers/leadManagement.resolvers';
import { eodReportResolvers } from '../graphql/resolvers/eodReport.resolvers';

export default {
    Query: {
        _empty: () => "empty",
        ...teamPerformanceResolvers.Query,
        ...leaderboardResolvers.Query,
        ...conversionTrendsResolvers.Query,
        ...pipelineResolvers.Query,
        ...individualDashboardResolvers.Query,
        ...leadDetailsResolvers.Query,
        ...propertyDetailsResolvers.Query,
        ...pipelineProgressResolvers.Query,
        ...teamDirectoryResolvers.Query,
        ...transactionResolvers.Query,
        ...engagementResolvers.Query,
        ...analyticsResolvers.Query,
        ...dealsResolvers.Query,
        ...transactionCoordinatorResolvers.Query,
        ...contactHistoryResolvers.Query,
        ...performanceGoalsResolvers.Query,
        ...leadManagementResolvers.Query,
    },
    Mutation: {
        _empty: () => "empty",
        ...genericMutationResolvers.Mutation,
        ...leadManagementResolvers.Mutation,
        ...eodReportResolvers.Mutation,
    },
};
