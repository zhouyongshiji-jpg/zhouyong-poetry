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
      volumesNavList: document.getElementById("volumesNavList"),

      // 全帙志与微信文案
      btnHeaderChronicle: document.getElementById("btnHeaderChronicle"),
      btnTocChronicle: document.getElementById("btnTocChronicle"),
      chronicleModal: document.getElementById("chronicleModal"),
      chronicleContentArea: document.getElementById("chronicleContentArea"),
      btnCloseChronicleModal: document.getElementById("btnCloseChronicleModal"),
      btnCloseChronicleBottom: document.getElementById("btnCloseChronicleBottom"),
      btnCopyWechatText: document.getElementById("btnCopyWechatText")
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

    // 键盘左右箭头翻页与ESC退出弹窗
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeChronicleModal();
        if (window.CardExporter) window.CardExporter.closeCardModal();
        return;
      }
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

    // 全集志弹窗开闭与复制
    if (el.btnHeaderChronicle) el.btnHeaderChronicle.onclick = openChronicleModal;
    if (el.btnTocChronicle) el.btnTocChronicle.onclick = () => {
      closeSidebar();
      openChronicleModal();
    };
    if (el.btnCloseChronicleModal) el.btnCloseChronicleModal.onclick = closeChronicleModal;
    if (el.btnCloseChronicleBottom) el.btnCloseChronicleBottom.onclick = closeChronicleModal;
    if (el.chronicleModal) {
      el.chronicleModal.onclick = (e) => {
        if (e.target === el.chronicleModal) closeChronicleModal();
      };
    }
    if (el.btnCopyWechatText) el.btnCopyWechatText.onclick = copyWechatSummary;
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

    // 动态生成五卷卡片
    const volCardsHtml = state.volumes.map((vol, idx) => {
      const volPoems = state.poems.filter(p => p.volumeId === vol.id);
      return `
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
        <h3 class="chronicle-title">《周庸诗集》全帙编年纲要</h3>
        <div class="chronicle-stats">
          <span>周庸 先生 著</span> · 
          <span>100% 纯真迹五大卷</span> · 
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
          <li><strong>改换竖排</strong>：点击「改竖排」重现宣纸古籍线装神韵，自右向左自然翻阅。</li>
          <li><strong>闭目听诗</strong>：点击「听诗」自动以舒缓语调朗诵诗作，视力疲劳时可静心聆听。</li>
          <li><strong>生成雅卡</strong>：点击「生成雅卡」一键输出 2x 高清宣纸美图，方便长按发送朋友圈或 LINE。</li>
          <li><strong>即打即搜</strong>：支持诗句全文、地名、年份及拼音首字母即时极速检索。</li>
        </ul>
      </div>

      <div style="margin-top: 24px; display: flex; align-items: center; justify-content: flex-end; gap: 14px;">
        <span style="font-family: var(--font-kaiti); font-size: 16px; color: var(--text-secondary);">周庸 敬题</span>
        <div>${sealSvg}</div>
      </div>
    `;
  }

  function copyWechatSummary() {
    const text = `周老先生展信安好！

您的全部诗作已为您精心整理完毕，全集共计 329 首您的亲笔真迹，无任何杂作。现已汇编为【纯真迹五大卷】，按编年与题材系统归档，特呈您一览：

🌐 诗集正式访问网址：
https://zhouyong-poetry.zhouyongshiji.workers.dev
（电脑与手机直接点击即可秒开；若微信提示受限，点右上角“…”选择“在浏览器中打开”）

━━━━━━━━━━━━━━━
📜 《周庸诗集》五大卷编年概览
━━━━━━━━━━━━━━━

◈【卷一·去国行与南洋客梦】
▫ 篇数：共 17 首
▫ 时段：2018年 — 2024年
▫ 概述：收录去国前夕云南《抚仙湖诗五首》、海外夜市《饮酒歌》、客寓佛寺《游侬帕兰寺》、秋晨《晨绕拷桃》、贺晓铁大婚《七言古风》、异国《情人节》、宋干狂欢《泼水节随吟》、痛悼老友《悼铁流》、中秋宴聚《中秋抒怀》、《重游普吉来芭东》与世相针砭。

◈【卷二·流浪者竹枝词】
▫ 篇数：共 141 首
▫ 时段：2025年5月 — 2025年8月
▫ 概述：《流浪者竹枝词》完整大系！从《之一》一气呵成贯穿至《之158》。避秦求存、就医自嘲、拷汪宫记游、祈雨孝道、泰柬冲突、俄乌战事、江油校园之痛与海外饯行竹枝词全帙收录。

◈【卷三·回乡曲与慈母寿】
▫ 篇数：共 124 首
▫ 时段：2025年8月 — 2025年11月
▫ 概述：《回乡曲》完整大系！从《之001》至《之142》无一遗漏。深情记录一口川普返故里、老母盲聋倚门迎儿、长兄手足情深、同窗佳宴、大凉山第二故乡追忆、泸山古刹访友、李庄漫步、公车闻大爷阔论、九十八岁慈母寿诞、遵母令拒礼金、弟侄拼酒老屋宿醉与门前鱼塘垂钓。

◈【卷四·游子吟与泰北行】
▫ 篇数：共 27 首
▫ 时段：2026年2月 — 2026年3月
▫ 概述：丙午新春四首（《情人节抒怀》、《年夜饭》、《大年初一吟》、《又见金链花》）与泰北纪行《游子吟》系列（之1至之23，漫步清迈古城、塔佩红墙、登素贴山双龙寺、访清莱孟莱王铜像）。

◈【卷五·暹罗长歌与晚晴行】
▫ 篇数：共 20 首
▫ 时段：2025年 — 2026年
▫ 概述：南洋避秦生活古风长歌。涵盖《今日咖啡馆随吟》、《美臀篇》、《四吟金链花》、《元旦海滩陷沙记》、《马年除夕寄语》、《再吟金链花》、《泰缅边塞行》、《五二O随吟》、《那日的纪念》、《晨步遇雨》、《定风波·浴海》、《七月闲吟》、《八月闲吟》、《泰缅边境吟》、《暗夜醉吟》、《醉夫吟》、《失乐园》、《考新蕾发吟留别》等长歌巨制。

━━━━━━━━━━━━━━━
⚙️ 掌上诗馆贴心功能提示
━━━━━━━━━━━━━━━
▪ 大字护眼：顶部可随时点「大字」或「特大」，大字如盘，久读不累。
▪ 改换竖排：点「改竖排」即转为古典宣纸线装书，自右向左自然翻阅。
▪ 闭目听诗：点「听诗」有舒缓诵读，疲劳时可闭目静听。
▪ 制作雅卡：每首诗点「生成雅卡」，一键存入手机相册，方便发朋友圈或LINE。
▪ 飞速检索：上方输入任意字词或拼音首字母，瞬间找到对应篇目。

文字粗粝，皆是有感而发的心迹留痕；
天涯羁旅，唯以诗心慰平生。`;

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
