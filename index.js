const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("REAL TIME BOT ACTIVE");

/* ================= GET REAL MATCHES TODAY ================= */
async function getMatches() {
    try {
        const today = new Date().toISOString().split("T")[0];

        const res = await axios.get(
            `https://api.football-data.org/v4/matches?dateFrom=${today}&dateTo=${today}`,
            {
                headers: {
                    "X-Auth-Token": process.env.FOOTBALL_API_KEY
                },
                timeout: 10000
            }
        );

        // ambil max 10 match real hari ini
        return (res.data.matches || []).slice(0, 10);

    } catch (err) {
        console.log("API ERROR:", err.message);
        return [];
    }
}

/* ================= MARKET GENERATOR ================= */
function buildMarket(match) {

    const home = match.homeTeam?.name || "Home";
    const away = match.awayTeam?.name || "Away";

    // probabilitas AI (simulasi market)
    const homeWin = Math.floor(Math.random() * 40 + 40);
    const draw = Math.floor(Math.random() * 20);
    const awayWin = 100 - homeWin - draw;

    const btts = Math.random() > 0.5 ? "YES" : "NO";
    const over25 = Math.random() > 0.5 ? "OVER 2.5" : "UNDER 2.5";

    const score = `${Math.floor(Math.random() * 3)}-${Math.floor(Math.random() * 2)}`;
    const corners = Math.floor(Math.random() * 6 + 8);

    return `⚽ ${home} vs ${away}

📊 1X2:
Home ${homeWin}% | Draw ${draw}% | Away ${awayWin}%

🎯 BTTS: ${btts}
📈 Goals: ${over25}
⚽ Score: ${score}
🚩 Corners: ${corners}+`;
}

/* ================= GENERATE ================= */
async function generate() {

    const matches = await getMatches();

    if (!matches.length) {
        return ["❌ Tidak ada match hari ini (API limit / belum update)"];
    }

    return matches.map(buildMarket);
}

/* ================= BOT ================= */
bot.onText(/\/start/, (msg) => {
    bot.sendMessage(msg.chat.id,
`⚽ REAL TIME FOOTBALL BOT

Data live 1–10 match per hari`);
});

bot.onText(/\/prediksi/, async (msg) => {

    const data = await generate();

    bot.sendMessage(
        msg.chat.id,
        "📊 LIVE MATCH TODAY (REAL TIME)\n\n" +
        data.join("\n\n")
    );
});
