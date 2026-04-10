import { Sequelize } from "sequelize";
import * as dotenv from "dotenv";

dotenv.config();

export const sequelize = new Sequelize({
	database: process.env.PGDATABASE,
	username: process.env.PGUSER,
	password: process.env.PGPASSWORD,
	host: process.env.PGHOST,
	port: Number.parseInt(process.env.PGPORT || "5432"),
	dialect: "postgres",
	logging: false,
	ssl: true,
	dialectOptions: {
		ssl: {
			rejectUnauthorized: false,
		},
	},
});

export const synchronizeDatabase = async () => {
	try {
		await sequelize.authenticate();
		console.log(`Database connection to ${process.env.PGDATABASE} established correctly`);

		await sequelize.sync({ force: false });
		console.log(`Database models synchronized successfully`);
	} catch (error) {
		console.error("Error connecting to the database:", error);
	}
};
