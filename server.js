const express = require("express");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const multer = require("multer");
const { convertMarkdownToPdf } = require("./converter");

const app = express();
const PORT = process.env.PORT || 3000;

// Multer storage for uploaded files (in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB max
});

// Middlewares
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Favicon handler
app.get("/favicon.ico", (req, res) => res.status(204).end());

// Ensure outputs directory exists
const OUTPUTS_DIR = path.join(__dirname, "outputs");
if (!fsSync.existsSync(OUTPUTS_DIR)) {
    fsSync.mkdirSync(OUTPUTS_DIR, { recursive: true });
}

/**
 * API: Convert Markdown text to PDF and return as downloadable buffer
 */
app.post("/api/convert", async (req, res) => {
    try {
        const {
            markdown,
            filename = "document",
            format = "A4",
            orientation = "portrait",
            theme = "github-light",
            showPageNumbers = true,
            showHeader = false,
            title = "",
            renderMermaid = true,
            marginPreset = "normal"
        } = req.body;

        if (!markdown || typeof markdown !== "string" || !markdown.trim()) {
            return res.status(400).json({ error: "Markdown matni bo'sh bo'lishi mumkin emas." });
        }

        let margin = { top: "20mm", bottom: "20mm", left: "20mm", right: "20mm" };
        if (marginPreset === "compact") {
            margin = { top: "10mm", bottom: "10mm", left: "10mm", right: "10mm" };
        } else if (marginPreset === "wide") {
            margin = { top: "30mm", bottom: "30mm", left: "25mm", right: "25mm" };
        }

        const safeFilename = filename.trim().replace(/[/\\?%*:|"<>]/g, "-") || "document";
        const pdfFileName = safeFilename.endsWith(".pdf") ? safeFilename : `${safeFilename}.pdf`;
        const localOutputPath = path.join(OUTPUTS_DIR, pdfFileName);

        console.log(`[INFO] PDF generatsiya qilinmoqda: "${pdfFileName}" (Mavzu: ${theme}, Format: ${format})`);

        const pdfBuffer = await convertMarkdownToPdf(markdown, {
            format,
            orientation,
            theme,
            showPageNumbers: Boolean(showPageNumbers),
            showHeader: Boolean(showHeader),
            title: title || safeFilename.replace(/\.pdf$/, ""),
            renderMermaid: Boolean(renderMermaid),
            margin,
            outputPath: localOutputPath
        });

        // Also update root output.pdf for backward compatibility
        try {
            await fs.writeFile(path.join(__dirname, "output.pdf"), pdfBuffer);
        } catch (e) {
            console.warn("[WARN] root output.pdf saqlanmadi:", e.message);
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(pdfFileName)}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error("[ERROR] PDF generatsiyasida xatolik:", err);
        return res.status(500).json({
            error: "PDF yaratishda xatolik yuz berdi.",
            details: err.message
        });
    }
});

/**
 * API: Upload .md file and convert to PDF
 */
app.post("/api/upload", upload.single("file"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Fayl yuklanmadi." });
        }

        const markdown = req.file.buffer.toString("utf8");
        const originalName = req.file.originalname.replace(/\.[^/.]+$/, "");
        const options = {
            format: req.body.format || "A4",
            orientation: req.body.orientation || "portrait",
            theme: req.body.theme || "github-light",
            showPageNumbers: req.body.showPageNumbers !== "false",
            showHeader: req.body.showHeader === "true",
            title: req.body.title || originalName,
            renderMermaid: req.body.renderMermaid !== "false"
        };

        const safeFilename = `${originalName}.pdf`;
        const localOutputPath = path.join(OUTPUTS_DIR, safeFilename);

        const pdfBuffer = await convertMarkdownToPdf(markdown, {
            ...options,
            outputPath: localOutputPath
        });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(safeFilename)}"`);
        res.setHeader("Content-Length", pdfBuffer.length);
        return res.send(pdfBuffer);
    } catch (err) {
        console.error("[ERROR] Fayl yuklashda xatolik:", err);
        return res.status(500).json({
            error: "Faylni konvertatsiya qilishda xatolik.",
            details: err.message
        });
    }
});

/**
 * API: Get sample markdown (sample.md or README.md)
 */
app.get("/api/sample", async (req, res) => {
    try {
        let samplePath = path.join(__dirname, "sample.md");
        let sampleName = "sample.md";
        if (!fsSync.existsSync(samplePath)) {
            samplePath = path.join(__dirname, "README.md");
            sampleName = "README.md";
        }
        const content = await fs.readFile(samplePath, "utf8");
        res.json({ content, filename: sampleName });
    } catch (err) {
        res.status(500).json({ error: "Namuna hujjati topilmadi." });
    }
});

/**
 * API: Get existing PDFs list from workspace & all/ folder
 */
app.get("/api/history", async (req, res) => {
    try {
        const items = [];

        // Helper to scan directory for PDFs
        async function scanDir(dirPath, folderLabel) {
            try {
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                for (const file of files) {
                    if (file.isFile() && file.name.toLowerCase().endsWith(".pdf")) {
                        const fullPath = path.join(dirPath, file.name);
                        const stats = await fs.stat(fullPath);
                        items.push({
                            name: file.name,
                            folder: folderLabel,
                            size: stats.size,
                            lastModified: stats.mtime,
                            downloadUrl: `/api/pdf/${encodeURIComponent(folderLabel)}/${encodeURIComponent(file.name)}`
                        });
                    }
                }
            } catch (e) {
                // Ignore missing folders
            }
        }

        await scanDir(__dirname, "root");
        await scanDir(OUTPUTS_DIR, "outputs");
        await scanDir(path.join(__dirname, "all"), "all");

        // Sort by last modified descending
        items.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

        res.json({ items });
    } catch (err) {
        res.status(500).json({ error: "Tarixni yuklashda xatolik.", details: err.message });
    }
});

/**
 * API: Download or view existing PDF
 */
app.get("/api/pdf/:folder/:filename", async (req, res) => {
    try {
        const { folder, filename } = req.params;
        let baseDir = __dirname;
        if (folder === "outputs") baseDir = OUTPUTS_DIR;
        else if (folder === "all") baseDir = path.join(__dirname, "all");

        const targetPath = path.resolve(baseDir, filename);

        // Security check: ensure path is within baseDir
        if (!targetPath.startsWith(baseDir)) {
            return res.status(403).json({ error: "Ruxsat etilmagan yo'l." });
        }

        if (!fsSync.existsSync(targetPath)) {
            return res.status(404).json({ error: "Fayl topilmadi." });
        }

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(filename)}"`);
        fsSync.createReadStream(targetPath).pipe(res);
    } catch (err) {
        res.status(500).json({ error: "PDF faylini yuklab berishda xatolik." });
    }
});

function startServer(port = PORT) {
    return app.listen(port, () => {
        console.log(`\n======================================================`);
        console.log(`🚀 Markdown to PDF Web UI muvaffaqiyatli ishga tushdi!`);
        console.log(`🌐 Havola: http://localhost:${port}`);
        console.log(`======================================================\n`);
    });
}

if (require.main === module) {
    startServer();
}

module.exports = { app, startServer };
