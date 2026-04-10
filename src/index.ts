import "dotenv/config";
import express from "express";
import cors from "cors";
import { graphQlConfig } from "./graphql/graphql.config";
import { synchronizeDatabase } from "./config/database.config";
import { AlertService } from "./services/alert.service";
import dialpadWebhookRoutes from "./routes/dialpadSmsWebhook.routes";
import dialpadCallWebhookRoutes from "./routes/dialpadCallWebhook.routes";

//new test.

async function startServer() {
	const app = express();
	app.use(
		cors({
			origin: "*",
			methods: ["GET", "POST"],
			allowedHeaders: ["Content-Type", "Authorization"],
			credentials: true,
		})
	);

	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));
	app.use("/webhooks", dialpadWebhookRoutes);
	app.use("/webhooks", dialpadCallWebhookRoutes);

	//Database synchronizing
	try {
		await synchronizeDatabase();
	} catch (error) {
		console.error("❌ Error connecting to the database:", error);
	}

	//GraphQL Configuration
	try {
		await graphQlConfig(app);
	} catch (error) {
		console.error("❌ Error applying middleware:", error);
	}

	const PORT = process.env.PORT || 8080;

	app.listen(PORT, () => {
		const url = `http://localhost:${PORT}`;
		console.log(`Server running at: ${url}`);
		console.log(`GraphQL endpoint: ${url}/api/lead-ai`);
	});

}

process.on("unhandledRejection", async (reason, promise) => {
	console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
	await AlertService.sendCrashAlertEmail(`Unhandled Rejection: ${reason instanceof Error ? reason.stack : reason}`);
});

process.on("uncaughtException", async (error) => {
	console.error("❌ Uncaught Exception:", error);
	await AlertService.sendCrashAlertEmail(`Uncaught Exception: ${error.stack}`);
	// It's important to gracefully shutdown or heavily consider process.exit(1) here for persistent services.
	process.exit(1);
});

startServer().catch(async (error) => {
	console.error("❌ Error starting server:", error);
	await AlertService.sendCrashAlertEmail(`Failed to Start Server: ${error.stack}`);
	process.exit(1);
});

export default startServer;