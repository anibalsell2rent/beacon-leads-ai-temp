import { gql } from 'apollo-server-express';
import { teamPerformanceTypeDefs } from '../graphql/types/teamPerformance.types';
import { leaderboardTypeDefs } from '../graphql/types/leaderboard.types';
import { conversionTrendsTypeDefs } from '../graphql/types/conversionTrends.types';
import { pipelineTypeDefs } from '../graphql/types/pipeline.types';
import { individualDashboardTypeDefs } from '../graphql/types/individualDashboard.types';
import { genericMutationTypeDefs } from '../graphql/types/genericMutation.types';
import { leadDetailsTypeDefs } from '../graphql/types/leadDetails.types';
import { propertyDetailsTypeDefs } from '../graphql/types/propertyDetails.types';
import { pipelineProgressTypeDefs } from '../graphql/types/pipelineProgress.types';
import { teamDirectoryTypeDefs } from '../graphql/types/teamDirectory.types';
import { transactionTypeDefs } from '../graphql/types/transaction.types';
import { engagementTypeDefs } from '../graphql/types/engagement.types';
import { analyticsTypeDefs } from '../graphql/types/analytics.types';
import { dealsTypeDefs } from '../graphql/types/deals.types';
import { transactionCoordinatorTypeDefs } from '../graphql/types/transactionCoordinator.types';
import { contactHistoryTypeDefs } from '../graphql/types/contactHistory.types';
import { performanceGoalsTypeDefs } from '../graphql/types/performanceGoals.types';
import { leadManagementTypeDefs } from '../graphql/types/leadManagement.types';
import { eodReportTypeDefs } from '../graphql/types/eodReport.types';

const rootTypeDefs = gql`
type Query {
  _empty: String
}

type Mutation {
  _empty: String
}
`;

export default [
  rootTypeDefs,
  teamPerformanceTypeDefs,
  leaderboardTypeDefs,
  conversionTrendsTypeDefs,
  pipelineTypeDefs,
  individualDashboardTypeDefs,
  genericMutationTypeDefs,
  leadDetailsTypeDefs,
  propertyDetailsTypeDefs,
  pipelineProgressTypeDefs,
  teamDirectoryTypeDefs,
  transactionTypeDefs,
  engagementTypeDefs,
  analyticsTypeDefs,
  dealsTypeDefs,
  transactionCoordinatorTypeDefs,
  contactHistoryTypeDefs,
  performanceGoalsTypeDefs,
  leadManagementTypeDefs,
  eodReportTypeDefs
];
