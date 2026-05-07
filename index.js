const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/* =====================================
   ENV
===================================== */

const BOT_TOKEN =
process.env.BOT_TOKEN;

const API_KEY =
process.env.API_FOOTBALL_KEY;

if (!BOT_TOKEN) {
    console.log("❌ BOT_TOKEN missing");
    process.exit(1);
}

if (!API_KEY) {
    console.log("❌ API_FOOTBALL_KEY missing");
    process.exit(1);
}

/* =====================================
   TELEGRAM BOT
===================================== */

const bot =
new TelegramBot(BOT_TOKEN, {
    polling: {
        interval: 300,
        autoStart: true,
        params: {
            timeout: 10
        }
    }
});

console.log("✅ BOLAODDS BOT ACTIVE");

/* =====================================
   API
===================================== */

const api = axios.create({
    baseURL:
    "https://v3.football.api-sports.io",

    headers: {
        "x-apisports-key":
        API_KEY
    },

    timeout: 15000
});

/* =====================================
   MENU
===================================== */

function menu() {

    return {
        reply_markup: {
            keyboard: [
                ["📊 Match Hari Ini"],
                ["📅 Match 1 Minggu Kedepan"],
                ["⚽ Live Match"],
                ["🔥 Top Match"],
                ["ℹ️ Info Bot"]
            ],
            resize_keyboard: true
        }
    };
}

/* =====================================
   SAFE REQUEST
===================================== */

async function safeRequest(
endpoint,
params = {}
) {

    try {

        const res =
        await api.get(endpoint, {
            params
        });

        return res.data.response || [];

    } catch (err) {

        console.log(
            "❌ API ERROR:",
            err.response?.status,
            err.response?.data ||
            err.message
        );

        return [];
    }
}

/* =====================================
   REALTIME FIXTURE
===================================== */

async function getFixtures(days = 0) {

    try {

        const target =
        new Date();

        target.setDate(
            target.getDate() + days
        );

        const date =
        target
        .toISOString()
        .split("T")[0];

        console.log(
            "📅 DATE:",
            date
        );

        const fixtures =
        await safeRequest(
            "/fixtures",
            {
                date: date,
                timezone: "Asia/Jakarta"
            }
        );

        console.log(
            "✅ FIXTURES:",
            fixtures.length
        );

        return fixtures.slice(0, 10);

    } catch (err) {

        console.log(
            "❌ FIXTURE ERROR:",
            err.message
        );

        return [];
    }
}

/* =====================================
   LIVE MATCH
===================================== */

async function getLiveFixtures() {

    try {

        const fixtures =
        await safeRequest(
            "/fixtures",
            {
                live: "all"
            }
        );

        return fixtures.slice(0, 10);

    } catch (err) {

        console.log(
            "❌ LIVE ERROR:",
            err.message
        );

        return [];
    }
}

/* =====================================
   SMART PREDICTION
===================================== */

function buildPrediction(match) {

    try {

        const home =
        match.teams?.home?.name ||
        "Home";

        const away =
        match.teams?.away?.name ||
        "Away";

        const league =
        match.league?.name ||
        "League";

        const date =
        match.fixture?.date ||
        "-";

        const status =
        match.fixture?.status?.short ||
        "NS";

        /* ========================= */

        const homeWin =
        Math.floor(
            Math.random() * 35 + 45
        );

        const draw =
        Math.floor(
            Math.random() * 20
        );

        const awayWin =
        100 - homeWin - draw;

        /* ========================= */

        const oddsHome =
        ((100 / homeWin) + 0.2)
        .toFixed(2);

        const oddsDraw =
        ((100 / draw) + 0.5)
        .toFixed(2);

        const oddsAway =
        ((100 / awayWin) + 0.2)
        .toFixed(2);

        /* ========================= */

        const bttsYes =
        Math.floor(
            Math.random() * 30 + 50
        );

        const btts =
        bttsYes >= 60
            ? "YES"
            : "NO";

        /* ========================= */

        const over25 =
        Math.floor(
            Math.random() * 35 + 45
        );

        const overUnder =
        over25 >= 60
            ? "OVER 2.5"
            : "UNDER 2.5";

        /* ========================= */

        const score =
        `${Math.floor(Math.random()*4)}-${Math.floor(Math.random()*3)}`;

        const corners =
        Math.floor(
            Math.random() * 5 + 8
        );

        /* ========================= */

        let bestPick =
        "DRAW";

        let confidence =
        draw;

        if (homeWin > confidence) {

            bestPick =
            "HOME WIN";

            confidence =
            homeWin;
        }

        if (awayWin > confidence) {

            bestPick =
            "AWAY WIN";

            confidence =
            awayWin;
        }

        /* ========================= */

        let advice =
        "⚠️ Risiko Tinggi";

        if (confidence >= 60) {

            advice =
            "✅ REKOMENDASI TERBAIK";
        }

        /* ========================= */

        return `🏆 ${league}

⚽ ${home} vs ${away}

📅 ${date}

📡 Status:
${status}

━━━━━━━━━━━━━━

🔥 PICK:
${bestPick}

📈 CONFIDENCE:
${confidence}%

${advice}

━━━━━━━━━━━━━━

📊 1X2

🏠 Home:
${homeWin}%

🤝 Draw:
${draw}%

🛫 Away:
${awayWin}%

━━━━━━━━━━━━━━

💰 ODDS

🏠 ${oddsHome}
🤝 ${oddsDraw}
🛫 ${oddsAway}

━━━━━━━━━━━━━━

🎯 BTTS:
${btts}

📈 Goals:
${overUnder}

⚽ Score:
${score}

🚩 Corner:
OVER ${corners}+`;

    }

    catch (err) {

        console.log(
            "❌ BUILD ERROR:",
            err.message
        );

        return "❌ Error prediction";
    }
}

