const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/* ===================================
   ENV CHECK
=================================== */

if (!process.env.BOT_TOKEN) {
    console.log("❌ BOT_TOKEN missing");
    process.exit(1);
}

if (!process.env.API_FOOTBALL_KEY) {
    console.log("❌ API_FOOTBALL_KEY missing");
    process.exit(1);
}

/* ===================================
   BOT INIT
=================================== */

const bot = new TelegramBot(
    process.env.BOT_TOKEN,
    {
        polling: true
    }
);

console.log("✅ BOLAODDS PRO ACTIVE");

/* ===================================
   MENU
=================================== */

function menu() {

    return {
        reply_markup: {
            keyboard: [
                ["📊 Match Hari Ini"],
                ["📅 Match 1 Minggu Kedepan"],
                ["🔥 Top Match"],
                ["⚽ Live Match"],
                ["ℹ️ Info Bot"]
            ],
            resize_keyboard: true
        }
    };
}

/* ===================================
   API CONFIG
=================================== */

const api = axios.create({
    baseURL: "https://v3.football.api-sports.io",
    headers: {
        "x-apisports-key":
            process.env.API_FOOTBALL_KEY
    },
    timeout: 15000
});

/* ===================================
   GET FIXTURES
=================================== */

async function getFixtures(days = 0) {

    try {

        const today = new Date();

        const future = new Date();
        future.setDate(today.getDate() + days);

        const from =
            today.toISOString().split("T")[0];

        const to =
            future.toISOString().split("T")[0];

        console.log("FROM:", from);
        console.log("TO:", to);

        const res = await api.get("/fixtures", {
            params: {
                from: from,
                to: to
            }
        });

        const fixtures =
            res.data.response || [];

        console.log(
            "✅ FIXTURES:",
            fixtures.length
        );

        return fixtures.slice(0, 10);

    } catch (err) {

        console.log(
            "❌ FIXTURE ERROR:",
            err.response?.data || err.message
        );

        return [];
    }
}

/* ===================================
   LIVE MATCH
=================================== */

async function getLiveFixtures() {

    try {

        const res = await api.get("/fixtures", {
            params: {
                live: "all"
            }
        });

        return (
            res.data.response || []
        ).slice(0, 10);

    } catch (err) {

        console.log(
            "❌ LIVE ERROR:",
            err.response?.data || err.message
        );

        return [];
    }
}

/* ===================================
   MARKET ENGINE
=================================== */

function prediction(match) {

    const home =
        match.teams.home.name;

    const away =
        match.teams.away.name;

    const league =
        match.league.name;

    const date =
        match.fixture.date;

    /* ===== 1X2 ===== */

    const homeWin =
        Math.floor(Math.random() * 40 + 40);

    const draw =
        Math.floor(Math.random() * 20);

    const awayWin =
        100 - homeWin - draw;

    /* ===== BTTS ===== */

    const btts =
        Math.random() > 0.5
            ? "YES"
            : "NO";

    /* ===== OVER UNDER ===== */

    const overUnder =
        Math.random() > 0.5
            ? "OVER 2.5"
            : "UNDER 2.5";

    /* ===== SCORE ===== */

    const score =
        `${Math.floor(Math.random()*4)}-${Math.floor(Math.random()*3)}`;

    /* ===== CORNER ===== */

    const corners =
        `${Math.floor(Math.random()*5+8)}+`;

    /* ===== PICK ===== */

    let topPick = "DRAW";

    if (homeWin > awayWin)
        topPick = "HOME";

    if (awayWin > homeWin)
        topPick = "AWAY";

    return `🏆 ${league}

⚽ ${home} vs ${away}

📅 ${date}

🔥 PICK: ${topPick}

📊 1X2
🏠 Home: ${homeWin}%
🤝 Draw: ${draw}%
🛫 Away: ${awayWin}%

🎯 BTTS: ${btts}

📈 Goals:
${overUnder}

⚽ Score:
${score}

🚩 Corners:
OVER ${corners}`;
}

/* ===================================
   GENERATE
=================================== */

async function generate(days = 0) {

    const fixtures =
        await getFixtures(days);

    if (!fixtures.length) {

        return [
            "❌ Tidak ada data pertandingan\n\n" +
            "Kemungkinan:\n" +
            "- API limit habis\n" +
            "- API key salah\n" +
            "- Tidak ada jadwal"
        ];
    }

    return fixtures.map(prediction);
}

/* ===================================
   LIVE GENERATE
=================================== */

async function generateLive() {

    const fixtures =
        await getLiveFixtures();

    if (!fixtures.length) {

        return [
            "❌ Tidak ada live match saat ini"
        ];
    }

    return fixtures.map(prediction);
}

/* ===================================
   START
=================================== */

bot.onText(/\/start/, async (msg) => {

    bot.sendMessage(
        msg.chat.id,

`⚽ BOLAODDS PRO BOT

✅ API-FOOTBALL
✅ Real Time Fixtures
✅ Semua Liga Dunia
✅ 1X2
✅ BTTS
✅ Over Under
✅ Score
✅ Corner
✅ Live Match

👇 Pilih menu`,

        menu()
    );
});

/* ===================================
   MESSAGE HANDLER
=================================== */

bot.on("message", async (msg) => {

    const text = msg.text;

    /* TODAY */

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

    /* WEEK */

    if (
        text ===
        "📅 Match 1 Minggu Kedepan"
    ) {

        const data =
            await generate(7);

        return bot.sendMessage(
            msg.chat.id,

            "📅 MATCH 1 MINGGU KEDEPAN\n\n" +
            data.join("\n\n"),

            menu()
        );
    }

    /* TOP MATCH */

    if (text === "🔥 Top Match") {

        const data =
            await generate(0);

        return bot.sendMessage(
            msg.chat.id,

            "🔥 TOP MATCH\n\n" +
            data.slice(0, 5).join("\n\n"),

            menu()
        );
    }

    /* LIVE */

    if (text === "⚽ Live Match") {

        const data =
            await generateLive();

        return bot.sendMessage(
            msg.chat.id,

            "⚽ LIVE MATCH\n\n" +
            data.join("\n\n"),

            menu()
        );
    }

    /* INFO */

    if (text === "ℹ️ Info Bot") {

        return bot.sendMessage(
            msg.chat.id,

`⚽ BOLAODDS PRO

📡 Source:
API-FOOTBALL

📊 Features:
✔ Real Time
✔ Live Match
✔ Semua Liga Dunia
✔ 1X2
✔ BTTS
✔ Over Under
✔ Score
✔ Corner

🚀 Hosted on Railway`,

            menu()
        );
    }
});

/* ===================================
   ERROR HANDLER
=================================== */

process.on(
    "unhandledRejection",
    (err) => {

        console.log(
            "❌ UNHANDLED:",
            err
        );
    }
);

process.on(
    "uncaughtException",
    (err) => {

        console.log(
            "❌ EXCEPTION:",
            err
        );
    }
);
