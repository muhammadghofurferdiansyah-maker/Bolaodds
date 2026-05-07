const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

const bot = new TelegramBot(process.env.BOT_TOKEN, {
    polling: true
});

console.log("BOLAODDS BOT ACTIVE");

/* ================= MENU ================= */

function menu() {
    return {
        reply_markup: {
            keyboard: [
                ["📊 Match Hari Ini"],
                ["📅 Match 1 Minggu Kedepan"],
                ["ℹ️ Info Bot"]
            ],
            resize_keyboard: true
        }
    };
}

/* ================= GET MATCH ================= */

async function getMatches(days = 0) {

    try {

        const today = new Date();

        const from = today.toISOString().split("T")[0];

        const future = new Date();
        future.setDate(today.getDate() + days);

        const to = future.toISOString().split("T")[0];

        const res = await axios.get(
            `https://api.football-data.org/v4/matches?dateFrom=${from}&dateTo=${to}`,
            {
                headers: {
                    "X-Auth-Token": process.env.FOOTBALL_API_KEY
                },
                timeout: 10000
            }
        );

        return (res.data.matches || []).slice(0, 10);

    } catch (err) {

        console.log("API ERROR:", err.message);

        return [];
    }
}

/* ================= MARKET DATA ================= */

function market(match) {

    const home = match.homeTeam?.name || "Home";
    const away = match.awayTeam?.name || "Away";

    // simulasi market
    const homeWin = Math.floor(Math.random() * 40 + 40);
    const draw = Math.floor(Math.random() * 20);
    const awayWin = 100 - homeWin - draw;

    const btts = Math.random() > 0.5 ? "YES" : "NO";

    const ou =
        Math.random() > 0.5
            ? "OVER 2.5"
            : "UNDER 2.5";

    const score =
        `${Math.floor(Math.random()*3)}-${Math.floor(Math.random()*2)}`;

    const corner =
        `${Math.floor(Math.random()*5 + 8)}+`;

    return `⚽ ${home} vs ${away}

📅 ${match.utcDate}

📊 1X2
🏠 Home: ${homeWin}%
🤝 Draw: ${draw}%
🛫 Away: ${awayWin}%

🎯 BTTS: ${btts}
📈 Goals: ${ou}
⚽ Score: ${score}
🚩 Corner: ${corner}`;
}

/* ================= GENERATE ================= */

async function generate(days = 0) {

    const matches = await getMatches(days);

    if (!matches.length) {
        return ["❌ Tidak ada data pertandingan"];
    }

    return matches.map(market);
}

/* ================= START ================= */

bot.onText(/\/start/, (msg) => {

    bot.sendMessage(
        msg.chat.id,
`⚽ BOLAODDS BOT

📊 Real Time Match
📅 1 Minggu Kedepan
🎯 Market Prediction`,
        menu()
    );
});

/* ================= MENU HANDLER ================= */

bot.on("message", async (msg) => {

    const text = msg.text;

    /* TODAY */
    if (text === "📊 Match Hari Ini") {

        const data = await generate(0);

        return bot.sendMessage(
            msg.chat.id,
            "📊 MATCH HARI INI\n\n" +
            data.join("\n\n"),
            menu()
        );
    }

    /* WEEK */
    if (text === "📅 Match 1 Minggu Kedepan") {

        const data = await generate(7);

        return bot.sendMessage(
            msg.chat.id,
            "📅 MATCH 1 MINGGU KEDEPAN\n\n" +
            data.join("\n\n"),
            menu()
        );
    }

    /* INFO */
    if (text === "ℹ️ Info Bot") {

        return bot.sendMessage(
            msg.chat.id,
`⚽ BOLAODDS BOT

✔ Real Match API
✔ Max 10 Match
✔ 1X2
✔ BTTS
✔ Over Under
✔ Score Prediction
✔ Corner Prediction`,
            menu()
        );
    }
});
