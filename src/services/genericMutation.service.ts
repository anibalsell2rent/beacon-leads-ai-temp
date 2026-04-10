import * as Models from '../models';

export const upsertCrmRecord = async (tableName: string, payload: any) => {
    try {
        // 1. Validate Table Existence
        const TargetModel = (Models as any)[tableName];
        if (!TargetModel) {
            throw new Error(`Model '${tableName}' does not exist in the database schemas.`);
        }

        // 2. Determine Action (Create vs Update) based on presence of ID
        let record;
        const identifier = payload.id; // Models usually use 'id'

        if (identifier) {
            // 2a. Update Flow
            record = await TargetModel.findByPk(identifier);
            if (!record) {
                throw new Error(`Record with ID '${identifier}' not found in table '${tableName}'.`);
            }

            // Update record with fields from payload
            for (const key of Object.keys(payload)) {
                if (key !== 'id' && record.dataValues.hasOwnProperty(key)) {
                    record[key] = payload[key];
                }
            }
            await record.save();

            return {
                success: true,
                message: `Record ${identifier} updated successfully in ${tableName}`,
                record: record.dataValues
            };

        } else {
            // 2b. Create Flow
            record = await TargetModel.create(payload);

            return {
                success: true,
                message: `New record created successfully in ${tableName}`,
                record: record.dataValues
            };
        }
    } catch (error: any) {
        throw new Error(`Failed to upsert record in ${tableName}: ${error.message}`);
    }
};
