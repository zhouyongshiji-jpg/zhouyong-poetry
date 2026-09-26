/**
 * ==========================================================================
 * 《周庸诗集》- 数字诗馆主控制器 (js/app.js)
 * 功能：数据驱动、适老化字号持久化、横竖排版切换、Web Speech 朗诵、PWA 离线
 * ==========================================================================
 */

(function () {
  // 全集版本与编校日期（全站单一真实来源）
  const APP_VERSION = "v1.9.0";
  const EDITION_DATE = "2026-09-20";

  // 全局应用状态
  const state = {
    volumes: [],
    poems: [],
    currentPoemIndex: 0,
    fontSize: localStorage.getItem("zy_font_size") || "standard", // standard | large | xlarge
    layoutMode: localStorage.getItem("zy_layout_mode") || "horizontal", // horizontal | vertical
    theme: localStorage.getItem("zy_theme") || "light", // light | dark
    isSpeaking: false,
    synth: window.speechSynthesis || null,
    currentUtterance: null
  };

  // DOM 元素缓存
  let el = {};

  /**
   * 应用初始化入口
   */
  async function init() {
    cacheDOMElements();
    applyStoredPreferences();
    setupEventListeners();
    await loadData();
    registerServiceWorker();
    initPWAInstall();
  }

  function cacheDOMElements() {
    el = {
      appContainer: document.querySelector(".app-container"),
      sidebarToc: document.getElementById("sidebarToc"),
      sidebarBackdrop: document.getElementById("sidebarBackdrop"),
      btnToggleToc: document.getElementById("btnToggleToc"),
      btnCloseToc: document.getElementById("btnCloseToc"),
      
      // 适老字号开关
      btnFontStandard: document.getElementById("btnFontStandard"),
      btnFontLarge: document.getElementById("btnFontLarge"),
      btnFontXLarge: document.getElementById("btnFontXLarge"),
      
      // 排版与主题开关
      btnToggleLayout: document.getElementById("btnToggleLayout"),
      btnToggleTheme: document.getElementById("btnToggleTheme"),
      
      // 检索
      searchInput: document.getElementById("searchInput"),
      searchClearBtn: document.getElementById("searchClearBtn"),
      searchResultsContainer: document.getElementById("searchResultsContainer"),
      
      // 诗页渲染容器
      poemPageContainer: document.getElementById("poemPageContainer"),
      btnPrevPoem: document.getElementById("btnPrevPoem"),
      btnNextPoem: document.getElementById("btnNextPoem"),
      pageIndicator: document.getElementById("pageIndicator"),
      
      // 听诗与分享
      btnTTS: document.getElementById("btnTTS"),
      btnShareCard: document.getElementById("btnShareCard"),
      
      // 卷目导航列表
      volumesNavList: document.getElementById("volumesNavList"),

      // 全帙志与桌面安装
      btnHeaderChronicle: document.getElementById("btnHeaderChronicle"),
      btnTocChronicle: document.getElementById("btnTocChronicle"),
      btnTocInstallApp: document.getElementById("btnTocInstallApp"),
      chronicleModal: document.getElementById("chronicleModal"),
      chronicleContentArea: document.getElementById("chronicleContentArea"),
      btnCloseChronicleModal: document.getElementById("btnCloseChronicleModal"),
      btnCloseChronicleBottom: document.getElementById("btnCloseChronicleBottom"),
      btnCopyWechatText: document.getElementById("btnCopyWechatText"),

      // 回顶浮标
      btnBackToTop: document.getElementById("btnBackToTop")
    };
  }

  /**
   * 加载本地结构化 JSON 数据
   */
  async function loadData() {
    try {
      const [volRes, poemsRes] = await Promise.all([
        fetch("data/volumes.json"),
        fetch("data/poems.json")
      ]);

      state.volumes = await volRes.json();
      state.poems = await poemsRes.json();

      // 构建检索索引
      if (window.PoetrySearch) {
        window.PoetrySearch.buildIndex(state.poems);
      }

      // 路由优先级：有效 Hash > 上次阅读记录 > 默认第一首 (0)
      let resolvedIndex = 0;
      let matchedByHash = false;

      const initialHash = window.location.hash;
      if (initialHash.startsWith("#/poem/")) {
        const targetId = initialHash.replace(/^#\/poem\//, "").split(/[?#&]/)[0].replace(/\/+$/, "");
        const targetIdx = state.poems.findIndex(p => p.id === targetId);
        if (targetIdx !== -1) {
          resolvedIndex = targetIdx;
          matchedByHash = true;
        }
      }

      // 若未指定特定诗篇 Hash，则尝试恢复上次阅读位置
      if (!matchedByHash) {
        try {
          const lastReadId = localStorage.getItem("zy_last_read_poem_id");
          if (lastReadId) {
            const lastIdx = state.poems.findIndex(p => p.id === lastReadId);
            if (lastIdx !== -1) {
              resolvedIndex = lastIdx;
            }
          }
        } catch (e) {
          console.warn("读取本地阅读记忆失败:", e);
        }
      }

      state.currentPoemIndex = resolvedIndex;

      renderSidebar();
      renderCurrentPoem();
    } catch (err) {
      console.error("加载诗集数据失败:", err);
      if (el.poemPageContainer) {
        el.poemPageContainer.innerHTML = `
          <div style="padding: 40px; text-align: center;">
            <p style="color: var(--vermilion); font-size: 20px;">诗卷加载稍有停滞</p>
            <p style="color: var(--text-muted); margin-top: 10px;">若是在本地直接双击打开，请使用静态服务器（如 VS Code Live Server 或 python -m http.server）预览。</p>
          </div>
        `;
      }
    }
  }

  /**
   * 恢复本地保存的偏好设置
   */
  function applyStoredPreferences() {
    // 1. 字号
    setFontSize(state.fontSize, false);

    // 2. 排版 (横排/竖排)
    setLayoutMode(state.layoutMode, false);

    // 3. 主题 (宣纸暖玉 / 墨玉夜读)
    setTheme(state.theme, false);
  }

  /**
   * 切换字号 (适老 70+ 核心设计)
   */
  function setFontSize(size, save = true) {
    state.fontSize = size;
    document.body.classList.remove("font-standard", "font-large", "font-xlarge");
    if (size !== "standard") {
      document.body.classList.add(`font-${size}`);
    }

    [el.btnFontStandard, el.btnFontLarge, el.btnFontXLarge].forEach(btn => {
      if (!btn) return;
      btn.classList.toggle("active", btn.dataset.size === size);
    });

    if (save) {
      localStorage.setItem("zy_font_size", size);
    }
  }

  /**
   * 切换横排 / 竖排古籍模式
   */
  function setLayoutMode(mode, save = true) {
    state.layoutMode = mode;
    if (!el.poemPageContainer) return;

    el.poemPageContainer.classList.remove("mode-horizontal", "mode-vertical");
    el.poemPageContainer.classList.add(`mode-${mode}`);

    if (el.btnToggleLayout) {
      el.btnToggleLayout.innerHTML = mode === "vertical" 
        ? `<span class="icon">📑</span><span>横排</span>`
        : `<span class="icon">📜</span><span>竖排</span>`;
    }

    if (save) {
      localStorage.setItem("zy_layout_mode", mode);
    }
  }

  /**
   * 切换日间宣纸 / 夜读墨玉模式
   */
  function setTheme(theme, save = true) {
    state.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);

    if (el.btnToggleTheme) {
      el.btnToggleTheme.innerHTML = theme === "dark" ? "☀️" : "🌙";
      el.btnToggleTheme.title = theme === "dark" ? "切换为宣纸日读" : "切换为墨玉夜读";
    }

    if (save) {
      localStorage.setItem("zy_theme", theme);
    }
  }

  /**
   * 渲染侧边栏卷目和诗题树（支持按卷折叠/展开与当前卷自动联动）
   */
  function renderSidebar() {
    if (!el.volumesNavList) return;
    el.volumesNavList.innerHTML = "";

    const currentPoem = state.poems[state.currentPoemIndex];
    let lastPart = null;

    state.volumes.forEach((vol, volIndex) => {
      // 渲染大编分割标（前编·行吟岁月 / 续编·晚晴沧桑）
      if (vol.part && vol.part !== lastPart) {
        lastPart = vol.part;
        const partDivider = document.createElement("div");
        partDivider.className = "sidebar-part-header";
        partDivider.innerHTML = `<span class="part-icon">📖</span><span class="part-title">${vol.part}</span>`;
        el.volumesNavList.appendChild(partDivider);
      }

      const volPoems = state.poems.filter(p => p.volumeId === vol.id || p.volume.includes(vol.name.slice(0, 4)));
      
      const volGroup = document.createElement("details");
      volGroup.className = "volume-group";
      volGroup.dataset.volId = vol.id;

      // 默认展开当前诗作所在卷；若初次未定位则默认展开第一卷
      const isOpen = currentPoem ? (currentPoem.volumeId === vol.id) : (volIndex === 0);
      volGroup.open = isOpen;

      volGroup.innerHTML = `
        <summary class="volume-header" data-vol-id="${vol.id}" title="点击折叠或展开本卷">
          <span class="volume-header-left">
            <span class="volume-arrow">▶</span>
            <span class="volume-title-text">${vol.name}</span>
          </span>
          <span class="volume-badge">${volPoems.length} 首</span>
        </summary>
        <ul class="poem-list" id="list-${vol.id}">
          ${volPoems.map((poem, pIdx) => `
            <li class="poem-nav-item ${state.poems[state.currentPoemIndex]?.id === poem.id ? "active" : ""}" 
                data-poem-id="${poem.id}" title="${poem.title} (${poem.genre || ''})">
              <span class="poem-nav-index">${String(pIdx + 1).padStart(2, "0")}</span>
              <span class="poem-nav-title">${poem.title}</span>
              <span class="poem-nav-genre">${poem.genre || ""}</span>
            </li>
          `).join("")}
        </ul>
      `;

      el.volumesNavList.appendChild(volGroup);
    });

    // 绑定侧栏诗题点击
    el.volumesNavList.querySelectorAll(".poem-nav-item").forEach(item => {
      item.addEventListener("click", () => {
        const poemId = item.dataset.poemId;
        const targetIndex = state.poems.findIndex(p => p.id === poemId);
        if (targetIndex !== -1) {
          navigateToPoem(targetIndex);
          closeSidebar();
        }
      });
    });
  }

  /**
   * 渲染当前诗作
   */
  function renderCurrentPoem() {
    if (!state.poems.length || !el.poemPageContainer) return;

    stopSpeaking();

    const poem = state.poems[state.currentPoemIndex];
    window.location.hash = `#/poem/${poem.id}`;

    // 记录阅读位置（仅保存稳定的诗作 ID，静默容错）
    try {
      localStorage.setItem("zy_last_read_poem_id", poem.id);
    } catch (e) {}

    // 计算卷内序号与全帙编号
    const currentVolId = poem.volumeId || poem.volume;
    const volPoems = state.poems.filter(p => (p.volumeId && p.volumeId === currentVolId) || p.volume === poem.volume);
    const inVolIdx = volPoems.findIndex(p => p.id === poem.id);
    const inVolNum = inVolIdx !== -1 ? inVolIdx + 1 : 1;
    const inVolTotal = volPoems.length || 1;
    const globalNum = String(state.currentPoemIndex + 1).padStart(4, "0");

    // 更新翻页按钮状态与全集总诗作进度 (如 15 / 1363)
    if (el.btnPrevPoem) el.btnPrevPoem.disabled = state.currentPoemIndex === 0;
    if (el.btnNextPoem) el.btnNextPoem.disabled = state.currentPoemIndex === state.poems.length - 1;
    if (el.pageIndicator) {
      el.pageIndicator.textContent = `${state.currentPoemIndex + 1} / ${state.poems.length}`;
      el.pageIndicator.title = `全集第 ${state.currentPoemIndex + 1} 首 / 共 ${state.poems.length} 首（本卷第 ${inVolNum} / ${inVolTotal} 首）`;
    }

    // 更新侧边栏高亮与所属卷展开状态
    document.querySelectorAll(".poem-nav-item").forEach(item => {
      const isCurrent = item.dataset.poemId === poem.id;
      item.classList.toggle("active", isCurrent);
      if (isCurrent) {
        const parentVol = item.closest(".volume-group");
        if (parentVol && !parentVol.open) {
          parentVol.open = true;
        }
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    });

    // 生成朱砂印章 SVG
    const sealHtml = window.SealGenerator 
      ? window.SealGenerator.createSealSVG({ text: "周庸之印", size: 68, style: "yin" })
      : "";

    // 组装诗句（支持分段题标与智能半句对仗切分，杜绝移动端中途断字）
    const stanzasHtml = poem.content.map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith("【其")) {
        return `<div class="poem-section-header">${trimmed}</div>`;
      }
      if (line.includes("，") || line.includes("；")) {
        const parts = line.split(/([，；])/);
        let formatted = "";
        for (let i = 0; i < parts.length; i += 2) {
          const text = parts[i];
          const punct = parts[i + 1] || "";
          if (text) {
            formatted += `<span class="hemistich">${text}${punct}</span>`;
          }
        }
        return `<div class="poem-line">${formatted}</div>`;
      }
      return `<div class="poem-line"><span class="hemistich">${line}</span></div>`;
    }).join("");

    // 组装注释
    let notesHtml = "";
    if (poem.notes && poem.notes.length > 0) {
      notesHtml = `
        <div class="poem-notes">
          <div class="poem-notes-title">
            <span>🔖</span><span>笺注</span>
          </div>
          <ol>
            ${poem.notes.map(n => `<li>${n}</li>`).join("")}
          </ol>
        </div>
      `;
    }

    // 组装序言
    let prefaceHtml = "";
    if (poem.preface) {
      prefaceHtml = `
        <div class="poem-preface">
          <span class="preface-label">【题记】</span>${poem.preface}
        </div>
      `;
    }

    // 渲染整体诗页
    el.poemPageContainer.innerHTML = `
      <div class="poem-page-border">
        <div class="poem-page-content">
          <!-- 题头与属性 -->
          <div class="poem-meta-header">
            <div class="poem-meta-top-row">
              <div class="poem-volume-tag">${poem.volume || "集外诗选"} · 第 ${inVolNum} 首</div>
              <div class="poem-global-id" title="全集唯一典藏编号">〔全帙&nbsp;${globalNum}〕</div>
            </div>
            <h2 class="poem-title">${poem.title}</h2>
            ${poem.subtitle ? `<div class="poem-subtitle">${poem.subtitle}</div>` : ""}
            <div class="poem-submeta">
              ${poem.year ? `<span>${poem.year}年作</span>` : ""}
              ${poem.location ? `<span>${poem.location}</span>` : ""}
              ${poem.genre ? `<span>${poem.genre}</span>` : ""}
            </div>
          </div>

          <!-- 序言题记 -->
          ${prefaceHtml}

          <!-- 诗作正文 -->
          <div class="poem-body">
            <div class="poem-stanza">
              ${stanzasHtml}
            </div>
          </div>

          <!-- 笺注 -->
          ${notesHtml}

          <!-- 落款与文人朱砂印章 -->
          <div class="poem-colophon">
            <span class="colophon-text">周庸 题</span>
            <div class="seal-container" title="周庸之印·点击赏鉴">
              ${sealHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    // 触发平滑滚动至顶部
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function navigateToPoem(index) {
    if (index >= 0 && index < state.poems.length) {
      state.currentPoemIndex = index;
      renderCurrentPoem();
    }
  }

  /**
   * 听诗：Web Speech API 智能朗读 (70+ 长辈无障碍视力关怀)
   */
  function toggleSpeech() {
    if (!state.synth) {
      alert("您的浏览器暂不支持语音朗诵功能，建议使用微信或现代浏览器。");
      return;
    }

    if (state.isSpeaking) {
      stopSpeaking();
      return;
    }

    const poem = state.poems[state.currentPoemIndex];
    if (!poem) return;

    // 组装朗读文案：文雅停顿
    const textToSpeak = [
      poem.title,
      poem.subtitle || "",
      "周庸 作",
      poem.preface ? `题记。${poem.preface}` : "",
      poem.content.join("。")
    ].filter(Boolean).join("，");

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = "zh-CN";
    // 优先匹配温和沉稳的中文男声（更切合周老先生文人自述风格）
    const voices = state.synth.getVoices();
    const zhVoices = voices.filter(v => v.lang.includes("zh") || v.lang.includes("cmn") || v.name.includes("Chinese"));
    const maleVoice = zhVoices.find(v => /kangkang|yunxi|yunyang|yunjian|male|男|bo|danny/i.test(v.name));

    if (maleVoice) {
      utterance.voice = maleVoice;
    } else if (zhVoices.length > 0) {
      utterance.voice = zhVoices[0];
    }

    utterance.pitch = 0.95; // 音调微降，更显长者从容厚重
    utterance.rate = 0.82;  // 节奏舒缓，适合七绝长歌慢吟

    utterance.onstart = () => {
      state.isSpeaking = true;
      if (el.btnTTS) {
        el.btnTTS.classList.add("playing");
        el.btnTTS.innerHTML = `<span>🔊</span><span>停诵</span>`;
      }
    };

    utterance.onend = () => {
      stopSpeaking();
    };

    utterance.onerror = () => {
      stopSpeaking();
    };

    state.currentUtterance = utterance;
    state.synth.speak(utterance);
  }

  function stopSpeaking() {
    if (state.synth && state.isSpeaking) {
      state.synth.cancel();
      state.isSpeaking = false;
      if (el.btnTTS) {
        el.btnTTS.classList.remove("playing");
        el.btnTTS.innerHTML = `<span>🎙️</span><span>听诗</span>`;
      }
    }
  }

  /**
   * 搜索与即打即搜
   */
  function handleSearch(query) {
    if (!window.PoetrySearch) return;

    if (!query || !query.trim()) {
      if (el.searchClearBtn) el.searchClearBtn.style.display = "none";
      if (el.searchResultsContainer) el.searchResultsContainer.style.display = "none";
      return;
    }

    if (el.searchClearBtn) el.searchClearBtn.style.display = "block";

    const results = window.PoetrySearch.search(query);
    renderSearchResults(results, query);
  }

  function renderSearchResults(results, query) {
    if (!el.searchResultsContainer) return;
    el.searchResultsContainer.style.display = "block";

    if (results.length === 0) {
      el.searchResultsContainer.innerHTML = `
        <div style="padding: 16px; text-align: center; color: var(--text-muted);">
          未查得与“${query}”相关的诗作，可尝试拼音缩写或年代。
        </div>
      `;
      return;
    }

    el.searchResultsContainer.innerHTML = `
      <div style="padding: 8px 14px; font-size: 13px; color: var(--text-muted); border-bottom: 1px solid var(--border-color);">
        为您觅得 ${results.length} 首诗篇：
      </div>
      <div class="search-results-list">
        ${results.map(({ poem, matchedSnippet }) => `
          <div class="search-result-item" data-poem-id="${poem.id}">
            <div class="result-title">${poem.title} <span class="result-badge">${poem.year || ""}</span></div>
            ${matchedSnippet ? `<div class="result-snippet">${matchedSnippet}</div>` : ""}
          </div>
        `).join("")}
      </div>
    `;

    el.searchResultsContainer.querySelectorAll(".search-result-item").forEach(item => {
      item.addEventListener("click", () => {
        const id = item.dataset.poemId;
        const index = state.poems.findIndex(p => p.id === id);
        if (index !== -1) {
          navigateToPoem(index);
          el.searchResultsContainer.style.display = "none";
        }
      });
    });
  }

  /**
   * 路由与 Hash 监听
   */
  function initRouter() {
    window.addEventListener("hashchange", handleHashChange);
    handleHashChange();
  }

  function handleHashChange() {
    const hash = window.location.hash;
    if (hash.startsWith("#/poem/")) {
      const id = hash.replace(/^#\/poem\//, "").split(/[?#&]/)[0].replace(/\/+$/, "");
      const index = state.poems.findIndex(p => p.id === id);
      if (index !== -1 && index !== state.currentPoemIndex) {
        state.currentPoemIndex = index;
        renderCurrentPoem();
      }
    }
  }

  /**
   * 注册事件监听器
   */
  function setupEventListeners() {
    // 适老字号开关
    if (el.btnFontStandard) el.btnFontStandard.onclick = () => setFontSize("standard");
    if (el.btnFontLarge) el.btnFontLarge.onclick = () => setFontSize("large");
    if (el.btnFontXLarge) el.btnFontXLarge.onclick = () => setFontSize("xlarge");

    // 排版与主题
    if (el.btnToggleLayout) {
      el.btnToggleLayout.onclick = () => {
        setLayoutMode(state.layoutMode === "horizontal" ? "vertical" : "horizontal");
      };
    }

    if (el.btnToggleTheme) {
      el.btnToggleTheme.onclick = () => {
        setTheme(state.theme === "dark" ? "light" : "dark");
      };
    }

    // 翻页操作
    if (el.btnPrevPoem) el.btnPrevPoem.onclick = () => navigateToPoem(state.currentPoemIndex - 1);
    if (el.btnNextPoem) el.btnNextPoem.onclick = () => navigateToPoem(state.currentPoemIndex + 1);

    // 键盘左右箭头翻页与ESC退出弹窗
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeChronicleModal();
        if (window.CardExporter) window.CardExporter.closeCardModal();
        return;
      }
      if (e.key === "ArrowLeft") navigateToPoem(state.currentPoemIndex - 1);
      if (e.key === "ArrowRight") navigateToPoem(state.currentPoemIndex + 1);
      if ((e.key === "m" || e.key === "M") && !e.target.closest("input")) {
        if (el.sidebarToc && el.sidebarToc.classList.contains("open")) {
          closeSidebar();
        } else {
          openSidebar();
        }
      }
    });

    // 监听 Hash 变化（支持浏览器后退/前进与外部深度链接即时切换）
    window.addEventListener("hashchange", () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/poem/")) {
        const targetId = hash.replace(/^#\/poem\//, "").split(/[?#&]/)[0].replace(/\/+$/, "");
        const targetIdx = state.poems.findIndex(p => p.id === targetId);
        if (targetIdx !== -1 && targetIdx !== state.currentPoemIndex) {
          navigateToPoem(targetIdx);
        }
      }
    });

    // 朗读
    if (el.btnTTS) el.btnTTS.onclick = toggleSpeech;

    // 诗卡分享
    if (el.btnShareCard) {
      el.btnShareCard.onclick = () => {
        const poem = state.poems[state.currentPoemIndex];
        if (poem && window.CardExporter) {
          window.CardExporter.openCardModal(poem);
        }
      };
    }

    // 侧边栏抽屉移动端开闭
    if (el.btnToggleToc) el.btnToggleToc.onclick = openSidebar;
    if (el.btnCloseToc) el.btnCloseToc.onclick = closeSidebar;
    if (el.sidebarBackdrop) el.sidebarBackdrop.onclick = closeSidebar;

    // 搜索
    if (el.searchInput) {
      el.searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
    }
    if (el.searchClearBtn) {
      el.searchClearBtn.onclick = () => {
        el.searchInput.value = "";
        handleSearch("");
      };
    }

    // 点击页面其他区域关闭搜索下拉框
    document.addEventListener("click", (e) => {
      if (el.searchResultsContainer && !e.target.closest(".search-box-wrap")) {
        el.searchResultsContainer.style.display = "none";
      }
    });

    // 诗卡弹窗比例切换与关闭
    const cardModal = document.getElementById("cardModal");
    if (cardModal) {
      cardModal.querySelectorAll(".card-opt-btn").forEach(btn => {
        btn.onclick = () => {
          if (window.CardExporter) window.CardExporter.setRatio(btn.dataset.ratio);
        };
      });
      const btnCloseCardModal = document.getElementById("btnCloseCardModal");
      if (btnCloseCardModal) {
        btnCloseCardModal.onclick = () => window.CardExporter && window.CardExporter.closeCardModal();
      }
      cardModal.onclick = (e) => {
        if (e.target === cardModal && window.CardExporter) {
          window.CardExporter.closeCardModal();
        }
      };
    }

    // 全集志弹窗开闭与复制
    if (el.btnHeaderChronicle) el.btnHeaderChronicle.onclick = openChronicleModal;
    if (el.btnTocChronicle) el.btnTocChronicle.onclick = () => {
      closeSidebar();
      openChronicleModal();
    };
    // 目录抽屉内“典藏诗卷至桌面（手机/电脑）”
    if (el.btnTocInstallApp) {
      el.btnTocInstallApp.onclick = () => {
        if (window.openInstallModal) {
          window.openInstallModal();
        } else {
          closeSidebar();
          const isMobile = /mobile|android|iphone|ipad|phone/.test(navigator.userAgent.toLowerCase());
          showInstallHelpModal(!isMobile);
        }
      };
    }
    if (el.btnCloseChronicleModal) el.btnCloseChronicleModal.onclick = closeChronicleModal;
    if (el.btnCloseChronicleBottom) el.btnCloseChronicleBottom.onclick = closeChronicleModal;
    if (el.chronicleModal) {
      el.chronicleModal.onclick = (e) => {
        if (e.target === el.chronicleModal) closeChronicleModal();
      };
    }
    if (el.btnCopyWechatText) el.btnCopyWechatText.onclick = copyWechatSummary;

    // 典藏安装弹窗交互绑定
    const installAppModal = document.getElementById("installAppModal");
    if (installAppModal) {
      installAppModal.onclick = (e) => {
        if (e.target === installAppModal && window.closeInstallModal) {
          window.closeInstallModal();
        }
      };
    }
    const btnModalInstallAndroid = document.getElementById("btnModalInstallAndroid") || document.getElementById("btnModalInstallMobile");
    if (btnModalInstallAndroid) {
      btnModalInstallAndroid.onclick = () => triggerPromptFromGesture();
    }
    const btnModalInstallPC = document.getElementById("btnModalInstallPC");
    if (btnModalInstallPC) {
      btnModalInstallPC.onclick = () => triggerPromptFromGesture();
    }
    const btnCopyInstallLink = document.getElementById("btnCopyInstallLink");
    if (btnCopyInstallLink) {
      btnCopyInstallLink.onclick = () => {
        const textToCopy = `《一个人的诗经》（作者：周庸）\n📖 诗集主页（国内直连·畅通免翻）：https://zhouyongshiji-jpg.github.io/zhouyong-poetry/\n📲 手机桌面安装：https://zhouyongshiji-jpg.github.io/zhouyong-poetry/install.html\n（苹果手机在 Safari 中打开选择“添加到主屏幕”；安卓手机推荐用 Chrome 打开或下载安装包）\n🌐 海外备用通道：https://zhouyong-poetry.zhouyongshiji.workers.dev`;
        const doCopy = () => {
          const oldHtml = btnCopyInstallLink.innerHTML;
          btnCopyInstallLink.innerHTML = "<span>✅</span> <span>已成功复制！可直接发微信或 LINE 亲友</span>";
          btnCopyInstallLink.style.background = "rgba(5, 150, 105, 0.15)";
          btnCopyInstallLink.style.borderColor = "#059669";
          btnCopyInstallLink.style.color = "#059669";
          setTimeout(() => {
            btnCopyInstallLink.innerHTML = oldHtml;
            btnCopyInstallLink.style.background = "";
            btnCopyInstallLink.style.borderColor = "";
            btnCopyInstallLink.style.color = "";
          }, 3000);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(textToCopy).then(doCopy).catch(() => {
            fallbackCopy(textToCopy);
            doCopy();
          });
        } else {
          fallbackCopy(textToCopy);
          doCopy();
        }
      };
    }

    // 水墨长诗平滑回顶浮标
    if (el.btnBackToTop) {
      window.addEventListener("scroll", () => {
        el.btnBackToTop.classList.toggle("show", window.scrollY > 320);
      }, { passive: true });

      el.btnBackToTop.onclick = () => {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion ? "auto" : "smooth"
        });
      };
    }
  }

  function openChronicleModal() {
    if (!el.chronicleModal) return;
    renderChronicleContent();
    el.chronicleModal.classList.add("active");
    el.chronicleModal.classList.add("show");
  }

  function closeChronicleModal() {
    if (el.chronicleModal) {
      el.chronicleModal.classList.remove("active");
      el.chronicleModal.classList.remove("show");
    }
  }

  function renderChronicleContent() {
    if (!el.chronicleContentArea) return;

    // 动态生成两编卷目卡片
    let lastPart = null;
    const volCardsHtml = state.volumes.map((vol, idx) => {
      const volPoems = state.poems.filter(p => p.volumeId === vol.id);
      let partHeaderHtml = "";
      if (vol.part && vol.part !== lastPart) {
        lastPart = vol.part;
        partHeaderHtml = `
          <div class="chronicle-part-divider" style="margin: 20px 0 12px 0; padding: 8px 14px; background: rgba(184, 59, 46, 0.08); border-left: 4px solid var(--vermilion); border-radius: 4px; font-weight: bold; color: var(--vermilion); font-size: 15px; font-family: var(--font-kaiti);">
            📖 ${vol.part}
          </div>
        `;
      }
      return `
        ${partHeaderHtml}
        <div class="chronicle-vol-card">
          <div class="chronicle-vol-top">
            <span class="chronicle-vol-name">${vol.name}</span>
            <span class="chronicle-vol-meta">${vol.period} · 共 ${volPoems.length} 首</span>
          </div>
          <div class="chronicle-vol-desc">
            <p style="margin-bottom: 6px;"><strong>【提要】</strong>${vol.description}</p>
            <p style="font-style: italic; color: var(--text-muted); font-size: 13px;"><strong>【卷序】</strong>${vol.foreword}</p>
          </div>
        </div>
      `;
    }).join("");

    const sealSvg = window.SealGenerator 
      ? window.SealGenerator.createSealSVG({ text: "周庸之印", size: 60, style: "yin" })
      : "";

    el.chronicleContentArea.innerHTML = `
      <div class="chronicle-header-box">
        <h3 class="chronicle-title">
          <span class="title-book">《一个人的诗经》</span><span class="title-doc">全帙编年纲要</span>
        </h3>
        <div class="chronicle-stats">
          <span>周庸 先生 著</span> · 
          <span>100% 纯真迹 ${state.volumes.length} 大卷</span> · 
          <span>全集计 <strong>${state.poems.length}</strong> 首</span>
        </div>
      </div>

      <div class="chronicle-volumes-list">
        ${volCardsHtml}
      </div>

      <div class="chronicle-features-box">
        <div style="font-weight: bold; color: var(--text-primary); margin-bottom: 8px;">📱 掌上数字诗馆适老与分享特色：</div>
        <ul style="padding-left: 20px; line-height: 1.8;">
          <li><strong>大字护眼</strong>：点击右上角「大字」或「特大」，字大如盘，久读不累。</li>
          <li><strong>古籍竖排</strong>：点击「竖排」重现宣纸古籍线装神韵，自右向左自然翻阅。</li>
          <li><strong>闭目听诗</strong>：点击「听诗」自动以舒缓语调朗诵诗作，视力疲劳时可静心聆听。</li>
          <li><strong>生成雅卡</strong>：点击「生成雅卡」一键输出 2x 高清宣纸美图，方便长按发送朋友圈或 LINE。</li>
          <li><strong>即打即搜</strong>：支持诗句全文、地名、年份及拼音首字母即时极速检索。</li>
        </ul>
      </div>

      <div class="chronicle-colophon-box" style="margin-top: 22px; padding: 14px 16px; border-top: 1px dashed var(--border-color); display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 14px;">
        <div class="chronicle-colophon-meta" style="font-size: 13px; color: var(--text-muted); line-height: 1.8;">
          <div><strong>全集版本</strong>：${APP_VERSION}（${EDITION_DATE} 编校录入 · 汇录 ${state.poems.length} 篇亲笔真迹）</div>
          <div style="margin-top: 4px;">
            <span><strong>技术开发与维护信箱</strong>：<a href="mailto:zhouyongshiji@gmail.com" style="color: var(--vermilion); text-decoration: none; font-weight: 500;">zhouyongshiji@gmail.com</a></span>
          </div>
          <div style="font-size: 12px; color: var(--text-muted); opacity: 0.85; margin-top: 2px;">
            （亲友若有数字化系统建设及各类商业软件/网页开发需求，欢迎邮件联络）
          </div>
        </div>
        <div class="chronicle-colophon-author" style="display: flex; align-items: center; gap: 10px;">
          <span style="font-family: var(--font-kaiti); font-size: 16px; color: var(--text-secondary);">周庸 敬题</span>
          <div>${sealSvg}</div>
        </div>
      </div>
    `;
  }

  function copyWechatSummary() {
    const totalCount = state.poems.length;
    const volCount = state.volumes.length;

    let lastPart = null;
    const volSections = state.volumes.map(vol => {
      const volPoems = state.poems.filter(p => p.volumeId === vol.id || p.volume.includes(vol.name.slice(0, 4)));
      let partPrefix = "";
      if (vol.part && vol.part !== lastPart) {
        lastPart = vol.part;
        partPrefix = `\n【📖 ${vol.part}】\n───────────────────\n`;
      }
      return `${partPrefix}◈【${vol.name}】\n▫ 篇数：共 ${volPoems.length} 首\n▫ 时段：${vol.period || '不详'}\n▫ 概述：${vol.description || ''}`;
    }).join("\n\n");

    const text = `周老先生展信安好！

您的全部诗作已为您精心整理完毕，全集共计 ${totalCount} 首您的亲笔真迹，无任何杂作。现已汇编为【纯真迹 ${volCount} 大卷】，按编年与题材系统归档，特呈您一览：

🌐 诗集在线品读网址（国内直连畅通）：
https://zhouyongshiji-jpg.github.io/zhouyong-poetry/
（电脑与手机直接点击秒开；微信内若提示，点右上角“…”选“在浏览器打开”）
（海外备用通道：https://zhouyong-poetry.zhouyongshiji.workers.dev）

📲 手机一键安装到桌面指引（微信 / LINE 好友）：
https://zhouyongshiji-jpg.github.io/zhouyong-poetry/install.html
（苹果手机点开用 Safari 添加到桌面；安卓手机推荐用 Chrome 打开或下载 APK）

━━━━━━━━━━━━━━━
📜 《一个人的诗经》（周庸 著）${volCount}大卷编年概览
━━━━━━━━━━━━━━━

${volSections}

━━━━━━━━━━━━━━━
⚙️ 掌上诗馆贴心功能提示
━━━━━━━━━━━━━━━
▪ 大字护眼：顶部可随时点「大字」或「特大」，大字如盘，久读不累。
▪ 古籍竖排：点「竖排」即转为古典宣纸线装书，自右向左自然翻阅。
▪ 闭目听诗：点「听诗」有舒缓诵读，疲劳时可闭目静听。
▪ 制作雅卡：每首诗点「生成雅卡」，一键存入手机相册，方便发朋友圈或LINE。
▪ 飞速检索：上方输入任意字词或拼音首字母，瞬间找到对应篇目。

文字粗粝，皆是有感而发的心迹留痕；
天涯羁旅，唯以诗心慰平生。

━━━━━━━━━━━━━━━
📌 数字化典藏与技术服务
━━━━━━━━━━━━━━━
▪ 全集版本：${APP_VERSION} · ${EDITION_DATE} 编校录入
▪ 技术开发与维护信箱：zhouyongshiji@gmail.com
（亲友若有数字化系统建设及各类商业软件/网页开发需求，欢迎邮件联络）`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        showCopySuccess();
      }).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }

  function showCopySuccess() {
    if (!el.btnCopyWechatText) return;
    const oldHtml = el.btnCopyWechatText.innerHTML;
    el.btnCopyWechatText.innerHTML = "<span>✅</span> <span>已成功复制！可直接发微信或LINE</span>";
    el.btnCopyWechatText.style.background = "#059669";
    setTimeout(() => {
      el.btnCopyWechatText.innerHTML = oldHtml;
      el.btnCopyWechatText.style.background = "#07C160";
    }, 3000);
  }

  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showCopySuccess();
    } catch (e) {
      alert("请手动长按复制文案");
    }
    document.body.removeChild(ta);
  }

  function openSidebar() {
    if (el.sidebarToc) el.sidebarToc.classList.add("open");
    if (el.sidebarBackdrop) el.sidebarBackdrop.classList.add("show");
  }

  function closeSidebar() {
    if (el.sidebarToc) el.sidebarToc.classList.remove("open");
    if (el.sidebarBackdrop) el.sidebarBackdrop.classList.remove("show");
  }

  /**
   * PWA Service Worker 离线缓存支持
   */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost")) {
      const doRegister = () => {
        navigator.serviceWorker.register("./sw.js").catch(err => {
          console.log("SW 注册跳过或未处于 https 域:", err);
        });
      };
      if (document.readyState === "complete") {
        doRegister();
      } else {
        window.addEventListener("load", doRegister);
      }
    }
  }

  /**
   * PWA 桌面/移动端安装引导与事件捕获 (手势驱动 · 稳健可靠)
   */
  let deferredInstallPrompt = null;

  function initPWAInstall() {
    const urlParams = new URLSearchParams(window.location.search);
    const isMobileInstallReq = urlParams.get("install") === "1" || urlParams.get("action") === "install";
    const isPCInstallReq = urlParams.get("install") === "pc";

    // 监听原生安装前置事件
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredInstallPrompt = e;
      console.log("PWA 捕获到 beforeinstallprompt 事件");

      // 如果当前弹窗已处于打开状态，为弹窗内的安装主按钮启用直接调起
      const modalActionBtn = document.getElementById("btnModalTriggerInstall");
      if (modalActionBtn) {
        modalActionBtn.onclick = () => {
          triggerPromptFromGesture();
        };
      }
    });

    // 监听安装完成事件
    window.addEventListener("appinstalled", () => {
      console.log("《周庸诗集》已成功安装至桌面");
      deferredInstallPrompt = null;
      if (window.closeInstallModal) window.closeInstallModal();
      const modal = document.querySelector(".pwa-help-modal");
      if (modal) modal.remove();
    });

    // 若携带安装参数进入，立即弹出雅致安装卡片，供用户点击直接唤起系统弹窗或极速下载
    if (isMobileInstallReq || isPCInstallReq) {
      setTimeout(() => {
        if (window.openInstallModal) {
          window.openInstallModal();
        } else {
          showInstallHelpModal(isPCInstallReq);
        }
      }, 350);
    }
  }

  function triggerPromptFromGesture() {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      deferredInstallPrompt.userChoice.then((res) => {
        if (res.outcome === "accepted") {
          console.log("用户同意安装");
          if (window.closeInstallModal) window.closeInstallModal();
          const modal = document.querySelector(".pwa-help-modal");
          if (modal) modal.remove();
        }
        deferredInstallPrompt = null;
      }).catch(err => {
        console.warn("Prompt error:", err);
      });
    } else {
      const tip = document.getElementById("pwaInstallFallbackTip");
      if (tip) tip.style.display = "block";
    }
  }
  window.triggerPromptFromGesture = triggerPromptFromGesture;

  function showInstallHelpModal(isPC = false) {
    if (window.openInstallModal) {
      window.openInstallModal();
      return;
    }
    if (document.querySelector(".pwa-help-modal")) return;

    const modal = document.createElement("div");
    modal.className = "pwa-help-modal";
    const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

    const titleText = isPC ? "安装到电脑桌面" : "添加到手机桌面";
    const descText = isPC 
      ? "为方便以电脑大屏舒心品读，推荐将《周庸诗集》作为独立应用安装至桌面："
      : "为方便周庸先生及亲友随时以大字翻阅诗卷，建议将诗馆添加至桌面随时品读：";

    let contentHtml = "";
    if (isPC) {
      contentHtml = `
        <button id="btnModalTriggerInstall" class="pwa-install-action-btn">
          <span>🖥️</span> <span>立即安装到电脑桌面</span>
        </button>
        <div id="pwaInstallFallbackTip" class="pwa-help-steps" style="margin-top:14px;">
          <div style="font-weight:bold; color:var(--vermilion); margin-bottom:6px;">浏览器快捷安装指引：</div>
          <div>① 请查看当前 Edge 或 Chrome 浏览器顶部的<strong>地址栏最右侧</strong>；</div>
          <div>② 点击带有小电脑或加号的【<strong>安装应用 ⊞</strong>】图标；</div>
          <div>③ 在弹出的确认框中点击【<strong>安装</strong>】，即可生成电脑桌面专属应用！</div>
          <div style="font-size:12.5px; color:var(--text-muted); margin-top:6px;">（安装后将拥有专属独立大窗口与水墨印章图标，无地址栏干扰）</div>
        </div>
      `;
    } else if (isIOS) {
      contentHtml = `
        <div class="pwa-help-steps">
          <div style="font-weight:bold; color:var(--vermilion); margin-bottom:6px;">🍎 苹果手机 Safari 专属指引：</div>
          <div>① 确认当前是在苹果自带 <strong>Safari 浏览器</strong> 中打开；</div>
          <div>② 点击屏幕底部的【<strong>分享 ⎋</strong>】图标（方框带向上箭头）；</div>
          <div>③ 在弹出菜单向上轻滑，选择【<strong>添加到主屏幕 ➕</strong>】；</div>
          <div>④ 点击右上角【<strong>添加</strong>】，手机桌面即可生成专属图标！</div>
        </div>
      `;
    } else {
      contentHtml = `
        <button id="btnModalTriggerInstall" class="pwa-install-action-btn">
          <span>🤖</span> <span>立即添加到手机桌面（推荐 Chrome）</span>
        </button>
        <a href="ZhouYongPoetry.apk" class="pwa-apk-sub-btn" download="周庸诗集.apk">
          <span>📦</span> <span>直接下载安卓安装包 (.apk 极速直装)</span>
        </a>
        <div id="pwaInstallFallbackTip" class="pwa-help-steps" style="display:none; margin-top:8px;">
          <div style="font-size:13px; color:var(--text-muted); margin-bottom:6px;">若系统未弹出确认框，建议使用 Chrome 浏览器：</div>
          <div>① 点击 Chrome 浏览器右上角菜单【<strong>···</strong>】；</div>
          <div>② 选择【<strong>添加到主屏幕</strong>】或【<strong>安装应用</strong>】；</div>
          <div style="font-size:12.5px; color:var(--text-muted); margin-top:4px;">（注：若浏览器不支持，推荐直接点击上方按钮下载纯净 APK 安装包）</div>
        </div>
      `;
    }

    modal.innerHTML = `
      <div class="pwa-help-card">
        <div class="pwa-help-title">${titleText}</div>
        <div class="pwa-help-desc">${descText}</div>
        ${contentHtml}
        <button class="pwa-help-close-btn" id="pwaHelpCloseBtn" style="margin-top:6px;">我知道了 · 进入诗卷</button>
      </div>
    `;
    document.body.appendChild(modal);

    const triggerBtn = document.getElementById("btnModalTriggerInstall");
    if (triggerBtn) {
      triggerBtn.addEventListener("click", () => {
        triggerPromptFromGesture();
      });
    }

    const closeBtn = document.getElementById("pwaHelpCloseBtn");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        modal.remove();
      });
    }
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  // 挂载并执行
  window.addEventListener("DOMContentLoaded", init);
})();
