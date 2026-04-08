import express from "express";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

const products = JSON.parse(fs.readFileSync("./products.json"));
const vannyPrompt = fs.readFileSync("./prompt.txt", "utf-8");

function calculateTotal(productName, quantity, location) {
  let product = products[productName];
  if (!product) return null;
  let price = product.price_per_kg * quantity;
  let box_fee = 0;
  let delivery_fee = 0;

  if (productName === "ខ្យងត្រដិត") {
    if (quantity === 2) {
      box_fee = product.box_fee["2kg"];
      delivery_fee = product.delivery_fee["2kg"][location];
    } else if (quantity >= 3 && quantity <= 4) {
      box_fee = product.box_fee["3-4kg"];
      delivery_fee = product.delivery_fee["3-4kg"][location];
    }
  } else {
    box_fee = product.box_fee || 0;
    delivery_fee = product.delivery_fee[location] || 0;
  }

  const total = price + box_fee + delivery_fee;
  return { price, box_fee, delivery_fee, total };
}

app.post("/webhook", async (req, res) => {
  try {
    const userMessage = req.body.message;

    const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: vannyPrompt },
          { role: "user", content: userMessage }
        ]
      })
    });

    const data = await aiResponse.json();
    let reply = data.choices[0].message.content;

    try {
      const order = JSON.parse(userMessage);
      if(order.product && order.quantity && order.location){
        const calc = calculateTotal(order.product, order.quantity, order.location);
        if(calc){
          reply = `📦 ផលិតផល: ${order.product}\n📏 ចំនួន: ${order.quantity} គីឡូ\n💰 តម្លៃផលិតផល: ${calc.price}៛\n📦 ថ្លៃកេះ: ${calc.box_fee}៛\n🚚 សេវាផ្ញើ: ${calc.delivery_fee}៛\n💵 សរុប: ${calc.total}៛\n\n🙏 សូមផ្ដល់លេខទូរស័ព្ទ និងទីតាំងដឹកជញ្ជូន! 🐚🐌`;
        }
      }
    } catch(e){}

    res.json({ reply });
  } catch(err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(3000, () => console.log("Vanny Bot server running on port 3000"));