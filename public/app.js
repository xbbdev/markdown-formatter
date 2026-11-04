document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const markdownInput = document.getElementById("markdown-input");
  const previewContent = document.getElementById("preview-content");
  const previewContainer = document.getElementById("preview-container");
  const docFilename = document.getElementById("doc-filename");
  const optFormat = document.getElementById("opt-format");
  const optOrientation = document.getElementById("opt-orientation");
  const optMargin = document.getElementById("opt-margin");
  const optTheme = document.getElementById("opt-theme");
  const optPageNumbers = document.getElementById("opt-page-numbers");
  const optHeader = document.getElementById("opt-header");
  const optMermaid = document.getElementById("opt-mermaid");
  const hljsThemeLink = document.getElementById("hljs-theme-link");

  const btnGenerate = document.getElementById("btn-generate");
  const btnLoadSample = document.getElementById("btn-load-sample");
  const btnClear = document.getElementById("btn-clear");
  const btnHistory = document.getElementById("btn-history");
  const btnCloseModal = document.getElementById("btn-close-modal");
  const btnSyncScroll = document.getElementById("btn-sync-scroll");

  const statWords = document.getElementById("stat-words");
  const statChars = document.getElementById("stat-chars");
  const statLines = document.getElementById("stat-lines");
  const historyCount = document.getElementById("history-count");

  const historyModal = document.getElementById("history-modal");
  const historyList = document.getElementById("history-list");
  const historySearch = document.getElementById("history-search");
  const loadingOverlay = document.getElementById("loading-overlay");
  const toastContainer = document.getElementById("toast-container");

  const tabButtons = document.querySelectorAll(".tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const fileDropzone = document.getElementById("file-dropzone");
  const fileInput = document.getElementById("file-input");
  const uploadFileInfo = document.getElementById("upload-file-info");
  const uploadFilename = document.getElementById("upload-filename");
  const uploadFilesize = document.getElementById("upload-filesize");
  const resizer = document.getElementById("resizer");
  const paneEditor = document.querySelector(".pane-editor");

  let syncScrollActive = true;
  let allHistoryItems = [];
  let renderDebounceTimer = null;

  // Initialize Mermaid in browser
  if (window.mermaid) {
    try {
      mermaid.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose"
      });
    } catch (e) {
      console.warn("Mermaid init warning:", e);
    }
  }

  // Setup Marked renderer with syntax highlighting & Mermaid
  function setupMarked() {
    if (typeof marked === "undefined") {
      console.error("Marked library is not loaded!");
      return;
    }

    try {
      const markedRenderer = new marked.Renderer();
      markedRenderer.code = function(token, langArg) {
        let code = "";
        let lang = "";

        if (typeof token === "object" && token !== null) {
          code = token.text || "";
          lang = (token.lang || "").trim();
        } else {
          code = String(token || "");
          lang = String(langArg || "").trim();
        }

        if (optMermaid && optMermaid.checked && lang === "mermaid") {
          return `<div class="mermaid">${code}</div>\n`;
        }

        if (lang && window.hljs && typeof hljs.getLanguage === "function" && hljs.getLanguage(lang)) {
          try {
            const highlighted = hljs.highlight(code, { language: lang }).value;
            return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>\n`;
          } catch (e) {}
        }

        if (window.hljs && typeof hljs.highlightAuto === "function") {
          try {
            const auto = hljs.highlightAuto(code).value;
            return `<pre><code class="hljs">${auto}</code></pre>\n`;
          } catch (e) {}
        }

        const safeCode = code
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;");
        return `<pre><code>${safeCode}</code></pre>\n`;
      };

      if (typeof marked.use === "function") {
        marked.use({ renderer: markedRenderer });
      }
    } catch (err) {
      console.warn("Custom marked renderer warning:", err);
    }
  }

  setupMarked();

  // Update Live Preview
  async function updatePreview() {
    if (!markdownInput || !previewContent) return;
    const text = markdownInput.value;
    updateStats(text);

    if (!text.trim()) {
      previewContent.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 60px 20px;">
        <h3>Matn kiritilmagan</h3>
        <p>Chap tarafdagi muharrirga Markdown yozing, fayl yuklang yoki faylni sudrab tashlang.</p>
      </div>`;
      return;
    }

    try {
      let html = "";
      if (typeof marked !== "undefined") {
        if (typeof marked.parse === "function") {
          html = marked.parse(text);
        } else if (typeof marked === "function") {
          html = marked(text);
        }
      }

      if (!html) {
        previewContent.textContent = text;
        return;
      }

      previewContent.innerHTML = html;

      // Render Mermaid if checked
      if (optMermaid && optMermaid.checked && window.mermaid) {
        const mermaidElements = previewContent.querySelectorAll(".mermaid");
        if (mermaidElements.length > 0) {
          try {
            await mermaid.run({ nodes: mermaidElements });
          } catch (err) {
            console.warn("Mermaid preview render warning:", err);
          }
        }
      }
    } catch (e) {
      console.error("Preview render error:", e);
      previewContent.innerHTML = `<div style="color: var(--danger-color); padding: 20px;">
        <strong>Xatolik yuz berdi:</strong> ${e.message}
      </div>`;
    }
  }

  function debouncedUpdatePreview() {
    clearTimeout(renderDebounceTimer);
    renderDebounceTimer = setTimeout(updatePreview, 100);
  }

  // Text Stats
  function updateStats(text) {
    if (!statWords || !statChars || !statLines) return;
    const chars = text.length;
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text ? text.split("\n").length : 0;

    statWords.textContent = `${words.toLocaleString()} so'z`;
    statChars.textContent = `${chars.toLocaleString()} belgi`;
    statLines.textContent = `${lines.toLocaleString()} qator`;
  }

  // Event Listeners for Editor
  markdownInput.addEventListener("input", debouncedUpdatePreview);
  markdownInput.addEventListener("paste", () => setTimeout(updatePreview, 30));
  markdownInput.addEventListener("change", updatePreview);
  markdownInput.addEventListener("keyup", debouncedUpdatePreview);

  // Sync scroll
  if (btnSyncScroll) {
    btnSyncScroll.addEventListener("click", () => {
      syncScrollActive = !syncScrollActive;
      btnSyncScroll.classList.toggle("active", syncScrollActive);
    });
  }

  markdownInput.addEventListener("scroll", () => {
    if (!syncScrollActive || !previewContainer) return;
    const maxScrollEditor = markdownInput.scrollHeight - markdownInput.clientHeight;
    if (maxScrollEditor > 0) {
      const percentage = markdownInput.scrollTop / maxScrollEditor;
      previewContainer.scrollTop = percentage * (previewContainer.scrollHeight - previewContainer.clientHeight);
    }
  });

  // Tab switching
  tabButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      tabButtons.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add("active");
    });
  });

  // Theme change
  if (optTheme) {
    optTheme.addEventListener("change", () => {
      const theme = optTheme.value;
      if (theme === "github-dark") {
        document.body.classList.add("theme-dark");
        if (hljsThemeLink) {
          hljsThemeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css";
        }
        if (window.mermaid) {
          try { mermaid.initialize({ theme: "dark" }); } catch (e) {}
        }
      } else {
        document.body.classList.remove("theme-dark");
        if (hljsThemeLink) {
          hljsThemeLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github.min.css";
        }
        if (window.mermaid) {
          try { mermaid.initialize({ theme: "default" }); } catch (e) {}
        }
      }
      updatePreview();
    });
  }

  if (optMermaid) {
    optMermaid.addEventListener("change", updatePreview);
  }

  // Universal File Reader (supports dropping anywhere or selecting via input)
  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      markdownInput.value = content;
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      if (docFilename) {
        docFilename.value = baseName;
      }

      // Update upload tab info
      if (uploadFilename && uploadFilesize && uploadFileInfo) {
        uploadFilename.textContent = file.name;
        uploadFilesize.textContent = `(${(file.size / 1024).toFixed(1)} KB)`;
        uploadFileInfo.classList.remove("hidden");
      }

      // Automatically switch back to the editor tab so user immediately sees the text
      if (tabButtons && tabButtons[0]) {
        tabButtons[0].click();
      }

      // Immediate live preview update
      updatePreview();
      showToast(`"${file.name}" muvaffaqiyatli yuklandi!`, "success");
    };
    reader.onerror = () => {
      showToast("Faylni o'qishda xatolik yuz berdi!", "error");
    };
    reader.readAsText(file);
  }

  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length) {
        handleFile(e.target.files[0]);
      }
    });
  }

  // Prevent default window dragover/drop to avoid browser opening file
  window.addEventListener("dragover", (e) => {
    e.preventDefault();
  }, false);

  window.addEventListener("drop", (e) => {
    e.preventDefault();
  }, false);

  // Targets where files can be dropped
  const dropTargets = [
    document.body,
    markdownInput,
    fileDropzone,
    paneEditor,
    previewContainer
  ];

  dropTargets.forEach(target => {
    if (!target) return;

    target.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (fileDropzone) fileDropzone.classList.add("dragover");
    });

    target.addEventListener("dragleave", (e) => {
      e.preventDefault();
      if (fileDropzone) fileDropzone.classList.remove("dragover");
    });

    target.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (fileDropzone) fileDropzone.classList.remove("dragover");
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  });

  // Load sample markdown
  if (btnLoadSample) {
    btnLoadSample.addEventListener("click", async () => {
      try {
        showToast("Namuna yuklanmoqda...", "info");
        const res = await fetch("/api/sample");
        if (!res.ok) throw new Error("Namunani yuklab bo'lmadi");
        const data = await res.json();
        markdownInput.value = data.content;
        if (docFilename) docFilename.value = "veolia-hujjat";
        updatePreview();
        showToast("README namunasi muvaffaqiyatli yuklandi!", "success");
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  // Clear editor
  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (confirm("Haqiqatan ham matnni tozalamoqchimisiz?")) {
        markdownInput.value = "";
        if (docFilename) docFilename.value = "hujjat";
        updatePreview();
        showToast("Muharrir tozalandi", "info");
      }
    });
  }

  // Generate PDF
  if (btnGenerate) {
    btnGenerate.addEventListener("click", async () => {
      const markdown = markdownInput.value.trim();
      if (!markdown) {
        showToast("Iltimos, avval Markdown matnini kiriting!", "error");
        return;
      }

      const filename = (docFilename && docFilename.value.trim()) || "document";
      const payload = {
        markdown,
        filename,
        format: optFormat ? optFormat.value : "A4",
        orientation: optOrientation ? optOrientation.value : "portrait",
        marginPreset: optMargin ? optMargin.value : "normal",
        theme: optTheme ? optTheme.value : "github-light",
        showPageNumbers: optPageNumbers ? optPageNumbers.checked : true,
        showHeader: optHeader ? optHeader.checked : false,
        renderMermaid: optMermaid ? optMermaid.checked : true,
        title: filename
      };

      if (loadingOverlay) loadingOverlay.classList.remove("hidden");
      btnGenerate.disabled = true;

      try {
        const response = await fetch("/api/convert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.details || errorData.error || "Konvertatsiyada xatolik");
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${filename}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        showToast(`"${filename}.pdf" muvaffaqiyatli yuklab olindi!`, "success");
        loadHistoryCount();
      } catch (err) {
        console.error(err);
        showToast(err.message, "error");
      } finally {
        if (loadingOverlay) loadingOverlay.classList.add("hidden");
        btnGenerate.disabled = false;
      }
    });
  }

  // Resizer dragging
  if (resizer && paneEditor) {
    let isDragging = false;
    resizer.addEventListener("mousedown", () => {
      isDragging = true;
      resizer.classList.add("dragging");
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      const workspace = document.querySelector(".app-workspace");
      if (!workspace) return;
      const containerWidth = workspace.clientWidth;
      const newLeftWidth = Math.max(280, Math.min(e.clientX, containerWidth - 280));
      paneEditor.style.flex = "none";
      paneEditor.style.width = `${newLeftWidth}px`;
    });

    window.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        resizer.classList.remove("dragging");
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    });
  }

  // History Modal
  if (btnHistory && historyModal) {
    btnHistory.addEventListener("click", () => {
      historyModal.classList.remove("hidden");
      loadHistoryList();
    });
  }

  if (btnCloseModal && historyModal) {
    btnCloseModal.addEventListener("click", () => {
      historyModal.classList.add("hidden");
    });
  }

  if (historyModal) {
    historyModal.addEventListener("click", (e) => {
      if (e.target === historyModal) historyModal.classList.add("hidden");
    });
  }

  async function loadHistoryCount() {
    if (!historyCount) return;
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (data.items) {
        historyCount.textContent = data.items.length;
        allHistoryItems = data.items;
      }
    } catch (e) {}
  }

  async function loadHistoryList() {
    if (!historyList) return;
    try {
      historyList.innerHTML = `<div class="loading-spinner-small">Tarix yuklanmoqda...</div>`;
      const res = await fetch("/api/history");
      const data = await res.json();
      allHistoryItems = data.items || [];
      renderHistoryItems(allHistoryItems);
    } catch (e) {
      historyList.innerHTML = `<div style="color:var(--danger-color); padding: 10px;">Yuklashda xatolik yuz berdi.</div>`;
    }
  }

  function renderHistoryItems(items) {
    if (!historyList) return;
    if (!items || !items.length) {
      historyList.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 30px;">
        Hech qanday saqlangan PDF topilmadi.
      </div>`;
      return;
    }

    historyList.innerHTML = items.map(item => {
      const sizeKB = (item.size / 1024).toFixed(1);
      const dateStr = new Date(item.lastModified).toLocaleString();
      return `
        <div class="history-item">
          <div class="history-item-left">
            <div class="history-icon">📄</div>
            <div>
              <div class="history-name">${escapeHtml(item.name)}</div>
              <div class="history-meta">${sizeKB} KB • Joylashuv: [${item.folder}] • ${dateStr}</div>
            </div>
          </div>
          <div class="history-actions">
            <a href="${item.downloadUrl}" target="_blank" class="btn btn-secondary btn-sm" title="Brauzerda ko'rish">
              👁️ Ko'rish
            </a>
            <a href="${item.downloadUrl}" download="${item.name}" class="btn btn-primary btn-sm" title="Yuklab olish">
              ⬇️ Yuklab olish
            </a>
          </div>
        </div>
      `;
    }).join("");
  }

  if (historySearch) {
    historySearch.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      const filtered = allHistoryItems.filter(item => item.name.toLowerCase().includes(q));
      renderHistoryItems(filtered);
    });
  }

  // Toast Notification
  function showToast(message, type = "info") {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "error") icon = "⚠️";
    toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // Initialize immediately
  updatePreview();
  loadHistoryCount();
});