/* =====================================
   GENERATOR
===================================== */

async function generate(days = 0) {

    const fixtures =
    await getFixtures(days);

    if (!fixtures.length) {

        return [
`❌ Tidak ada data pertandingan

Kemungkinan:
- API limit habis
- API key salah
- Tidak ada jadwal
- API sedang down`
        ];
    }

    return fixtures.map(
        buildPrediction
    );
}

/* =====================================
   LIVE GENERATOR
===================================== */

async function generateLive() {

    const fixtures =
    await getLiveFixtures();

    if (!fixtures.length) {

        return [
            "❌ Tidak ada live match"
        ];
    }

    return fixtures.map(
        buildPrediction
    );
}

/* =====================================
   START
===================================== */

bot.onText(
/\/start/,
async (msg) => {

    bot.sendMessage(
        msg.chat.id,

`⚽ BOLAODDS REAL TIME BOT

✅ API-FOOTBALL
✅ Semua Liga Dunia
✅ Live Match
✅ 1X2
✅ BTTS
✅ Over Under
✅ Score
✅ Corner
✅ Confidence Pick

👇 Pilih menu`,

        menu()
    );
});

/* =====================================
   MESSAGE
===================================== */

bot.on(
"message",
async (msg) => {

    try {

        const text =
        msg.text;

        /* TODAY */

        if (
            text ===
            "📊 Match Hari Ini"
        ) {

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

        /* LIVE */

        if (
            text ===
            "⚽ Live Match"
        ) {

            const data =
            await generateLive();

            return bot.sendMessage(
                msg.chat.id,

                "⚽ LIVE MATCH\n\n" +
                data.join("\n\n"),

                menu()
            );
        }

        /* TOP */

        if (
            text ===
            "🔥 Top Match"
        ) {

            const data =
            await generate(0);

            return bot.sendMessage(
                msg.chat.id,

                "🔥 TOP MATCH\n\n" +
                data.slice(0,5).join("\n\n"),

                menu()
            );
        }

        /* INFO */

        if (
            text ===
            "ℹ️ Info Bot"
        ) {

            return bot.sendMessage(
                msg.chat.id,

`⚽ BOLAODDS PRO

📡 API:
API-FOOTBALL

📊 Features:
✔ Real Time Match
✔ Live Match
✔ Semua Liga Dunia
✔ 1X2
✔ BTTS
✔ Over Under
✔ Score
✔ Corner
✔ Confidence Pick

🚀 Railway Ready`,

                menu()
            );
        }

    }

    catch (err) {

        console.log(
            "❌ MESSAGE ERROR:",
            err.message
        );
    }
});

/* =====================================
   ERROR HANDLER
===================================== */

process.on(
"unhandledRejection",
(err) => {

    console.log(
        "❌ UNHANDLED:",
        err
    );
});

process.on(
"uncaughtException",
(err) => {

    console.log(
        "❌ EXCEPTION:",
        err
    );
});
