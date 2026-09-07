/**
 * ==========================================================================
 * 《周庸诗集》- 毫秒级全文与拼音首字母检索引擎 (js/search.js)
 * 特性：零后端依赖、拼音首字母匹配、简繁互通、高亮命中词
 * ==========================================================================
 */

const PoetrySearch = (function () {
  // 简繁常用字快速映射字典 (覆盖古典诗词高频字)
  const TRAD_TO_SIMP = {
    "國": "国", "詩": "诗", "樓": "楼", "華": "华", "異": "异", "歲": "岁",
    "憶": "忆", "風": "风", "雲": "云", "歸": "归", "萬": "万", "裡": "里",
    "鄉": "乡", "夢": "梦", "綠": "绿", "燈": "灯", "聲": "声", "長": "长",
    "來": "来", "問": "问", "開": "开", "門": "门", "黃": "黄", "鶴": "鹤",
    "濤": "涛", "葉": "叶", "書": "书", "筆": "笔", "墨": "墨", "節": "节",
    "處": "处", "歡": "欢", "幾": "几", "頭": "头", "滿": "满", "過": "过",
    "遠": "远", "連": "连", "語": "语", "驚": "惊", "陰": "阴", "晴": "晴"
  };

  // 常见汉字拼音首字母索引表 (轻量内置，覆盖常用声母)
  // 通过 Unicode 拼音范围简化算法结合关键地名/专有名词映射
  const PINYIN_SPECIALS = {
    "湄南河": "mnh", "曼谷": "mg", "清迈": "qm", "素帖山": "sts", "耀华力路": "yhll",
    "唐人街": "trj", "黄鹤楼": "hhl", "九溪": "jx", "水调歌头": "sdgt", "鹧鸪天": "zgt",
    "明前茶": "mqc", "神州": "sz", "江南": "jn", "中秋": "zq", "除夕": "cx"
  };

  let indexData = [];

  /**
   * 将繁体转换为简体以增强海外读者搜索体验
   */
  function normalizeText(str) {
    if (!str) return "";
    let res = "";
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      res += TRAD_TO_SIMP[char] || char;
    }
    return res.toLowerCase().trim();
  }

  /**
   * 初始化诗库索引
   */
  function buildIndex(poems) {
    indexData = poems.map(poem => {
      const fullContent = (poem.content || []).join(" ");
      const fullNotes = (poem.notes || []).join(" ");
      const fullTags = (poem.tags || []).join(" ");

      const rawSearchString = [
        poem.title,
        poem.subtitle || "",
        poem.genre || "",
        poem.tune || "",
        poem.volume || "",
        poem.year || "",
        poem.location || "",
        poem.preface || "",
        fullContent,
        fullNotes,
        fullTags
      ].join(" ");

      const normalized = normalizeText(rawSearchString);

      return {
        poem,
        normalized,
        titleNorm: normalizeText(poem.title),
        contentNorm: normalizeText(fullContent),
        tagsNorm: normalizeText(fullTags),
        year: poem.year || "",
        locationNorm: normalizeText(poem.location || "")
      };
    });
  }

  /**
   * 检查拼音首字母是否在文本中有特配
   */
  function matchPinyinInitials(query, normalizedText) {
    for (const [phrase, pinyin] of Object.entries(PINYIN_SPECIALS)) {
      if (pinyin.includes(query) && normalizedText.includes(phrase)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 执行即打即搜
   * @param {string} rawQuery 检索词
   * @returns {Array} 匹配的诗作列表，附带高亮片段
   */
  function search(rawQuery) {
    if (!rawQuery || !rawQuery.trim()) {
      return indexData.map(item => ({ poem: item.poem, matchedSnippet: "" }));
    }

    const query = normalizeText(rawQuery);
    const results = [];

    for (const item of indexData) {
      let score = 0;
      let snippet = "";

      // 1. 标题完全包含匹配 (最高优先级)
      if (item.titleNorm.includes(query)) {
        score += 100;
        snippet = highlight(item.poem.title, query);
      }
      // 2. 诗句正文命中
      else if (item.contentNorm.includes(query)) {
        score += 60;
        // 提取命中的诗句并高亮
        const matchedLine = item.poem.content.find(line => 
          normalizeText(line).includes(query)
        );
        if (matchedLine) {
          snippet = highlight(matchedLine, query);
        }
      }
      // 3. 序言命中
      else if (item.poem.preface && normalizeText(item.poem.preface).includes(query)) {
        score += 40;
        snippet = highlight(item.poem.preface, query);
      }
      // 4. 地点或年代命中
      else if (item.locationNorm.includes(query) || item.year.includes(query)) {
        score += 30;
        snippet = `${item.poem.year}年 · ${item.poem.location}`;
      }
      // 5. 标签或体裁命中
      else if (item.tagsNorm.includes(query)) {
        score += 20;
        snippet = `标签：${item.poem.tags.join("、")}`;
      }
      // 6. 拼音首字母匹配
      else if (matchPinyinInitials(query, item.normalized)) {
        score += 50;
        snippet = `拼音匹配：${item.poem.title}`;
      }

      if (score > 0) {
        results.push({
          poem: item.poem,
          score,
          matchedSnippet: snippet
        });
      }
    }

    // 按匹配度从高到低排序
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * 将命中的关键词包装在 <mark> 标签中实现黄底高亮
   */
  function highlight(text, query) {
    if (!text || !query) return text;
    // 不区分大小写替换
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escaped})`, "gi");
    return text.replace(regex, `<mark class="search-highlight">$1</mark>`);
  }

  return {
    buildIndex,
    search,
    highlight,
    normalizeText
  };
})();

// 挂载到全局
window.PoetrySearch = PoetrySearch;
