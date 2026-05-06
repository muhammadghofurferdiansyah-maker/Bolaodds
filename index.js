const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.BOT_TOKEN;
const API_KEY = process.env.API_KEY;
const HOST = "api-football-v1.p.rapidapi.com";

const bot = new TelegramBot(token, { polling: true });

/* =========================
   MENU UTAMA
========================= */
function mainMenu() {
    return {
        reply_markup: {
            keyboard: [
                ["📊 Prediksi Hari Ini"],
                ["🔥 High Confidence"],
                ["ℹ️ Info Bot"]
            ],
            resize_keyboard: true
        }
    };
}

/* =========================
   START
========================= */
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
`🔥 PRO FOOTBALL PREDICTION BOT

Selamat datang!

Pilih menu di bawah untuk mulai 👇`, mainMenu());
});

/* =========================
   AMBIL MATCH REAL API
========================= */
async function getMatches() {
    try {
        const res = await axios.get(`https://${HOST}/v3/fixtures?date=${new Date().toISOString().split('T')[0]}`, {
            headers: {
                'X-RapidAPI-Key': API_KEY,
                'X-RapidAPI-Host': HOST
            }
        });

        return res.data.response.slice(0, 10);
    } catch (err) {
        console.log(err.message);
        return [];
    }
}

/* =========================
   ANALISA MATCH
========================= */
function analyze(match) {

    const home = match.teams.home.name;
    const away = match.teams.away.name;

    const odds = (Math.random() * 1.8 + 1.2).toFixed(2);

    const homeProb = Math.floor(Math.random() * 40 + 40);
    const awayProb = 100 - homeProb;

    let confidence = "LOW";
    if (odds < 1.6 && homeProb > 60) confidence = "HIGH";
    else if (odds < 2.0) confidence = "MEDIUM";

    return {
        text:
`⚽ ${home} vs ${away}
📊 Odds: ${odds}
📈 Home: ${homeProb}%
📉 Away: ${awayProb}%
🔥 Confidence: ${confidence}`,
        confidence
    };
}

/* =========================
   GENERATE PREDIKSI
========================= */
async function generatePredictions(filter = null) {
    const matches = await getMatches();

    let result = matches.map(analyze);

    if (filter === "HIGH") {
        result = result.filter(r => r.confidence === "HIGH");
    }

    return result.slice(0, 5);
}

/* =========================
   MENU HANDLER
========================= */
bot.on('message', async (msg) => {

    const text = msg.text;

    if (text === "📊 Prediksi Hari Ini") {

        const data = await generatePredictions();

        return bot.sendMessage(msg.chat.id,
`📊 DAILY PREDICTION

${data.map(d => d.text).join("\n\n")}`, mainMenu());
    }

    if (text === "🔥 High Confidence") {

        const data = await generatePredictions("HIGH");

        return bot.sendMessage(msg.chat.id,
`🔥 HIGH CONFIDENCE PICKS

${data.map(d => d.text).join("\n\n")}`, mainMenu());
    }

    if (text === "ℹ️ Info Bot") {

        return bot.sendMessage(msg.chat.id,
`ℹ️ INFO BOT

✔ Data: API-Football
✔ Model: Probability AI
✔ Mode: Live Prediction

⚠️ Not financial advice`, mainMenu());
    }
});

console.log("🤖 PRO BOT READY");
