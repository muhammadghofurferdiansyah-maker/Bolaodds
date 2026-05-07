const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");

/* =====================================
   ENV VALIDATION
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

const bot = new TelegramBot(
    BOT_TOKEN,
    {
        polling: {
            interval: 300,
            autoStart: true,
            params: {
                timeout: 10
            }
        }
    }
);

console.log("✅ BOLAODDS BOT ACTIVE");

/* =====================================
   API CONFIG
===================================== */

const api = axios.create({
    baseURL:
        "https://v3.football.api-sports.io",
    headers: {
        "x-apisports-key": API_KEY
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
   GET FIXTURES
===================================== */

async function getFixtures(days = 0) {

    const today =
        new Date();

    const future =
        new Date();

    future.setDate(
        today.getDate() + days
    );

    const from =
        today.toISOString().split("T")[0];

    const to =
        future.toISOString().split("T")[0];

    console.log(
        "📅 FROM:",
        from
    );

    console.log(
        "📅 TO:",
        to
    );

    const fixtures =
        await safeRequest(
            "/fixtures",
            {
                from,
                to
            }
        );

    console.log(
        "✅ FIXTURES:",
        fixtures.length
    );

    return fixtures.slice(0, 10);
}

/* =====================================
   LIVE MATCH
===================================== */

async function getLiveFixtures() {

    const fixtures =
        await safeRequest(
            "/fixtures",
            {
                live: "all"
            }
        );

    return fixtures.slice(0, 10);
}

/* =====================================
   PREDICTION ENGINE
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
            "Unknown League";

        const date =
            match.fixture?.date ||
            "-";

        /* ===== RANDOM ENGINE ===== */

        const homeWin =
            Math.floor(
                Math.random() * 40 + 40
            );

        const draw =
            Math.floor(
                Math.random() * 20
            );

        const awayWin =
            100 - homeWin - draw;

        const btts =
            Math.random() > 0.5
                ? "YES"
                : "NO";

        const ou =
            Math.random() > 0.5
                ? "OVER 2.5"
                : "UNDER 2.5";

        const score =
            `${Math.floor(Math.random()*4)}-${Math.floor(Math.random()*3)}`;

        const corners =
            `${Math.floor(Math.random()*5+8)}+`;

        let pick = "DRAW";

        if (homeWin > awayWin)
            pick = "HOME";

        if (awayWin > homeWin)
            pick = "AWAY";

        return `🏆 ${league}

⚽ ${home} vs ${away}

📅 ${date}

🔥 PICK: ${pick}

📊 1X2
🏠 Home: ${homeWin}%
🤝 Draw: ${draw}%
🛫 Away: ${awayWin}%

🎯 BTTS: ${btts}

📈 Goals:
${ou}

⚽ Score:
${score}

🚩 Corners:
OVER ${corners}`;

    } catch (err) {

        console.log(
            "❌ BUILD ERROR:",
            err.message
        );

        return "❌ Error build prediction";
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
            "❌ Tidak ada live match saat ini"
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

`⚽ BOLAODDS PRO BOT

✅ Real Time Match
✅ Semua Liga Dunia
✅ Live Match
✅ 1X2
✅ BTTS
✅ Over Under
✅ Score
✅ Corner

👇 Pilih menu`,

            menu()
        );
    }
);

/* =====================================
   MESSAGE HANDLER
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

            /* TOP MATCH */

            if (
                text ===
                "🔥 Top Match"
            ) {

                const data =
                    await generate(0);

                return bot.sendMessage(
                    msg.chat.id,

                    "🔥 TOP MATCH\n\n" +
                    data.slice(0, 5).join("\n\n"),

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
✔ Real Time
✔ Live Match
✔ Semua Liga
✔ 1X2
✔ BTTS
✔ Over Under
✔ Score
✔ Corner

🚀 Railway Ready`,

                    menu()
                );
            }

        } catch (err) {

            console.log(
                "❌ MESSAGE ERROR:",
                err.message
            );
        }
    }
);

/* =====================================
   GLOBAL ERROR
===================================== */

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
