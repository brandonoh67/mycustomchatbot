const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "/")));

// Secure proxy endpoint that keeps the OpenAI API key server-side
app.post("/api/chat", async (req, res) => {
  try {
    const { messages, model, temperature } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model || "gpt-4o-mini",
        messages,
        temperature: temperature ?? 0.2
      })
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "OpenAI request failed" });
    }

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (error) {
    console.error("Backend Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cornerstone Chatbot running on port ${PORT}`));