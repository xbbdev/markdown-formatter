const fs = require("fs/promises");
const path = require("path");
const { convertMarkdownToPdf } = require("./converter");
const { startServer } = require("./server");

async function runCli(inputPath, outputPath) {
    try {
        console.log(`[START] Konvertatsiya boshlandi: ${inputPath} -> ${outputPath}`);
        const markdown = await fs.readFile(inputPath, "utf8");
        await convertMarkdownToPdf(markdown, {
            outputPath,
            renderMermaid: true,
            showPageNumbers: true
        });
        console.log(`[SUCCESS] PDF yaratildi: ${outputPath}`);
    } catch (err) {
        console.error(`[ERROR] Xatolik:`, err.message);
        process.exit(1);
    }
}

// Check arguments
const args = process.argv.slice(2);

if (args.length >= 1) {
    if (args[0] === "--server" || args[0] === "--ui") {
        startServer();
    } else {
        const input = args[0];
        const output = args[1] || input.replace(/\.[^/.]+$/, "") + ".pdf";
        runCli(input, output);
    }
} else {
    // Default action: start the interactive Web UI
    console.log("-------------------------------------------------------");
    console.log("ℹ️ Argument berilmadi, Web UI interfeysi ishga tushmoqda.");
    console.log("💡 Maslahat: CLI rejimida ishlatish uchun: node index.js <fayl.md> [chiqish.pdf]");
    console.log("-------------------------------------------------------");
    startServer();
}

module.exports = { convertMarkdownToPdf };
