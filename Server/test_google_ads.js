require('dotenv').config();
const { GoogleAdsApi } = require('google-ads-api');

const testApi = async () => {
    try {
        const client = new GoogleAdsApi({
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            developer_token: process.env.GOOGLE_DEVELOPER_TOKEN,
        });

        const customer = client.Customer({
            customer_id: process.env.GOOGLE_CUSTOMER_ID,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
        });

        console.log("Testing GAQL Query for LAST_30_DAYS...");
        const query = `
            SELECT 
                segments.date,
                metrics.cost_micros, 
                metrics.impressions, 
                metrics.clicks, 
                metrics.conversions 
            FROM customer 
            WHERE segments.date DURING LAST_30_DAYS
        `; 
        
        const response = await customer.query(query);
        console.log("LAST_30_DAYS Rows:", response.length);
        
        let totalSpend = 0;
        let totalImp = 0;
        response.forEach(row => {
            totalSpend += parseInt(row.metrics.cost_micros) || 0;
            totalImp += parseInt(row.metrics.impressions) || 0;
        });
        
        console.log("Total Spend Micros (Last 30 Days):", totalSpend);
        console.log("Total Impressions (Last 30 Days):", totalImp);
    } catch (e) {
        console.error("Error connecting to Google Ads API:", e);
    }
};

testApi();
