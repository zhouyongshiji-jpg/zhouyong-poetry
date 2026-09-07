/**
 * ==========================================================================
 * 《周庸诗集》- 朱砂篆刻印章动态生成器 (js/seal.js)
 * 纯算法生成文人石印效果（支持白文/阴刻、朱文/阳刻，微风化石纹边缘）
 * ==========================================================================
 */

const SealGenerator = (function () {
  // 经典朱砂红色彩定义
  const VERMILION_BG = "#B83B2E";
  const VERMILION_DARK = "#9E2F23";
  const SEAL_WHITE = "#FAF6ED";

  /**
   * 生成印章 SVG 字符串或元素
   * @param {Object} options
   * @param {string} options.text 印文内容（默认 "周庸之印"）
   * @param {number} options.size 尺寸 (px)
   * @param {string} options.style 'yin' (阴刻/白文，红底白字) 或 'yang' (阳刻/朱文，白底红字)
   * @param {string} options.shape 'square' (方印) 或 'round' (圆印)
   * @returns {string} SVG HTML
   */
  function createSealSVG({
    text = "周庸之印",
    size = 72,
    style = "yin",
    shape = "square"
  } = {}) {
    const chars = text.split("").slice(0, 4);
    // 篆印排字规矩：右上、右下、左上、左下 (或右上、左上、右下、左下)
    // 4字印：
    // [0, 2] -> 读序：0在右上，1在右下，2在左上，3在左下 (传统回文读法)
    // 或 标准直读：
    // 字0: 右上, 字1: 右下, 字2: 左上, 字3: 左下
    let c0 = chars[0] || "周";
    let c1 = chars[1] || "庸";
    let c2 = chars[2] || "之";
    let c3 = chars[3] || "印";

    const isYin = style === "yin";
    const bgFill = isYin ? VERMILION_BG : "transparent";
    const textFill = isYin ? SEAL_WHITE : VERMILION_BG;
    const borderStroke = VERMILION_BG;

    const borderRadius = shape === "round" ? size / 2 : 4;

    return `
      <svg class="seal-svg" width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${text}">
        <defs>
          <!-- 模拟金石刀刻微风化滤镜 -->
          <filter id="seal-distress-${size}" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise"/>
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="2.5" xChannelSelector="R" yChannelSelector="G"/>
          </filter>
        </defs>

        <g filter="url(#seal-distress-${size})">
          <!-- 印章基底外框 -->
          <rect x="4" y="4" width="92" height="92" rx="${borderRadius}" ry="${borderRadius}" 
                fill="${bgFill}" stroke="${borderStroke}" stroke-width="4.5" />
          
          <!-- 传统界格十字细线 (若为阳刻且四字) -->
          ${!isYin ? `<line x1="50" y1="8" x2="50" y2="92" stroke="${VERMILION_BG}" stroke-width="1.8" />
                      <line x1="8" y1="50" x2="92" y2="50" stroke="${VERMILION_BG}" stroke-width="1.8" />` : ""}

          <!-- 四字篆体/楷体排列 (右上为首字) -->
          <g font-family="'Kaiti SC', 'STKaiti', 'KaiTi', 'Noto Serif SC', serif" font-weight="900" font-size="34" fill="${textFill}" text-anchor="middle" dominant-baseline="central">
            <!-- 右上 -->
            <text x="73" y="28">${c0}</text>
            <!-- 右下 -->
            <text x="73" y="72">${c1}</text>
            <!-- 左上 -->
            <text x="27" y="28">${c2}</text>
            <!-- 左下 -->
            <text x="27" y="72">${c3}</text>
          </g>
        </g>
      </svg>
    `;
  }

  /**
   * 在 Canvas 上直接绘制印章（用于朋友圈美图雅卡生成）
   */
  function drawSealOnCanvas(ctx, x, y, size = 64, text = "周庸之印", style = "yin") {
    ctx.save();
    ctx.translate(x, y);

    const isYin = style === "yin";
    const border = 3.5;

    // 绘制微风化边框
    ctx.fillStyle = isYin ? VERMILION_BG : "#FAF6ED";
    ctx.strokeStyle = VERMILION_BG;
    ctx.lineWidth = border;

    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, 4);
    if (isYin) {
      ctx.fill();
    }
    ctx.stroke();

    // 绘制内部十字线 (阳刻时)
    if (!isYin) {
      ctx.beginPath();
      ctx.moveTo(size / 2, border);
      ctx.lineTo(size / 2, size - border);
      ctx.moveTo(border, size / 2);
      ctx.lineTo(size - border, size / 2);
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    // 排版文字
    const chars = text.split("").slice(0, 4);
    const c0 = chars[0] || "周";
    const c1 = chars[1] || "庸";
    const c2 = chars[2] || "之";
    const c3 = chars[3] || "印";

    ctx.fillStyle = isYin ? SEAL_WHITE : VERMILION_BG;
    ctx.font = `bold ${Math.round(size * 0.38)}px "Kaiti SC", "STKaiti", "KaiTi", "Noto Serif SC", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const q1 = size * 0.28;
    const q3 = size * 0.72;

    // 右上 c0, 右下 c1, 左上 c2, 左下 c3
    ctx.fillText(c0, q3, q1);
    ctx.fillText(c1, q3, q3);
    ctx.fillText(c2, q1, q1);
    ctx.fillText(c3, q1, q3);

    ctx.restore();
  }

  return {
    createSealSVG,
    drawSealOnCanvas
  };
})();

// 挂载到全局
window.SealGenerator = SealGenerator;
