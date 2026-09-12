/**
 * ==========================================================================
 * 《周庸诗集》- 微信与 LINE 雅韵诗卡导出器 (js/card-exporter.js)
 * 纯 HTML5 Canvas 原生高清绘制，零外部网络依赖，支持 3:4 与长卷比例
 * ==========================================================================
 */

const CardExporter = (function () {
  let currentPoem = null;
  let currentRatio = "3:4"; // "3:4" | "square" | "scroll"

  /**
   * 打开并渲染卡片弹窗
   */
  function openCardModal(poem) {
    currentPoem = poem;
    const modal = document.getElementById("cardModal");
    if (!modal) return;

    modal.classList.add("active");
    renderCard();
  }

  function closeCardModal() {
    const modal = document.getElementById("cardModal");
    if (modal) {
      modal.classList.remove("active");
    }
  }

  /**
   * 切换卡片长宽比
   */
  function setRatio(ratio) {
    currentRatio = ratio;
    // 更新按钮状态
    document.querySelectorAll(".card-opt-btn").forEach(btn => {
      btn.classList.toggle("active", btn.dataset.ratio === ratio);
    });
    renderCard();
  }

  /**
   * 高清 Canvas 绘制与智能自适应排版 (防文字截断与印章遮挡)
   */
  function renderCard() {
    if (!currentPoem) return;

    const previewImg = document.getElementById("cardPreviewImg");
    const downloadBtn = document.getElementById("btnDownloadCard");
    if (!previewImg) return;

    const m = 36; // 外边距
    let width = 800;
    let height = 1066; // 3:4 比例

    const lines = currentPoem.content || [];
    const lineCount = lines.length;

    // 预估动态高度
    if (currentRatio === "square") {
      height = 800;
    } else if (currentRatio === "scroll") {
      // 动态根据诗句长度计算高度，长卷舒展到底
      height = Math.max(1066, Math.round(520 + lineCount * 54));
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 1. 绘制宣纸底色与纸纹
    ctx.fillStyle = "#F8F4EA";
    ctx.fillRect(0, 0, width, height);

    // 宣纸温润渐变
    const paperGrad = ctx.createLinearGradient(0, 0, width, height);
    paperGrad.addColorStop(0, "rgba(253, 251, 247, 0.96)");
    paperGrad.addColorStop(1, "rgba(240, 234, 218, 0.92)");
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 绘制古典传统边框（外细内双，古籍开本规制）
    ctx.strokeStyle = "#C4B89F";
    ctx.lineWidth = 2.5;
    ctx.strokeRect(m, m, width - m * 2, height - m * 2);

    ctx.strokeStyle = "#D9D0BC";
    ctx.lineWidth = 1;
    ctx.strokeRect(m + 8, m + 8, width - (m + 8) * 2, height - (m + 8) * 2);

    // 四角古朴装饰折角
    drawCornerBracket(ctx, m + 12, m + 12, 14, 1, 1);
    drawCornerBracket(ctx, width - m - 12, m + 12, 14, -1, 1);
    drawCornerBracket(ctx, m + 12, height - m - 12, 14, 1, -1);
    drawCornerBracket(ctx, width - m - 12, height - m - 12, 14, -1, -1);

    // 3. 顶部卷目与诗集题标
    ctx.fillStyle = "#B83B2E";
    ctx.font = 'bold 20px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.textAlign = "center";
    ctx.letterSpacing = "2.5px";
    const volumeText = `《一个人的诗经》· 周庸 · ${currentPoem.volume || "吟草"}`;
    ctx.fillText(volumeText, width / 2, m + 40);

    // 4. 诗题 (支持字号自适应与长诗题折行)
    let titleFontSize = 36;
    if (currentPoem.title.length > 18) {
      titleFontSize = 24;
    } else if (currentPoem.title.length > 12) {
      titleFontSize = 28;
    } else if (currentPoem.title.length > 8) {
      titleFontSize = 32;
    }
    if (currentRatio === "square" && titleFontSize > 30) {
      titleFontSize = 30;
    }

    ctx.fillStyle = "#1F1E1B";
    ctx.font = `bold ${titleFontSize}px "Noto Serif SC", "Songti SC", "STSong", serif`;
    ctx.letterSpacing = "3px";

    const titleLines = wrapText(ctx, currentPoem.title, width - m * 2 - 60);
    let currentY = m + 82;
    for (let t = 0; t < titleLines.length; t++) {
      ctx.fillText(titleLines[t], width / 2, currentY);
      currentY += titleFontSize + 8;
    }

    // 副标题/曲牌（若有）
    if (currentPoem.subtitle || currentPoem.tune) {
      ctx.fillStyle = "#5E584E";
      const subFontSize = currentRatio === "square" ? 18 : 20;
      ctx.font = `normal ${subFontSize}px "Noto Serif SC", "KaiTi", serif`;
      ctx.letterSpacing = "2px";
      const sub = currentPoem.tune ? `【${currentPoem.tune}】` : currentPoem.subtitle;
      const subLines = wrapText(ctx, sub, width - m * 2 - 80);
      for (const sLine of subLines) {
        ctx.fillText(sLine, width / 2, currentY);
        currentY += subFontSize + 6;
      }
      currentY += 4;
    }

    // 创作信息（年代·地点·体裁）
    const metaParts = [];
    if (currentPoem.year) metaParts.push(`${currentPoem.year}年`);
    if (currentPoem.location) metaParts.push(currentPoem.location);
    if (currentPoem.genre) metaParts.push(currentPoem.genre);
    if (metaParts.length > 0) {
      ctx.fillStyle = "#877E71";
      ctx.font = 'normal 16px "Noto Serif SC", "Songti SC", serif';
      ctx.letterSpacing = "1.5px";
      ctx.fillText(metaParts.join(" · "), width / 2, currentY);
      currentY += 24;
    }

    // 细分割线
    ctx.strokeStyle = "#DDD2BE";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 70, currentY);
    ctx.lineTo(width / 2 + 70, currentY);
    ctx.stroke();
    currentY += 22;

    // 5. 序言/小引（若有）
    if (currentPoem.preface) {
      ctx.fillStyle = "#6B6457";
      const pFontSize = currentRatio === "square" ? 15 : 17;
      ctx.font = `italic ${pFontSize}px "KaiTi SC", "STKaiti", "KaiTi", serif`;
      ctx.letterSpacing = "1px";
      const prefaceLines = wrapText(ctx, `小引：${currentPoem.preface}`, width - 180);
      const maxPLines = (currentRatio === "square" || lineCount > 16) ? 3 : prefaceLines.length;
      for (let p = 0; p < Math.min(prefaceLines.length, maxPLines); p++) {
        ctx.fillText(prefaceLines[p], width / 2, currentY);
        currentY += pFontSize + 6;
      }
      currentY += 10;
    }

    // 6. 正文与落款可用垂直空间精算 (防溢出核心引擎)
    const sealSize = currentRatio === "square" && lineCount > 12 ? 50 : 56;
    const bottomReserved = m + 22 + sealSize + 16; // 底部留白（印章 + 周庸题 + 防伪题注 + 边距）
    const maxContentY = height - bottomReserved;
    let availableHeight = maxContentY - currentY;

    // 如果是 Scroll 模式且诗歌非常长，动态自适应高度重算
    if (currentRatio === "scroll" && availableHeight < lineCount * 50) {
      height = Math.round(currentY + lineCount * 52 + bottomReserved + 30);
      canvas.height = height;
      return renderCard();
    }

    // 决定排版格式：单栏 vs 双栏古籍版式
    // 判定规则：
    // - 1:1 方形：行数 > 13 即启用古典双栏
    // - 3:4 朋友圈比例：行数 > 22 即启用古典双栏
    const useDualColumn = (currentRatio === "square" && lineCount > 13) ||
                          (currentRatio === "3:4" && lineCount > 22);

    let lineHeight = 44;
    let fontSize = 26;

    if (useDualColumn) {
      // 双栏古籍版式：左右对开
      const half = Math.ceil(lineCount / 2);
      lineHeight = Math.min(46, Math.max(25, Math.floor(availableHeight / (half + 0.5))));
      fontSize = Math.min(24, Math.max(16, Math.floor(lineHeight * 0.58)));

      // 垂直居中微调
      const totalColHeight = half * lineHeight;
      if (availableHeight > totalColHeight) {
        currentY += Math.floor((availableHeight - totalColHeight) / 3);
      }

      ctx.fillStyle = "#1B1A18";
      ctx.font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
      ctx.letterSpacing = fontSize > 20 ? "3.5px" : "2px";

      const col1Lines = lines.slice(0, half);
      const col2Lines = lines.slice(half);

      const col1X = width / 2 - 165;
      const col2X = width / 2 + 165;

      // 绘制左栏
      let y1 = currentY;
      for (let i = 0; i < col1Lines.length; i++) {
        const text = col1Lines[i];
        if (text.startsWith("【其")) {
          ctx.fillStyle = "#B83B2E";
          ctx.font = `bold ${fontSize - 2}px "KaiTi SC", "KaiTi", serif`;
          ctx.fillText(text, col1X, y1);
          ctx.fillStyle = "#1B1A18";
          ctx.font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
        } else {
          ctx.fillText(text, col1X, y1);
        }
        y1 += lineHeight;
      }

      // 绘制右栏
      let y2 = currentY;
      for (let i = 0; i < col2Lines.length; i++) {
        const text = col2Lines[i];
        if (text.startsWith("【其")) {
          ctx.fillStyle = "#B83B2E";
          ctx.font = `bold ${fontSize - 2}px "KaiTi SC", "KaiTi", serif`;
          ctx.fillText(text, col2X, y2);
          ctx.fillStyle = "#1B1A18";
          ctx.font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
        } else {
          ctx.fillText(text, col2X, y2);
        }
        y2 += lineHeight;
      }

      // 绘制双栏中间雅致古典分芯线 (木刻版心小缝)
      ctx.strokeStyle = "#E2D8C6";
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(width / 2, currentY - 6);
      ctx.lineTo(width / 2, Math.max(y1, y2) - lineHeight + 8);
      ctx.stroke();

      currentY = Math.max(y1, y2);
    } else {
      // 单栏模式：根据行数自适应计算行高与字号
      lineHeight = Math.min(52, Math.max(26, Math.floor(availableHeight / (lineCount + 0.5))));
      fontSize = Math.min(28, Math.max(17, Math.floor(lineHeight * 0.58)));

      // 垂直居中微调
      const totalColHeight = lineCount * lineHeight;
      if (availableHeight > totalColHeight) {
        currentY += Math.floor((availableHeight - totalColHeight) / 3);
      }

      ctx.fillStyle = "#1B1A18";
      ctx.font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
      ctx.letterSpacing = fontSize > 22 ? "4px" : "2.5px";

      for (let i = 0; i < lines.length; i++) {
        const text = lines[i];
        if (text.startsWith("【其")) {
          ctx.fillStyle = "#B83B2E";
          ctx.font = `bold ${fontSize - 1}px "KaiTi SC", "KaiTi", serif`;
          ctx.fillText(text, width / 2, currentY);
          ctx.fillStyle = "#1B1A18";
          ctx.font = `500 ${fontSize}px "Noto Serif SC", "Songti SC", serif`;
        } else {
          ctx.fillText(text, width / 2, currentY);
        }
        currentY += lineHeight;
      }
    }

    // 7. 落款与白文朱砂印章 (位置精算法，紧随正文末行，永不重叠)
    const colophonY = Math.min(currentY + 12, height - m - sealSize - 26);
    const sealX = width / 2 + (useDualColumn ? 140 : 130);

    ctx.fillStyle = "#4A453C";
    ctx.font = 'bold 20px "KaiTi SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = "right";
    ctx.fillText("周庸 题", sealX - 10, colophonY + sealSize / 2 + 5);

    // 绘制白文朱砂名章
    if (window.SealGenerator) {
      window.SealGenerator.drawSealOnCanvas(ctx, sealX, colophonY, sealSize, "周庸之印", "yin");
    }

    // 8. 底部防伪题注
    ctx.fillStyle = "#9C9384";
    ctx.font = '13.5px "Noto Serif SC", "Songti SC", sans-serif';
    ctx.textAlign = "center";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("《一个人的诗经》（作者：周庸）· 亲友门生雅玩珍藏", width / 2, height - m - 16);

    // 导出 DataURL
    const dataUrl = canvas.toDataURL("image/png");
    previewImg.src = dataUrl;

    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.download = `一个人的诗经_周庸_${currentPoem.title}.png`;
        link.href = dataUrl;
        link.click();
      };
    }
  }

  /**
   * 绘制古朴角花折线
   */
  function drawCornerBracket(ctx, x, y, size, dirX, dirY) {
    ctx.strokeStyle = "#B83B2E";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + size * dirY);
    ctx.lineTo(x, y);
    ctx.lineTo(x + size * dirX, y);
    ctx.stroke();
  }

  /**
   * Canvas 多行自动折行计算
   */
  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const chars = text.split("");
    const lines = [];
    let current = "";

    for (const char of chars) {
      const testLine = current + char;
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && current.length > 0) {
        lines.push(current);
        current = char;
      } else {
        current = testLine;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  return {
    openCardModal,
    closeCardModal,
    setRatio,
    renderCard
  };
})();

// 挂载到全局
window.CardExporter = CardExporter;
