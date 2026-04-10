import axios from 'axios'
const zohoToken = async () => {
  const request = await axios.get("https://zohotoken-663034886613.us-central1.run.app/api/zoho/token");
  const token = (request.data as { token?: string }).token;
  return {
    data: token,
  };
};

export const zohoSearchRecordByID = async (
  moduleName: string,
  recordId: string,
  fieldsToReturn?: string[],
  relatedModule?: string
): Promise<Record<string, any> | null> => {
  try {
    if (!moduleName || !recordId) throw new Error('moduleName and recordId are required');

    const token = await zohoToken();
    if (!token.data) throw new Error('Token not found');

    const access_token = token.data;

    const url = relatedModule
      ? `https://www.zohoapis.com/crm/v2/${moduleName}/${recordId}/${relatedModule}`
      : `https://www.zohoapis.com/crm/v2/${moduleName}/${recordId}`;

    const options = {
      method: "GET" as const,
      url,
      headers: {
        Authorization: `Zoho-oauthtoken ${access_token}`,
      },
    };

    const response = await axios.request<{ data: any[] }>(options);

    if (!response.data || !Array.isArray(response.data.data) || response.data.data.length === 0) return null;
    const record = response.data.data[0];

    if (!fieldsToReturn || fieldsToReturn.length === 0) return record;
    const fields = fieldsToReturn.reduce<Record<string, any>>((acc, curr) => {
      acc[curr] = record[curr];
      return acc;
    }, {});
    return fields;

  } catch (error) {
    console.error(error);
    return null;
  }
};

export const getPropertyInfo = async (propertyId: string, zohoLeadFields: any[], zohoDealFields: any[]) => {
  let zohoInfo = await zohoSearchRecordByID("Products", propertyId, [...zohoLeadFields], "Lead");
  if (!zohoInfo) {
    zohoInfo = await zohoSearchRecordByID("Products", propertyId, [...zohoDealFields], "Deal");
  }
  return zohoInfo
}