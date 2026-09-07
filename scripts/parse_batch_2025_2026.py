#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
专门针对周庸先生《回乡曲》系列（2025）及客居感怀诗作（2026）的结构化解析入库脚本
"""

import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_FILE = ROOT_DIR / "data" / "raw_batch_2025_2026.txt"
POEMS_JSON = ROOT_DIR / "data" / "poems.json"
VOLUMES_JSON = ROOT_DIR / "data" / "volumes.json"

def main():
    with open(RAW_FILE, "r", encoding="utf-8") as f:
        text = f.read()

    # 读取已有 poems，保留基础诗作（过滤掉当前批次诗题以便纯净重载）
    with open(POEMS_JSON, "r", encoding="utf-8") as f:
        existing_all = json.load(f)

    # 仅保留非本批次的诗篇
    batch_titles_keywords = ["回乡曲之", "马年除夕寄语", "晨步遇雨", "定风波·浴海", "八月闲吟", "泰缅边境吟", "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别"]
    poems = [p for p in existing_all if not any(k in p["title"] for k in batch_titles_keywords)]

    # 找到目前最大的 id
    max_id = 0
    for p in poems:
        m = re.match(r"zy-(\d+)", p.get("id", ""))
        if m:
            max_id = max(max_id, int(m.group(1)))

    # 将文本拆分成各块
    lines = text.splitlines()
    
    current_section = "回乡曲"
    current_poem = None
    parsed_poems = []

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line == "---":
            i += 1
            continue

        if "《回乡曲》系列" in line:
            current_section = "回乡曲"
            i += 1
            continue
        elif "客居与感怀诗作" in line:
            current_section = "客居感怀"
            i += 1
            continue

        # 检测诗题: **标题** 或 **标题**（附注）
        m_title = re.match(r"^\*\*(.+?)\*\*(?:\s*[（\(](.+?)[）\)])?$", line)
        if m_title:
            if current_poem:
                parsed_poems.append(current_poem)
                current_poem = None

            raw_title = m_title.group(1).strip()
            extra_note = m_title.group(2).strip() if m_title.group(2) else ""
            title = raw_title
            notes = []
            if extra_note:
                notes.append(extra_note)
            subtitle = ""

            # 处理括号在星号内部的情况，如：回乡曲之134（原录作...）
            m_sub_note = re.match(r"^(.+?)[（\(](.+?)[）\)]$", raw_title)
            if m_sub_note:
                title = m_sub_note.group(1).strip()
                notes.append(m_sub_note.group(2).strip())

            # 确定体裁与卷目
            if "回乡曲" in title:
                vol_id = "vol-2"
                vol_name = "卷二·故园情愫"
                genre = "七绝·回乡曲"
                loc = "故里家乡"
                tags = ["回乡曲", "故里", "亲情", "慈母", "乡音", "2025"]
            elif "定风波" in title or "晨步遇雨" in title:
                vol_id = "vol-5"
                vol_name = "卷五·倚声填词"
                genre = "词曲·倚声"
                loc = "泰国"
                tags = ["词曲", "定风波", "自由", "客居", "2026"]
            else:
                vol_id = "vol-1"
                vol_name = "卷一·客海萍踪"
                genre = "古风感怀"
                loc = "泰国"
                tags = ["客居", "感怀", "暹罗", "自由", "2026"]

            current_poem = {
                "id": "",
                "title": title,
                "subtitle": subtitle,
                "genre": genre,
                "tune": "定风波" if "定风波" in title else "",
                "volume": vol_name,
                "volumeId": vol_id,
                "year": "2025" if current_section == "回乡曲" else "2026",
                "location": loc,
                "preface": "",
                "content": [],
                "notes": notes,
                "tags": tags
            }
            i += 1
            continue

        # 检查是否为副标题 / 说明，例如 *(仿苏轼《一蓑烟雨任平生》)* 或 *（钓一上午，无鱼上钩。空手而归！）*
        m_note = re.match(r"^\*[（\(](.+?)[）\)]\*$", line)
        if m_note and current_poem:
            note_content = m_note.group(1).strip()
            if "仿苏轼" in note_content:
                current_poem["subtitle"] = note_content
            else:
                current_poem["notes"].append(note_content)
            i += 1
            continue

        # 检查是否为日期，例如 *2025.10.18* 或 *2026.8.25*
        m_date = re.match(r"^\*(\d{4}\.\d{1,2}(?:\.\d{1,2})?)\*$", line)
        if m_date and current_poem:
            date_str = m_date.group(1)
            current_poem["year"] = date_str.split(".")[0]
            current_poem["notes"].append(f"作于 {date_str}")
            i += 1
            continue

        # 正文诗句
        if current_poem:
            # 清理行末标点或空格
            clean_line = line.strip()
            if clean_line:
                current_poem["content"].append(clean_line)

        i += 1

    if current_poem:
        parsed_poems.append(current_poem)

    # 细化每首诗的属性、地点与分类
    for p in parsed_poems:
        # 地点细化
        if "广州佛山" in p["title"] or any("广州佛山" in l for l in p["content"]):
            p["location"] = "广东佛山"
            p["tags"].append("佛山")
        elif "华欣" in p["title"] or "考新蕾发" in p["title"]:
            p["location"] = "泰国华欣"
            p["tags"].extend(["华欣", "考新蕾发", "九世王"])
        elif "泰缅边境" in p["title"]:
            p["location"] = "泰缅边境巴拉乌"
            p["tags"].extend(["泰缅边境", "巴拉乌", "自由"])
        elif "回乡曲" in p["title"]:
            if any("川大爷" in l or "川普" in l for l in p["content"]):
                p["location"] = "四川故里"
                p["tags"].append("方言")
            elif any("慈母" in l or "寿辰" in l for l in p["content"]):
                p["location"] = "故里母亲家"
                p["tags"].extend(["慈母九十八", "百岁寿"])

        # 诗体细化
        if len(p["content"]) == 4:
            line_len = len(re.sub(r"[，。！？、；：]", "", p["content"][0]))
            if line_len == 7:
                p["genre"] = "七言绝句"
            elif line_len == 5:
                p["genre"] = "五言绝句"
        elif len(p["content"]) > 8:
            first_len = len(re.sub(r"[，。！？、；：]", "", p["content"][0]))
            if first_len == 5:
                p["genre"] = "五言古风长歌"
            elif first_len == 7:
                p["genre"] = "七言古风长歌"
            else:
                p["genre"] = "古风杂言长歌"

    print(f"成功解析 {len(parsed_poems)} 首诗作：")
    added = 0
    for p in parsed_poems:
        # 查重检查
        dup_idx = next((idx for idx, ex in enumerate(poems) if ex["title"] == p["title"]), -1)
        if dup_idx != -1:
            print(f"  🔁 更新已有诗篇: 《{p['title']}》")
            p["id"] = poems[dup_idx]["id"]
            poems[dup_idx] = p
        else:
            max_id += 1
            p["id"] = f"zy-{max_id:03d}"
            poems.append(p)
            added += 1
            print(f"  ➕ 新增 [{p['id']}]: 《{p['title']}》 ({p['genre']}, {p['year']}) - 共 {len(p['content'])} 句")

    # 写回 poems.json
    with open(POEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(poems, f, ensure_ascii=False, indent=2)

    print(f"\n🎉 导入完成！新增 {added} 首，诗库现共有 {len(poems)} 首诗作。")

if __name__ == "__main__":
    main()
