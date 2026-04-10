import { ApolloServer } from "apollo-server-express";
import typeDefs from "../schema/typeDefs.schema";
import resolvers from "../schema/resolvers.schema";
import { Request, Response } from "express";

export const graphQlConfig = async (app: any) => {
	const server = new ApolloServer({
		typeDefs,
		resolvers,
		context: ({ req, res }: { req: Request, res: Response }) => ({
			req,
			res,
		}),
	});

	await server.start();

	try {
		server.applyMiddleware({
			app: app as any,
			path: "/api/lead-ai",
		});
	} catch (error) {
		console.error("Error applying middleware:", error);
	}
};