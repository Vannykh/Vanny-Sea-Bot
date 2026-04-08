const express = require("express");
const axios = require("axios");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `អ្នកជា Bot ជំនួយការស្មាតនៅលើ Facebook។
ឆ្លើយតបជាភាសាខ្មែរ និងភាសាអង់គ្លេស។
ប្រើ emoji ដែលសមរម្យ។`;

const conversations = {};

// Webhook Verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified!");
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

      // Save history
      if (!conversations[senderId]) conversations[senderId] = [];
      conversations[senderId].push({ role: "user", parts: [{ text: userMsg }] });

      try {
        const model = genAI.getGenerativeModel({
          model: "gemini-1.5-flash",
          systemInstruction: SYSTEM_PROMPT,
        });

        const chat = model.startChat({ history: conversations[senderId].slice(-10) });
        const result = await chat.sendMessage(userMsg);
        const reply = result.response.text();

        conversations[senderId].push({ role: "model", parts: [{ text: reply }] });

        await axios.post(
          "https://graph.facebook.com/v19.0/me/messages",
          { recipient: { id: senderId }, message: { text: reply } },
          { params: { access_token: PAGE_ACCESS_TOKEN } }
        );
      } catch (err) {
        console.error("Error:", err.message);
      }
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));
