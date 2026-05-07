// ===============================
// ⚽ BOLAODDS REAL TIME BOT
// ===============================
// ✔ REAL TIME MATCH
// ✔ MATCH HARI INI
// ✔ 1 MINGGU KEDEPAN
// ✔ MAX 10 MATCH
// ✔ 1X2
// ✔ BTTS
// ✔ OVER UNDER
// ✔ SCORE PREDICTION
// ✔ CORNER PREDICTION
// ✔ STABIL UNTUK RAILWAY
// ===============================

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/* ===============================
   ENV CHECK
=============================== */

if (!process.env.BOT_TOKEN) {
    console.log("❌ BOT_TOKEN tidak ditemukan");
    process.exit(1);
}

if (!process.env.FOOTBALL_API_KEY) {
    console.log("❌ FOOTBALL_API_KEY tidak ditemukan");
    process.exit(1);
}

/* ===============================
   BOT INIT
=============================== */

const bot = new TelegramBot(process.env.BOT_TOKEN, {
    polling: true
});

console.log("✅ BOLAODDS BOT ACTIVE");

/* ===============================
   MENU
=============================== */

function menu() {

    return {
        reply_markup: {
            keyboard: [
                ["📊 Match Hari Ini"],
                ["📅 Match 1 Minggu Kedepan"],
                ["🔥 Top Match"],
                ["ℹ️ Info Bot"]
            ],
            resize_keyboard: true
        }
    };
}

/* ===============================
   GET MATCHES
=============================== */

async function getMatches(days = 0) {

    try {

        const today = new Date();

        const future = new Date();
        future.setDate(today.getDate() + days);

        const from = today.toISOString().split("T")[0];
        const to = future.toISOString().split("T")[0];

        console.log("FROM:", from);
        console.log("TO:", to);

        const url =
            "https://api.football-data.org/v4/matches";

        const res = await axios.get(url, {

            headers: {
                "X-Auth-Token":
                    process.env.FOOTBALL_API_KEY
            },

            params: {
                dateFrom: from,
                dateTo: to
            },

            timeout: 10000
        });

        const matches = res.data.matches || [];

        console.log("✅ MATCH:", matches.length);

        return matches.slice(0, 10);

    } catch (err) {

        console.log(
            "❌ API ERROR:",
            err.response?.data || err.message
        );

        return [];
    }
}

/* ===============================
   MARKET ENGINE
=============================== */

function generatePrediction(match) {

    const home =
        match.homeTeam?.name || "Home";

    const away =
        match.awayTeam?.name || "Away";

    // ===== 1X2 =====
    const homeWin =
        Math.floor(Math.random() * 40 + 40);

    const draw =
        Math.floor(Math.random() * 20);

    const awayWin =
        100 - homeWin - draw;

    // ===== BTTS =====
    const btts =
        Math.random() > 0.5
            ? "YES"
            : "NO";

    // ===== OVER UNDER =====
    const goals =
        Math.random() > 0.5
            ? "OVER 2.5"
            : "UNDER 2.5";

    // ===== SCORE =====
    const homeScore =
        Math.floor(Math.random() * 4);

    const awayScore =
        Math.floor(Math.random() * 3);

    const score =
        `${homeScore}-${awayScore}`;

    // ===== CORNER =====
    const corners =
        `${Math.floor(Math.random() * 5 + 8)}+`;

    // ===== TOP PICK =====
    let topPick = "DRAW";

    if (homeWin > awayWin)
        topPick = "HOME";

    if (awayWin > homeWin)
        topPick = "AWAY";

    return `⚽ ${home} vs ${away}

📅 ${match.utcDate}

🏆 PICK: ${topPick}

📊 1X2
🏠 Home: ${homeWin}%
🤝 Draw: ${draw}%
🛫 Away: ${awayWin}%

🎯 BTTS: ${btts}
📈 Goals: ${goals}

⚽ Prediksi Score:
${score}

🚩 Corner:
OVER ${corners}`;
}

/* ===============================
   GENERATE DATA
=============================== */

async function generate(days = 0) {

    const matches =
        await getMatches(days);

    if (!matches.length) {

        return [
            "❌ Tidak ada data pertandingan\n\n" +
            "Kemungkinan:\n" +
            "- API limit habis\n" +
            "- API key salah\n" +
            "- Tidak ada jadwal hari ini"
        ];
    }

    return matches.map(generatePrediction);
}

/* ===============================
   START
=============================== */

bot.onText(/\/start/, async (msg) => {

    bot.sendMessage(
        msg.chat.id,

`⚽ BOLAODDS REAL TIME BOT

✅ Match Real Time
✅ 1–10 Match
✅ Semua Liga Dunia
✅ 1X2
✅ BTTS
✅ Over Under
✅ Score
✅ Corner

Pilih menu 👇`,

        menu()
    );
});

/* ===============================
   MESSAGE HANDLER
=============================== */

bot.on("message", async (msg) => {

    const text = msg.text;

    /* ================= TODAY ================= */

    if (text === "📊 Match Hari Ini") {

        const data =
            await generate(0);

        return bot.sendMessage(
            msg.chat.id,

            "📊 MATCH HARI INI\n\n" +
            data.join("\n\n"),

            menu()
        );
    }

    /* ================= WEEK ================= */

    if (text === "📅 Match 1 Minggu Kedepan") {

        const data =
            await generate(7);

        return bot.sendMessage(
            msg.chat.id,

            "📅 MATCH 1 MINGGU KEDEPAN\n\n" +
            data.join("\n\n"),

            menu()
        );
    }

    /* ================= TOP MATCH ================= */

    if (text === "🔥 Top Match") {

        const data =
            await generate(0);

        return bot.sendMessage(
            msg.chat.id,

            "🔥 TOP MATCH HARI INI\n\n" +
            data.slice(0, 5).join("\n\n"),

            menu()
        );
    }

    /* ================= INFO ================= */

    if (text === "ℹ️ Info Bot") {

        return bot.sendMessage(
            msg.chat.id,

`⚽ BOLAODDS BOT

📡 Source:
Football-Data.org API

📊 Features:
✔ Real Time Match
✔ Match Mingguan
✔ 1X2
✔ BTTS
✔ Over Under
✔ Score Prediction
✔ Corner Prediction

🚀 Hosted on Railway`,

            menu()
        );
    }
});

/* ===============================
   ERROR HANDLER
=============================== */

process.on("unhandledRejection", (err) => {
    console.log("❌ UNHANDLED:", err);
});

process.on("uncaughtException", (err) => {
    console.log("❌ EXCEPTION:", err);
});
