const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Webhook Verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];
  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Receive Messages
app.post("/webhook", async (req, res) => {
  res.sendStatus(200);
  const body = req.body;
  if (body.object !== "page") return;

  for (const entry of body.entry) {
    for (const event of entry.messaging) {
      if (!event.message || !event.message.text) continue;
      const senderId = event.sender.id;
      const userMsg = event.message.text;

      try {
        // Call Gemini API directly
        const geminiRes = await axios.post(
          https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${GEMINI_API_KEY},
          {
            contents: [{ parts: [{ text: userMsg }] }]
          }
        );

        const reply = geminiRes.data.candidates[0].content.parts[0].text;

        // Send to Messenger
        await axios.post(
          "https://graph.facebook.com/v19.0/me/messages",
          { recipient: { id: senderId }, message: { text: reply } },
          { params: { access_token: PAGE_ACCESS_TOKEN } }
        );
      } catch (err) {
        console.error("Error:", err.response?.data || err.message);
      }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
