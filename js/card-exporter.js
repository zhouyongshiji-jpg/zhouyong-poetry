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
   * 高清 Canvas 绘制
   */
  function renderCard() {
    if (!currentPoem) return;

    const previewImg = document.getElementById("cardPreviewImg");
    const downloadBtn = document.getElementById("btnDownloadCard");
    if (!previewImg) return;

    // 基础尺寸定义 (2x 视网膜高清)
    let width = 800;
    let height = 1066; // 3:4 比例

    if (currentRatio === "square") {
      height = 800;
    } else if (currentRatio === "scroll") {
      // 动态根据诗句长度计算高度
      const lineCount = (currentPoem.content || []).length;
      height = Math.max(1100, 700 + lineCount * 55);
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 1. 绘制宣纸底色与纸纹
    ctx.fillStyle = "#F8F4EA";
    ctx.fillRect(0, 0, width, height);

    // 宣纸细腻杂质噪点与微渐变
    const paperGrad = ctx.createLinearGradient(0, 0, width, height);
    paperGrad.addColorStop(0, "rgba(253, 251, 247, 0.95)");
    paperGrad.addColorStop(1, "rgba(240, 234, 218, 0.9)");
    ctx.fillStyle = paperGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 绘制古典传统边框（外细内双，古籍开本规制）
    const m = 36; // 边距
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
    ctx.font = 'bold 22px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.textAlign = "center";
    ctx.letterSpacing = "3px";
    const volumeText = `《周庸诗集》· ${currentPoem.volume || "吟草"}`;
    ctx.fillText(volumeText, width / 2, m + 46);

    // 4. 诗题
    ctx.fillStyle = "#1F1E1B";
    ctx.font = 'bold 38px "Noto Serif SC", "Songti SC", "STSong", serif';
    ctx.letterSpacing = "4px";
    ctx.fillText(currentPoem.title, width / 2, m + 105);

    // 副标题/曲牌（若有）
    let currentY = m + 145;
    if (currentPoem.subtitle || currentPoem.tune) {
      ctx.fillStyle = "#5E584E";
      ctx.font = 'normal 22px "Noto Serif SC", "KaiTi", serif';
      const sub = currentPoem.tune ? `【${currentPoem.tune}】` : currentPoem.subtitle;
      ctx.fillText(sub, width / 2, currentY);
      currentY += 38;
    }

    // 创作信息（年代·地点·体裁）
    ctx.fillStyle = "#877E71";
    ctx.font = 'normal 18px "Noto Serif SC", "Songti SC", serif';
    const metaParts = [];
    if (currentPoem.year) metaParts.push(`${currentPoem.year}年`);
    if (currentPoem.location) metaParts.push(currentPoem.location);
    if (currentPoem.genre) metaParts.push(currentPoem.genre);
    ctx.fillText(metaParts.join(" · "), width / 2, currentY);
    currentY += 30;

    // 细分割线
    ctx.strokeStyle = "#DDD2BE";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 80, currentY);
    ctx.lineTo(width / 2 + 80, currentY);
    ctx.stroke();
    currentY += 28;

    // 5. 序言（若有）
    if (currentPoem.preface && currentRatio !== "square") {
      ctx.fillStyle = "#6B6457";
      ctx.font = 'italic 19px "KaiTi SC", "STKaiti", "KaiTi", serif';
      const prefaceLines = wrapText(ctx, `小引：${currentPoem.preface}`, width - 180);
      for (const pLine of prefaceLines) {
        ctx.fillText(pLine, width / 2, currentY);
        currentY += 28;
      }
      currentY += 16;
    }

    // 6. 诗词正文
    ctx.fillStyle = "#1B1A18";
    ctx.font = '500 28px "Noto Serif SC", "Songti SC", serif';
    ctx.letterSpacing = "4px";

    const lines = currentPoem.content || [];
    const lineHeight = lines.length > 8 ? 44 : 52;

    // 垂直居中微调计算
    const contentTotalHeight = lines.length * lineHeight;
    const availableSpace = (height - m - 120) - currentY;
    if (availableSpace > contentTotalHeight) {
      currentY += (availableSpace - contentTotalHeight) / 3;
    }

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], width / 2, currentY);
      currentY += lineHeight;
    }

    // 7. 落款与朱砂印章
    const sealSize = 64;
    const colophonY = Math.min(currentY + 20, height - m - 80);
    
    // 题字："周庸 题"
    ctx.fillStyle = "#4A453C";
    ctx.font = 'bold 22px "KaiTi SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = "right";
    const sealX = width / 2 + 130;
    ctx.fillText("周庸 题", sealX - 12, colophonY + sealSize / 2 + 6);

    // 绘制白文朱砂名章
    if (window.SealGenerator) {
      window.SealGenerator.drawSealOnCanvas(ctx, sealX, colophonY, sealSize, "周庸之印", "yin");
    }

    // 8. 底部防伪题注
    ctx.fillStyle = "#9C9384";
    ctx.font = '14px "Noto Serif SC", "Songti SC", sans-serif';
    ctx.textAlign = "center";
    ctx.letterSpacing = "1.5px";
    ctx.fillText("《周庸诗集》数字诗馆 · 亲友雅玩珍藏", width / 2, height - m - 20);

    // 导出 DataURL
    const dataUrl = canvas.toDataURL("image/png");
    previewImg.src = dataUrl;

    if (downloadBtn) {
      downloadBtn.onclick = () => {
        const link = document.createElement("a");
        link.download = `周庸诗词_${currentPoem.title}.png`;
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
