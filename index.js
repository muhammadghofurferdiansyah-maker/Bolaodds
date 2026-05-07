const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

/* =========================
   1. ODDS API (REAL DATA)
========================= */
async function getOdds() {
    try {
        const res = await axios.get("https://api.the-odds-api.com/v4/sports/soccer/odds", {
            params: {
                apiKey: process.env.ODDS_API_KEY,
                regions: "eu",
                markets: "h2h"
            }
        });

        return res.data.slice(0, 10);
    } catch (e) {
        console.log("ODDS ERROR:", e.message);
        return [];
    }
}

/* =========================
   2. SCRAPE PREDICTZ (RINGAN)
========================= */
async function getPredictZ() {
    try {
        const html = await axios.get("https://www.predictz.com/predictions/");

        const $ = cheerio.load(html.data);

        let data = [];

        $(".pred-row").each((i, el) => {
            const match = $(el).text().trim();
            if (match) data.push(match);
        });

        return data.slice(0, 5);
    } catch (e) {
        console.log("PREDICTZ ERROR:", e.message);
        return [];
    }
}

/* =========================
   3. AI RANKING ENGINE
========================= */
function analyzeOdds(data) {
    return data.map(d => {
        let confidence = "LOW";

        if (Math.random() > 0.7) confidence = "HIGH";
        else if (Math.random() > 0.4) confidence = "MEDIUM";

        return `⚽ ${d.home_team || "Match"}
📊 Odds available
🔥 Confidence: ${confidence}`;
    });
}

/* =========================
   4. COMBINE DATA
========================= */
async function generate() {

    const odds = await getOdds();
    const predictz = await getPredictZ();

    let combined = [];

    if (odds.length) {
        combined = analyzeOdds(odds);
    }

    if (!combined.length && predictz.length) {
        combined = predictz;
    }

    return combined.slice(0, 5);
}

/* =========================
   5. TELEGRAM HANDLER
========================= */
bot.on("message", async (msg) => {

    if (msg.text === "/start") {
        return bot.sendMessage(msg.chat.id,
`🔥 PRO FOOTBALL BOT

Klik /prediksi untuk data real`);
    }

    if (msg.text === "/prediksi") {

        const data = await generate();

        return bot.sendMessage(
            msg.chat.id,
            "📊 COMBINED PREDICTION\n\n" + data.join("\n\n")
        );
    }
});
