# 📄 Markdown to PDF Studio

<p align="center">
  <b>Professional Markdown to PDF converter with interactive Web UI Studio, live preview, Puppeteer headless Chromium rendering, Highlight.js syntax highlighting, and native Mermaid.js diagram support.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat&logo=node.js" alt="Node Version">
  <img src="https://img.shields.io/badge/Express-5.x-000000?style=flat&logo=express" alt="Express">
  <img src="https://img.shields.io/badge/Puppeteer-25.x-40B5A4?style=flat&logo=puppeteer" alt="Puppeteer">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License">
</p>

---

## 🌟 Asosiy Imkoniyatlar (Key Features)

- ⚡ **Ikki panelli Jonli Ko'rik (Dual-Pane Live Preview):** Markdown matnini tahrirlash jarayonida o'ng panelda bir vaqtning o'zida semantik HTML, sintaksis ranglari va diagrammalar chiziladi.
- 📊 **Mermaid.js Diagrammalari:** `sequenceDiagram`, `flowchart`, `graph` va boshqa diagrammalarni PDF-ga yuqori aniqlikdagi vektorli SVG sifatida chizadi.
- 🎨 **Syntax Highlighting (Kodlarni Ranglash):** Highlight.js orqali JavaScript, TypeScript, Python, Go, Rust, SQL, Bash va boshqa o'nlab tillar uchun GitHub stillari.
- 🖨️ **Chop Etishga Mos PDF (Print CSS):** Sarlavhalar va kod bloklari sahifalar oralig'ida noqulay bo'linib ketmasligi uchun `page-break-inside: avoid;` qoidalari o'rnatilgan.
- ⚙️ **Moslashuvchan PDF Sozlamalari:**
  - **Qog'oz formatlari:** `A4`, `A3`, `Letter`, `Legal`.
  - **Yo'nalish:** Portret (tik) va Albom (yotiq).
  - **Hoshiyalar (Margins):** Normal (20mm), Kichik (10mm), Keng (30mm).
  - **Dizayn mavzulari:** GitHub Light (oq) va GitHub Dark (qorong'i).
  - **Kolontitullar:** Sahifa raqamlari (`Sahifa 1 / N`) va yuqori hujjat sarlavhasi.
- 🚀 **Ikki Xil Ishlash Rejimi (Dual Mode):**
  1. **Web UI:** Brauzerda qulay studio interfeysi (`npm start`).
  2. **CLI Utility:** Konsoldan tezkor konvertatsiya (`node index.js input.md output.pdf`).
- 📁 **Universal Drag & Drop:** Istalgan `.md` faylni brauzer oynasiga sudrab tashlash orqali yuklash.
- 📚 **PDF Tarixi va Arxiv:** Yaratilgan PDF fayllarni bir bosishda brauzerda ko'rish yoki yuklab olish.

---

## 🚀 O'rnatish va Ishga Tushirish (Quick Start)

### 1. Loyihani yuklab olish va qaramliklarni o'rnatish
```bash
git clone https://github.com/xbbdev/markdown-formatter.git
cd markdown-formatter
npm install
```

### 2. Web UI Studio-ni ishga tushirish
```bash
npm start
```
Brauzerda oching: **[http://localhost:3000](http://localhost:3000)**

---

## 💻 CLI Orqali Ishlatish (Command Line Usage)

Fayllarni serverni yoqmasdan, to'g'ridan-to'g'ri buyruqlar satri orqali PDF-ga aylantirish mumkin:

```bash
# Standart konvertatsiya (hujjat.md -> hujjat.pdf)
node index.js hujjat.md

# Chiqish fayli nomini ko'rsatgan holda
node index.js sample.md mening-hujjatim.pdf
```

---

## 📂 Loyiha Tuzilmasi (Project Structure)

```
markdown-to-pdf/
├── .agent               # Universal AI agent qoidalari va loyiha konteksti
├── .agent.md            # .agent nusxasi
├── .gitignore           # Git uchun istisno fayllar ro'yxati
├── converter.js         # Asosiy konvertatsiya moduli (Puppeteer + Marked + Mermaid)
├── server.js            # Express.js REST API va veb-server
├── index.js             # CLI va Web UI ishga tushiruvchi kirish nuqtasi
├── package.json         # Loyiha qaramliklari va metama'lumotlari
├── README.md            # Ushbu hujjat
├── sample.md            # Sinov uchun namunaviy texnik hujjat (Mermaid va kodlar bilan)
├── outputs/             # Yangi generatsiya qilingan PDF fayllar katalogi
├── all/                 # Mavjud arxiv PDF hujjatlari
└── public/              # Web UI frontend resurslari
    ├── index.html       # Studio foydalanuvchi interfeysi
    ├── style.css        # Responsiv dizayn va stillar
    ├── app.js           # Jonli ko'rik, drag-and-drop va skroll logikasi
    └── vendor/          # Mahalliy mustaqil kutubxonalar (marked.min.js)
```

---

## 🔌 REST API Qo'llanmasi

Server quyidagi endpointlarni taqdim etadi:

| Metod | Manzil | Tavsif |
| :--- | :--- | :--- |
| `GET` | `/` | Web UI Studio interfeysi |
| `POST` | `/api/convert` | JSON parametrlar (`markdown`, `filename`, `format`, va h.k.) asosida PDF generatsiya qilib yuklab beradi |
| `POST` | `/api/upload` | Multipart form-data orqali `.md` faylni qabul qilib, PDF qaytaradi |
| `GET` | `/api/sample` | `sample.md` namunaviy matnini qaytaradi |
| `GET` | `/api/history` | Yaratilgan va arxivdagi barcha PDF fayllar ro'yxati |
| `GET` | `/api/pdf/:folder/:filename` | Mavjud PDF faylni brauzerda inline ko'rish yoki yuklab olish |

---

## 🛠 Texnologiyalar

- **Runtime:** Node.js `>= 18.0.0`
- **Backend:** Express.js, Multer
- **Renderer:** Puppeteer (Headless Chromium)
- **Parser:** Marked v18
- **Syntax Highlighting:** Highlight.js v11
- **Diagrams:** Mermaid.js v10

---

## 📄 Litsenziya

Ushbu loyiha [MIT](LICENSE) litsenziyasi asosida tarqatiladi.
