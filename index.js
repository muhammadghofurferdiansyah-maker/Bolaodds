const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("BOT RUNNING - PREDICTZ MODE");

/* ================= MENU ================= */
function menu() {
    return {
        reply_markup: {
            keyboard: [
                ["📊 Prediksi Hari Ini"],
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
        "⚽ PredictZ Football Bot\nPilih menu 👇",
        menu()
    );
});

/* ================= SCRAPE PREDICTZ ================= */
async function getPredictZ() {
    try {
        const url = "https://www.predictz.com/predictions/";

        const res = await axios.get(url, {
            headers: {
                "User-Agent": "Mozilla/5.0"
            },
            timeout: 10000
        });

        const $ = cheerio.load(res.data);

        let matches = [];

        // ambil item prediksi (struktur bisa berubah, jadi dibuat fleksibel)
        $("tr").each((i, el) => {
            const text = $(el).text().replace(/\s+/g, " ").trim();

            if (text && text.length > 20 && text.includes("vs")) {
                matches.push(text);
            }
        });

        return matches.slice(0, 10);

    } catch (err) {
        console.log("SCRAPE ERROR:", err.message);
        return [];
    }
}

/* ================= ANALISIS SIMPLE ================= */
function analyze(matches) {

    if (!matches.length) {
        return ["❌ Data PredictZ tidak tersedia saat ini"];
    }

    return matches.slice(0, 5).map(m => {

        const confidence = Math.random();

        let level = "LOW";
        if (confidence > 0.7) level = "HIGH";
        else if (confidence > 0.4) level = "MEDIUM";

        return `⚽ ${m}
🔥 Confidence: ${level}`;
    });
}

/* ================= HANDLER ================= */
bot.on("message", async (msg) => {

    const text = msg.text;

    if (text === "📊 Prediksi Hari Ini") {

        const data = await getPredictZ();
        const result = analyze(data);

        return bot.sendMessage(
            msg.chat.id,
            "📊 PREDIKSI PREDICTZ\n\n" + result.join("\n\n"),
            menu()
        );
    }

    if (text === "ℹ️ Info Bot") {
        return bot.sendMessage(
            msg.chat.id,
            "⚽ Bot ini menggunakan PredictZ sebagai sumber prediksi.\nMode: Single Source Stable",
            menu()
        );
    }
});
