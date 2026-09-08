/**
 * ==========================================================================
 * 《周庸诗集》- 数字诗馆主控制器 (js/app.js)
 * 功能：数据驱动、适老化字号持久化、横竖排版切换、Web Speech 朗诵、PWA 离线
 * ==========================================================================
 */

(function () {
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
    initRouter();
    registerServiceWorker();
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
      volumesNavList: document.getElementById("volumesNavList")
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
        ? `<span class="icon">📑</span><span>改横排</span>`
        : `<span class="icon">📜</span><span>改竖排</span>`;
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
   * 渲染侧边栏卷目和诗题树
   */
  function renderSidebar() {
    if (!el.volumesNavList) return;
    el.volumesNavList.innerHTML = "";

    state.volumes.forEach(vol => {
      const volPoems = state.poems.filter(p => p.volumeId === vol.id || p.volume.includes(vol.name.slice(0, 4)));
      
      const volGroup = document.createElement("div");
      volGroup.className = "volume-group";

      volGroup.innerHTML = `
        <div class="volume-header" data-vol-id="${vol.id}">
          <span>${vol.name}</span>
          <span class="volume-badge">${volPoems.length} 首</span>
        </div>
        <ul class="poem-list" id="list-${vol.id}">
          ${volPoems.map(poem => `
            <li class="poem-nav-item ${state.poems[state.currentPoemIndex]?.id === poem.id ? "active" : ""}" 
                data-poem-id="${poem.id}">
              <span>${poem.title}</span>
              <span style="font-size: 11px; opacity: 0.7;">${poem.genre || ""}</span>
            </li>
          `).join("")}
        </ul>
      `;

      el.volumesNavList.appendChild(volGroup);
    });

    // 绑定侧栏点击
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

    // 更新翻页按钮状态
    if (el.btnPrevPoem) el.btnPrevPoem.disabled = state.currentPoemIndex === 0;
    if (el.btnNextPoem) el.btnNextPoem.disabled = state.currentPoemIndex === state.poems.length - 1;
    if (el.pageIndicator) {
      el.pageIndicator.textContent = `${state.currentPoemIndex + 1} / ${state.poems.length}`;
    }

    // 更新侧边栏高亮
    document.querySelectorAll(".poem-nav-item").forEach(item => {
      item.classList.toggle("active", item.dataset.poemId === poem.id);
    });

    // 生成朱砂印章 SVG
    const sealHtml = window.SealGenerator 
      ? window.SealGenerator.createSealSVG({ text: "周庸之印", size: 68, style: "yin" })
      : "";

    // 组装诗句（支持智能半句对仗切分，杜绝移动端中途断字）
    const stanzasHtml = poem.content.map(line => {
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
            <div class="poem-volume-tag">${poem.volume || "集外诗选"}</div>
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
      const id = hash.replace("#/poem/", "");
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

    // 键盘左右箭头翻页
    window.addEventListener("keydown", (e) => {
      if (document.activeElement === el.searchInput) return;
      if (e.key === "ArrowLeft") navigateToPoem(state.currentPoemIndex - 1);
      if (e.key === "ArrowRight") navigateToPoem(state.currentPoemIndex + 1);
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
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js").catch(err => {
          console.log("SW 注册跳过或未处于 https 域:", err);
        });
      });
    }
  }

  // 挂载并执行
  window.addEventListener("DOMContentLoaded", init);
})();
