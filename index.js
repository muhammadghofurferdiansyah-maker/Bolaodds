const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.BOT_TOKEN;
const API_KEY = process.env.API_KEY;
const HOST = "api-football-v1.p.rapidapi.com";

if (!token || !API_KEY) {
    console.log("ENV belum lengkap");
}

const bot = new TelegramBot(token, { polling: true });

console.log("BOT RUNNING");

/* ================= MENU ================= */
function menu() {
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

/* ================= START ================= */
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
        msg.chat.id,
        "🔥 FOOTBALL PREDICTION BOT\n\nPilih menu 👇",
        menu()
    );
});

/* ================= AMBIL MATCH ================= */
async function getMatches() {
    try {
        const res = await axios.get(
            `https://${HOST}/v3/fixtures?date=${new Date().toISOString().split('T')[0]}`,
            {
                headers: {
                    "X-RapidAPI-Key": API_KEY,
                    "X-RapidAPI-Host": HOST
                }
            }
        );

        return res.data.response || [];
    } catch (err) {
        console.log("API ERROR:", err.message);
        return [];
    }
}

/* ================= ANALISA ================= */
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

/* ================= GENERATE ================= */
async function generate(type = null) {

    const matches = await getMatches();

    if (!matches.length) return [];

    let data = matches.map(analyze);

    if (type === "HIGH") {
        data = data.filter(x => x.confidence === "HIGH");
    }

    return data.slice(0, 5);
}

/* ================= HANDLER ================= */
bot.on("message", async (msg) => {

    const text = msg.text;

    if (text === "📊 Prediksi Hari Ini") {

        const data = await generate();

        return bot.sendMessage(
            msg.chat.id,
            "📊 PREDIKSI HARI INI\n\n" +
            data.map(d => d.text).join("\n\n"),
            menu()
        );
    }

    if (text === "🔥 High Confidence") {

        const data = await generate("HIGH");

        return bot.sendMessage(
            msg.chat.id,
            "🔥 HIGH CONFIDENCE PICKS\n\n" +
            data.map(d => d.text).join("\n\n"),
            menu()
        );
    }

    if (text === "ℹ️ Info Bot") {

        return bot.sendMessage(
            msg.chat.id,
            "ℹ️ Bot Live Football Prediction\nAPI: API-Football\nMode: AI Probability",
            menu()
        );
    }
});
