import os
import shutil
import asyncio
import qrcode
from PIL import Image, ImageDraw, ImageFont
from playwright.async_api import async_playwright

WORKSPACE = r"g:\My Drive\OneDrive\Kelvin_Documents\Antigravity_V2\zhouyong-poetry"
ARTIFACTS_DIR = r"C:\Users\Bo\.gemini\antigravity\brain\98d70abd-b9da-4a56-bca1-38741e977c8b"

DOMESTIC_INSTALL_URL = "https://zhouyongshiji-jpg.github.io/zhouyong-poetry/install.html"
DOMESTIC_HOMEPAGE_URL = "https://zhouyongshiji-jpg.github.io/zhouyong-poetry/"

OVERSEAS_INSTALL_URL = "https://zhouyong-poetry.zhouyongshiji.workers.dev/install.html"
OVERSEAS_HOMEPAGE_URL = "https://zhouyong-poetry.zhouyongshiji.workers.dev"

def make_qr_with_seal(url, save_paths):
    # 1. 生成纯二维码（带高容错 H 级别，确保各种手机在微信中一秒识别）
    qr = qrcode.QRCode(
        version=2,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=3,
    )
    qr.add_data(url)
    qr.make(fit=True)
    pure_qr_img = qr.make_image(fill_color="#1B1A18", back_color="#FFFFFF").convert("RGBA")
    qr_w, qr_h = pure_qr_img.size

    # 二维码正中心：朱砂金石印章（白字红底金边，大字厚重清秀）
    seal_size = int(qr_w * 0.22)
    seal_img = Image.new("RGBA", (seal_size, seal_size), (184, 59, 46, 255))
    draw = ImageDraw.Draw(seal_img)
    draw.rounded_rectangle([3, 3, seal_size - 4, seal_size - 4], radius=10, outline=(139, 38, 27, 255), width=2)
    draw.rounded_rectangle([7, 7, seal_size - 8, seal_size - 8], radius=7, outline=(229, 169, 60, 255), width=2)

    font_zhou = ImageFont.truetype("C:/Windows/Fonts/simkai.ttf", int(seal_size * 0.68))
    draw.text(
        (seal_size // 2, seal_size // 2 - 2),
        "周",
        font=font_zhou,
        fill=(253, 250, 243, 255),
        anchor="mm",
        stroke_width=1,
        stroke_fill=(253, 250, 243, 255),
    )

    pad = 6
    padded_seal = Image.new("RGBA", (seal_size + pad * 2, seal_size + pad * 2), (255, 255, 255, 255))
    padded_seal.paste(seal_img, (pad, pad), seal_img)

    pos = ((qr_w - padded_seal.size[0]) // 2, (qr_h - padded_seal.size[1]) // 2)
    pure_qr_img.paste(padded_seal, pos, padded_seal)

    for p in save_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        pure_qr_img.save(p)
        print("[OK] QR saved to:", p)


def build_card_html(homepage_url, qr_image_file, edition_badge_text):
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>《一个人的诗经》手机一键安装典藏卡</title>
  <style>
    :root {{
      --bg-color: #F5F2E9;
      --paper-card: #FDFBF7;
      --vermilion: #B83B2E;
      --gold-accent: #C5A059;
      --text-main: #23201D;
      --text-sub: #5E5850;
      --border-color: #DFD7C7;
      --font-serif: 'Kaiti SC', 'STKaiti', 'KaiTi', 'SimSun', serif;
      --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
      --font-mono: 'SF Pro Text', SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }}
    body {{
      background: var(--bg-color);
      color: var(--text-main);
      font-family: var(--font-serif);
      width: 560px;
      padding: 24px 20px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      -webkit-font-smoothing: antialiased;
    }}
    .poster-card {{
      background: var(--paper-card);
      border: 2px solid var(--border-color);
      border-radius: 22px;
      width: 100%;
      padding: 34px 24px 28px;
      text-align: center;
      position: relative;
      box-shadow: 0 12px 38px rgba(0,0,0,0.07);
    }}
    .inner-border {{
      position: absolute;
      inset: 8px;
      border: 1.5px dashed rgba(197, 160, 89, 0.45);
      border-radius: 16px;
      pointer-events: none;
    }}
    
    .top-seal {{
      margin: 0 auto 12px;
      width: 70px;
      height: 70px;
    }}
    h1 {{
      font-size: 34px;
      letter-spacing: 5px;
      color: var(--text-main);
      font-weight: bold;
      margin-bottom: 6px;
    }}
    .author-tag {{
      font-size: 18px;
      color: var(--vermilion);
      font-weight: bold;
      letter-spacing: 3px;
      margin-bottom: 6px;
    }}
    .sub-colophon {{
      font-size: 14px;
      color: var(--text-sub);
      letter-spacing: 1.2px;
      margin-bottom: 18px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(217, 210, 195, 0.85);
    }}

    .qr-box {{
      background: #FFFFFF;
      border: 2px solid var(--border-color);
      border-radius: 18px;
      padding: 14px;
      display: inline-block;
      box-shadow: 0 6px 20px rgba(0,0,0,0.06);
      margin-bottom: 14px;
    }}
    .qr-box img {{
      width: 235px;
      height: 235px;
      display: block;
    }}

    .action-pill {{
      background: var(--vermilion);
      color: #FFFFFF;
      font-size: 16.5px;
      font-weight: bold;
      letter-spacing: 1.5px;
      padding: 10px 24px;
      border-radius: 30px;
      display: inline-block;
      box-shadow: 0 4px 14px rgba(184, 59, 46, 0.35);
      margin-bottom: 20px;
      border: 1px solid #9B281C;
    }}

    .guide-section {{
      display: flex;
      flex-direction: column;
      gap: 13px;
      text-align: left;
      margin-bottom: 20px;
      font-family: var(--font-sans);
    }}
    .guide-card {{
      background: #FFFFFF;
      border: 1.5px solid var(--border-color);
      border-radius: 12px;
      padding: 14px 18px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }}
    .guide-card.apple {{
      border-left: 5px solid #1C1B1A;
    }}
    .guide-card.android {{
      border-left: 5px solid var(--vermilion);
    }}
    .guide-title {{
      font-size: 17.5px;
      font-weight: 700;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 8px;
    }}
    .guide-card.apple .guide-title {{
      color: #1C1B1A;
    }}
    .guide-card.android .guide-title {{
      color: var(--vermilion);
    }}
    .badge {{
      font-size: 12px;
      font-weight: normal;
      padding: 2px 9px;
      border-radius: 12px;
      background: #F0EDE5;
      color: #5E5850;
    }}
    .guide-card.android .badge {{
      background: #FBEBE8;
      color: var(--vermilion);
    }}
    
    .steps-list {{
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }}
    .step-item {{
      font-size: 15px;
      line-height: 1.65;
      color: #2D2926;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }}
    .step-num {{
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: #ECE7DC;
      color: #2D2926;
      font-size: 13.5px;
      font-weight: bold;
      flex-shrink: 0;
      margin-top: 1px;
    }}
    .guide-card.android .step-num {{
      background: #F8DDD9;
      color: var(--vermilion);
    }}
    .step-text {{
      flex: 1;
    }}
    .step-text strong {{
      color: var(--vermilion);
      font-weight: 700;
    }}
    .step-text .action-tag {{
      background: #F2EFE8;
      color: #1C1B1A;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 4px;
      border: 1px solid #DCD5C5;
      margin: 0 2px;
      font-size: 14.5px;
    }}

    .home-url-banner {{
      background: #FFFFFF;
      border: 1.5px solid var(--border-color);
      border-radius: 12px;
      padding: 13px 16px 11px;
      margin-bottom: 14px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
      font-family: var(--font-sans);
      text-align: center;
    }}
    .home-url-title {{
      font-size: 14.5px;
      font-weight: 700;
      color: #2C2825;
      margin-bottom: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }}
    .home-url-badge {{
      font-size: 11px;
      background: #E8F5E9;
      color: #2E7D32;
      border: 1px solid #A5D6A7;
      padding: 1px 7px;
      border-radius: 10px;
      font-weight: normal;
    }}
    .home-url-box {{
      background: #FAF7F0;
      border: 1px dashed rgba(184, 59, 46, 0.45);
      border-radius: 8px;
      padding: 7px 10px;
      font-family: var(--font-mono);
      font-size: 13.5px;
      font-weight: 700;
      color: var(--vermilion);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      letter-spacing: 0.2px;
      margin-bottom: 5px;
      user-select: all;
    }}
    .home-url-hint {{
      font-size: 12px;
      color: #7E776D;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }}

    .bottom-info {{
      font-size: 12.5px;
      color: var(--text-sub);
      line-height: 1.7;
      border-top: 1px dashed rgba(217, 210, 195, 0.85);
      padding-top: 12px;
      font-family: var(--font-serif);
    }}
    .features-tag {{
      color: var(--text-main);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.8px;
    }}
  </style>
</head>
<body>
  <div class="poster-card">
    <div class="inner-border"></div>

    <div class="top-seal">
      <svg viewBox="0 0 100 100" width="70" height="70">
        <rect x="4" y="4" width="92" height="92" rx="14" fill="#B83B2E" stroke="#8B261B" stroke-width="2"/>
        <rect x="10" y="10" width="80" height="80" rx="10" fill="none" stroke="#E5A93C" stroke-width="1.5" opacity="0.7"/>
        <text x="73" y="46" font-family="'Kaiti SC', 'STKaiti', 'KaiTi', serif" font-size="34" font-weight="bold" fill="#FBF8F1" text-anchor="middle">周</text>
        <text x="73" y="84" font-family="'Kaiti SC', 'STKaiti', 'KaiTi', serif" font-size="34" font-weight="bold" fill="#FBF8F1" text-anchor="middle">庸</text>
        <text x="27" y="46" font-family="'Kaiti SC', 'STKaiti', 'KaiTi', serif" font-size="34" font-weight="bold" fill="#FBF8F1" text-anchor="middle">之</text>
        <text x="27" y="84" font-family="'Kaiti SC', 'STKaiti', 'KaiTi', serif" font-size="34" font-weight="bold" fill="#FBF8F1" text-anchor="middle">印</text>
      </svg>
    </div>

    <h1>一个人的诗经</h1>
    <div class="author-tag">作者：周庸</div>
    <div class="sub-colophon">平生行吟寄心迹 · 亲友门生雅玩珍藏</div>

    <div class="qr-box">
      <img src="file:///{qr_image_file.replace(os.sep, '/')}" alt="诗集安装专属二维码">
    </div>

    <div>
      <div class="action-pill">
        👆 微信中长按图片 ➔ 识别图中二维码
      </div>
    </div>

    <div class="guide-section">
      <div class="guide-card apple">
        <div class="guide-title">
          <span>🍎 苹果手机（iPhone / iPad）</span>
          <span class="badge">Safari 桌面化</span>
        </div>
        <ul class="steps-list">
          <li class="step-item">
            <span class="step-num">1</span>
            <span class="step-text">长按识别二维码后，点击右上角<span class="action-tag">···</span>选择<strong>【在 Safari 中打开】</strong></span>
          </li>
          <li class="step-item">
            <span class="step-num">2</span>
            <span class="step-text">在 Safari 底部点击<strong>【分享 ⎋】</strong>图标 ➔ 选择<strong>【添加到主屏幕 ➕】</strong>即可！</span>
          </li>
        </ul>
      </div>

      <div class="guide-card android">
        <div class="guide-title">
          <span>🤖 安卓手机（华为 / 小米 / OPPO / vivo 等）</span>
          <span class="badge">极速安装</span>
        </div>
        <ul class="steps-list">
          <li class="step-item">
            <span class="step-num">1</span>
            <span class="step-text">长按识别二维码后，可直接点击<strong>【下载安卓安装包 (.apk)】</strong>一键安装桌面应用；</span>
          </li>
          <li class="step-item">
            <span class="step-num">2</span>
            <span class="step-text">或在 <strong>Chrome / 手机自带浏览器</strong> 中打开，点击菜单选择<strong>【添加到主屏幕】</strong>。</span>
          </li>
        </ul>
      </div>
    </div>

    <div class="home-url-banner">
      <div class="home-url-title">
        <span>🌐 诗集主页在线网址（长按可复制）</span>
        <span class="home-url-badge">{edition_badge_text}</span>
      </div>
      <div class="home-url-box">
        {homepage_url}
      </div>
      <div class="home-url-hint">
        <span>💡 微信中长按图片可提取文字复制 · 扫码进入后支持一键点击复制</span>
      </div>
    </div>

    <div class="bottom-info">
      <div class="features-tag">大字护眼 · 水墨竖排 · 闭目温和诵读 · 离线随身翻阅 · 亲友珍藏版</div>
    </div>
  </div>
</body>
</html>"""


async def generate_cards():
    # 1. 生成国内直连二维码
    domestic_qr_path = os.path.join(WORKSPACE, "周庸诗集·一键安装专属二维码(纯图).png")
    domestic_assets_qr = os.path.join(WORKSPACE, "assets", "qr_install_center.png")
    make_qr_with_seal(DOMESTIC_INSTALL_URL, [domestic_qr_path, domestic_assets_qr])

    # 2. 生成海外备用二维码
    overseas_qr_path = os.path.join(WORKSPACE, "周庸诗集·一键安装专属二维码(海外纯图).png")
    overseas_assets_qr = os.path.join(WORKSPACE, "assets", "qr_install_overseas.png")
    make_qr_with_seal(OVERSEAS_INSTALL_URL, [overseas_qr_path, overseas_assets_qr])

    # 3. Playwright 渲染生成典藏卡海报
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page(viewport={"width": 560, "height": 1120}, device_scale_factor=2)

        # A. 国内直连典藏卡（默认核心主卡）
        temp_html_domestic = os.path.join(WORKSPACE, "scripts", "temp_card_domestic.html")
        with open(temp_html_domestic, "w", encoding="utf-8") as f:
            f.write(build_card_html(DOMESTIC_HOMEPAGE_URL, domestic_assets_qr, "国内畅通直连"))

        await page.goto(f"file:///{temp_html_domestic.replace(os.sep, '/')}")
        await page.wait_for_timeout(600)
        
        poster_domestic = os.path.join(WORKSPACE, "周庸诗集·手机一键安装典藏卡.png")
        wechat_domestic = os.path.join(WORKSPACE, "周庸诗集·微信扫码典藏卡.png")
        await page.screenshot(path=poster_domestic, full_page=True)
        shutil.copyfile(poster_domestic, wechat_domestic)
        print("[OK] Domestic Poster Card saved:", poster_domestic)

        # Artifact domestic copy
        artifact_domestic = os.path.join(ARTIFACTS_DIR, "v191_wechat_install_card.png")
        shutil.copyfile(poster_domestic, artifact_domestic)

        # B. 海外备用典藏卡
        temp_html_overseas = os.path.join(WORKSPACE, "scripts", "temp_card_overseas.html")
        with open(temp_html_overseas, "w", encoding="utf-8") as f:
            f.write(build_card_html(OVERSEAS_HOMEPAGE_URL, overseas_assets_qr, "海外全球加速"))

        await page.goto(f"file:///{temp_html_overseas.replace(os.sep, '/')}")
        await page.wait_for_timeout(600)
        
        poster_overseas = os.path.join(WORKSPACE, "周庸诗集·手机一键安装典藏卡(海外版).png")
        await page.screenshot(path=poster_overseas, full_page=True)
        print("[OK] Overseas Poster Card saved:", poster_overseas)

        artifact_overseas = os.path.join(ARTIFACTS_DIR, "v191_overseas_install_card.png")
        shutil.copyfile(poster_overseas, artifact_overseas)

        await browser.close()

        # 清理临时 HTML
        if os.path.exists(temp_html_domestic):
            os.remove(temp_html_domestic)
        if os.path.exists(temp_html_overseas):
            os.remove(temp_html_overseas)

if __name__ == "__main__":
    asyncio.run(generate_cards())
