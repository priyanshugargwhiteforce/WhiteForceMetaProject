const axios = require('axios');

// Using Groq Model as requested
const MODEL_ID = "llama-3.3-70b-versatile";

exports.analyzeAd = async (req, res) => {
    try {
        const { prompt } = req.body;
        const GROQ_API_KEY = process.env.GROQ_API_KEY;

        if (!GROQ_API_KEY) {
            return res.status(400).json({
                success: false,
                message: "Groq API Key is missing in server configuration."
            });
        }

        // Groq API endpoint (OpenAI compatible)
        const fullUrl = "https://api.groq.com/openai/v1/chat/completions";
        
        console.log(`[AI] Calling Groq with model: ${MODEL_ID}`);

        const response = await axios.post(fullUrl, {
            model: MODEL_ID,
            messages: [
                {
                    role: "system",
                    content: "You are an expert Meta Ads Strategist. Analyze ad data and provide a strategic report in JSON format."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.1,
            response_format: { type: "json_object" }
        }, {
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            timeout: 30000 // 30 seconds timeout
        });

        const result = response.data;
        
        // Extract content from Chat Completion format
        const content = result.choices?.[0]?.message?.content;

        if (!content) {
            throw new Error("Invalid response format from Groq API.");
        }

        return res.json({
            success: true,
            data: content
        });

    } catch (error) {
        console.error("Groq AI Analysis Error:", error.message);
        
        let errorMessage = "Internal server error during AI analysis.";
        let statusCode = 500;

        if (error.response) {
            statusCode = error.response.status;
            errorMessage = error.response.data?.error?.message || JSON.stringify(error.response.data);
            console.error("Groq API Response Error:", error.response.data);
        } else if (error.request) {
            errorMessage = "No response received from Groq API.";
        }

        return res.status(statusCode).json({
            success: false,
            message: errorMessage
        });
    }
};
