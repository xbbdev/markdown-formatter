const { Marked } = require("marked");
const puppeteer = require("puppeteer");
const hljs = require("highlight.js");

function escapeHtml(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createMarkedParser(enableMermaid = true) {
    const parser = new Marked();
    const renderer = {
        code(token) {
            const code = token.text || "";
            const lang = (token.lang || "").trim();

            if (enableMermaid && lang === "mermaid") {
                return `<div class="mermaid">${code}</div>\n`;
            }

            if (lang && hljs.getLanguage(lang)) {
                try {
                    const highlighted = hljs.highlight(code, { language: lang }).value;
                    return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>\n`;
                } catch (e) {
                    // Fallback
                }
            }

            try {
                const auto = hljs.highlightAuto(code).value;
                return `<pre><code class="hljs">${auto}</code></pre>\n`;
            } catch (e) {
                return `<pre><code>${escapeHtml(code)}</code></pre>\n`;
            }
        }
    };

    parser.use({ renderer });
    return parser;
}

function getThemeStyles(theme) {
    if (theme === "github-dark") {
        return `
            body {
                background: #0d1117;
                color: #c9d1d9;
            }
            a { color: #58a6ff; }
            h1, h2, h3, h4, h5, h6 { color: #f0f6fc; border-bottom-color: #21262d; }
            pre { background: #161b22 !important; border: 1px solid #30363d; }
            code:not(pre code) { background: #21262d; color: #ff7b72; }
            table th, table td { border-color: #30363d !important; }
            table tr:nth-child(even) { background: #161b22; }
            blockquote { border-left-color: #3b434b; color: #8b949e; }
            hr { background-color: #30363d; }
        `;
    }
    return `
        body {
            background: #ffffff;
            color: #24292f;
        }
        a { color: #0969da; }
        h1, h2, h3, h4, h5, h6 { color: #1f2328; border-bottom-color: #d8dee4; }
        pre { background: #f6f8fa !important; border: 1px solid #e1e4e8; }
        code:not(pre code) { background: #eff1f3; color: #b31d28; }
        table th, table td { border-color: #d0d7de !important; }
        table tr:nth-child(even) { background: #f6f8fa; }
        blockquote { border-left-color: #d0d7de; color: #57606a; }
        hr { background-color: #d0d7de; }
    `;
}

function buildHtmlDocument(contentHtml, options = {}) {
    const theme = options.theme || "github-light";
    const themeStyles = getThemeStyles(theme);
    const hljsCss = theme === "github-dark"
        ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
        : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css";

    return `<!DOCTYPE html>
<html lang="uz">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title || "Markdown PDF")}</title>
  <link rel="stylesheet" href="${hljsCss}">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    * {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      font-size: 14px;
      line-height: 1.6;
      word-wrap: break-word;
      padding: 0;
      margin: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    h1, h2, h3, h4, h5, h6 {
      margin-top: 24px;
      margin-bottom: 16px;
      font-weight: 600;
      line-height: 1.25;
      page-break-after: avoid;
      break-after: avoid;
    }

    h1 { font-size: 2em; padding-bottom: 0.3em; border-bottom: 1px solid #d8dee4; }
    h2 { font-size: 1.5em; padding-bottom: 0.3em; border-bottom: 1px solid #d8dee4; }
    h3 { font-size: 1.25em; }
    h4 { font-size: 1em; }

    p, blockquote, ul, ol, dl, table, pre {
      margin-top: 0;
      margin-bottom: 16px;
    }

    pre {
      padding: 16px;
      overflow: auto;
      font-size: 85%;
      line-height: 1.45;
      border-radius: 6px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    code {
      font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
      font-size: 85%;
      border-radius: 4px;
      padding: 0.2em 0.4em;
    }

    pre code {
      padding: 0;
      font-size: 100%;
      background: transparent !important;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      margin-bottom: 16px;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    table th, table td {
      padding: 8px 12px;
      border: 1px solid #d0d7de;
      text-align: left;
    }

    table th {
      font-weight: 600;
    }

    blockquote {
      padding: 0 1em;
      border-left: 0.25em solid #d0d7de;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    img {
      max-width: 100%;
      height: auto;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    hr {
      height: 0.25em;
      padding: 0;
      margin: 24px 0;
      border: 0;
    }

    .mermaid {
      text-align: center;
      margin: 24px 0;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .mermaid svg {
      max-width: 100% !important;
      height: auto !important;
    }

    @media print {
      body {
        margin: 0;
      }
      pre, table, blockquote, .mermaid, img {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      h1, h2, h3, h4 {
        page-break-after: avoid;
        break-after: avoid;
      }
    }

    ${themeStyles}
  </style>
</head>
<body>
  ${contentHtml}

  <script>
    if (typeof mermaid !== 'undefined') {
      mermaid.initialize({
        startOnLoad: true,
        theme: '${theme === "github-dark" ? "dark" : "default"}',
        securityLevel: 'loose'
      });
    }
  </script>
</body>
</html>`;
}

/**
 * Converts a Markdown string into a PDF Buffer or writes to outputPath.
 */
async function convertMarkdownToPdf(markdown, options = {}) {
    const parser = createMarkedParser(options.renderMermaid !== false);
    const contentHtml = parser.parse(markdown || "");
    const fullHtml = buildHtmlDocument(contentHtml, options);

    let browser = null;
    try {
        browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ]
        });

        const page = await browser.newPage();

        // Load the HTML content
        await page.setContent(fullHtml, {
            waitUntil: ["load", "networkidle0"],
            timeout: 30000
        });

        // If mermaid is present, ensure it runs and wait for SVG elements
        if (options.renderMermaid !== false && markdown.includes("```mermaid")) {
            await page.evaluate(async () => {
                if (window.mermaid) {
                    try {
                        await window.mermaid.run();
                    } catch (e) {
                        console.error("Mermaid run error:", e);
                    }
                }
            }).catch(() => {});

            // Brief pause to allow SVG rendering
            await new Promise(r => setTimeout(r, 600));
        }

        const showPageNumbers = options.showPageNumbers !== false;
        const showHeader = Boolean(options.showHeader && options.title);

        const margin = options.margin || {
            top: "20mm",
            bottom: "20mm",
            left: "20mm",
            right: "20mm"
        };

        const pdfBuffer = await page.pdf({
            path: options.outputPath || undefined,
            format: options.format || "A4",
            landscape: Boolean(options.orientation === "landscape"),
            printBackground: options.printBackground !== false,
            displayHeaderFooter: showPageNumbers || showHeader,
            headerTemplate: showHeader ? `
              <div style="font-size: 8pt; font-family: -apple-system, sans-serif; width: 100%; text-align: right; padding-right: 20mm; color: #888;">
                <span>${escapeHtml(options.title)}</span>
              </div>` : '<div></div>',
            footerTemplate: showPageNumbers ? `
              <div style="font-size: 8pt; font-family: -apple-system, sans-serif; width: 100%; text-align: center; color: #888;">
                <span>Sahifa <span class="pageNumber"></span> / <span class="totalPages"></span></span>
              </div>` : '<div></div>',
            margin: {
                top: margin.top || "20mm",
                bottom: margin.bottom || "20mm",
                left: margin.left || "20mm",
                right: margin.right || "20mm"
            }
        });

        return pdfBuffer;
    } finally {
        if (browser) {
            await browser.close().catch(() => {});
        }
    }
}

module.exports = {
    convertMarkdownToPdf,
    buildHtmlDocument,
    createMarkedParser
};
