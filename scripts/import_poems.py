#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
《周庸诗集》- 诗作批量导入辅助脚本 (scripts/import_poems.py)
用于将长辈提供的 txt/docx 诗稿批量解析、清洗并规范化写入 data/poems.json
=============================================================================
使用方法：
    python scripts/import_poems.py [可选: 诗稿文件路径，默认为 data/sample_input_poems.txt]
"""

import os
import sys
import json
import re
from pathlib import Path

# 获取项目根目录
ROOT_DIR = Path(__file__).resolve().parent.parent
POEMS_JSON_PATH = ROOT_DIR / "data" / "poems.json"
VOLUMES_JSON_PATH = ROOT_DIR / "data" / "volumes.json"
DEFAULT_INPUT_FILE = ROOT_DIR / "data" / "sample_input_poems.txt"

def load_existing_data():
    """读取已有的 poems.json 和 volumes.json"""
    poems = []
    if POEMS_JSON_PATH.exists():
        with open(POEMS_JSON_PATH, "r", encoding="utf-8") as f:
            try:
                poems = json.load(f)
            except json.JSONDecodeError:
                poems = []

    volumes = []
    if VOLUMES_JSON_PATH.exists():
        with open(VOLUMES_JSON_PATH, "r", encoding="utf-8") as f:
            try:
                volumes = json.load(f)
            except json.JSONDecodeError:
                volumes = []

    return poems, volumes

def parse_text_block(block_text):
    """
    解析单个诗词区块，支持键值对语法与自然文本排版
    """
    lines = [line.strip() for line in block_text.strip().split("\n") if line.strip()]
    if not lines:
        return None

    poem = {
        "id": "",
        "title": "",
        "subtitle": "",
        "genre": "诗词",
        "tune": "",
        "volume": "卷一·客海萍踪",
        "volumeId": "vol-1",
        "year": "",
        "location": "",
        "preface": "",
        "content": [],
        "notes": [],
        "tags": []
    }

    content_mode = False
    notes_mode = False

    for line in lines:
        # 检测是否进入正文段落
        if line.startswith("【正文】") or line.startswith("正文：") or line == "[正文]":
            content_mode = True
            notes_mode = False
            continue
        elif line.startswith("【注释】") or line.startswith("注释：") or line.startswith("【笺注】"):
            notes_mode = True
            content_mode = False
            continue

        # 解析显式属性标记
        m_title = re.match(r"^(?:【题目】|题目[：:]|诗题[：:])\s*(.*)", line)
        m_sub = re.match(r"^(?:【副题】|副题[：:]|副标题[：:])\s*(.*)", line)
        m_genre = re.match(r"^(?:【体裁】|体裁[：:]|诗体[：:])\s*(.*)", line)
        m_tune = re.match(r"^(?:【词牌】|词牌[：:]|曲牌[：:])\s*(.*)", line)
        m_vol = re.match(r"^(?:【卷目】|卷目[：:]|分卷[：:])\s*(.*)", line)
        m_year = re.match(r"^(?:【年份】|年份[：:]|年代[：:])\s*(.*)", line)
        m_loc = re.match(r"^(?:【地点】|地点[：:]|创作地[：:])\s*(.*)", line)
        m_pref = re.match(r"^(?:【序言】|序言[：:]|小引[：:]|题记[：:])\s*(.*)", line)
        m_tags = re.match(r"^(?:【标签】|标签[：:]|题材[：:])\s*(.*)", line)

        if m_title:
            poem["title"] = m_title.group(1).strip()
            content_mode = False
            notes_mode = False
        elif m_sub:
            poem["subtitle"] = m_sub.group(1).strip()
        elif m_genre:
            poem["genre"] = m_genre.group(1).strip()
        elif m_tune:
            poem["tune"] = m_tune.group(1).strip()
        elif m_vol:
            poem["volume"] = m_vol.group(1).strip()
        elif m_year:
            poem["year"] = m_year.group(1).strip()
        elif m_loc:
            poem["location"] = m_loc.group(1).strip()
        elif m_pref:
            poem["preface"] = m_pref.group(1).strip()
        elif m_tags:
            tag_str = m_tags.group(1).strip()
            poem["tags"] = [t.strip() for t in re.split(r"[,，、\s]+", tag_str) if t.strip()]
        elif notes_mode:
            poem["notes"].append(line)
        elif content_mode:
            poem["content"].append(line)
        else:
            # 未加标记的宽松格式容错：第一行若无标题则为标题，其余为正文
            if not poem["title"]:
                poem["title"] = line
            else:
                poem["content"].append(line)

    if not poem["title"] or not poem["content"]:
        return None

    return poem

def parse_input_file(filepath):
    """读取文本并切分成各诗块"""
    with open(filepath, "r", encoding="utf-8") as f:
        raw_text = f.read()

    # 诗篇之间以 === 或 --- 或空行分隔
    blocks = re.split(r"(?:\r?\n){2,}(?:[-=]{3,}(?:\r?\n)+)?", raw_text)
    parsed_poems = []

    for block in blocks:
        if not block.strip():
            continue
        p = parse_text_block(block)
        if p:
            parsed_poems.append(p)

    return parsed_poems

def main():
    input_file = sys.argv[1] if len(sys.argv) > 1 else str(DEFAULT_INPUT_FILE)
    print(f"📖 正在读取诗作源文件: {input_file}")

    if not os.path.exists(input_file):
        print(f"⚠️ 文件未找到: {input_file}")
        print("请在 data/ 目录下放置诗稿，或运行该脚本自动生成的示例文本。")
        return

    existing_poems, volumes = load_existing_data()
    parsed = parse_input_file(input_file)

    print(f"✨ 成功解析到 {len(parsed)} 首诗作。")

    # 分配规范化唯一 ID (如 zy-012, zy-013...)
    max_id_num = 0
    for p in existing_poems:
        m = re.match(r"zy-(\d+)", p.get("id", ""))
        if m:
            max_id_num = max(max_id_num, int(m.group(1)))

    added_count = 0
    for new_p in parsed:
        # 查重判断（按标题）
        dup = next((p for p in existing_poems if p["title"] == new_p["title"]), None)
        if dup:
            print(f"  ⏩ 跳过已存在的同名诗篇: 《{new_p['title']}》")
            continue

        max_id_num += 1
        new_p["id"] = f"zy-{max_id_num:03d}"

        # 匹配对应卷目 ID
        for vol in volumes:
            if vol["name"] in new_p["volume"] or new_p["volume"] in vol["name"]:
                new_p["volumeId"] = vol["id"]
                break

        existing_poems.append(new_p)
        added_count += 1
        print(f"  ✅ 新增: [{new_p['id']}] 《{new_p['title']}》 ({new_p['genre']})")

    # 写回 poems.json
    with open(POEMS_JSON_PATH, "w", encoding="utf-8") as f:
        json.dump(existing_poems, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 导入完成！本次新增 {added_count} 首，诗库现共有 {len(existing_poems)} 首诗篇。")
    print(f"💾 数据已更新至: {POEMS_JSON_PATH}")

if __name__ == "__main__":
    main()
