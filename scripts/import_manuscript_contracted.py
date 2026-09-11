#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《周庸诗集》四卷本精简手稿（一个人的诗经）安全入库与规范化脚本
====================================================================
适配 Antigravity 项目 (zhouyong-poetry) 数据架构：
- 第一辑：为恋人而歌 (2013) -> vol-hist-1
- 第二辑：行吟歌者 (2016-2025) -> vol-hist-2
- 第三辑：凉山放歌 (2009) -> vol-hist-3
- 第六辑：杂诗 -> vol-hist-6
(已自动剔除并隔离第四、五辑)

特性：
1. 零冲突合并：卷 ID 采用 vol-hist-* 命名空间，与现有 vol-1 ~ vol-5 完美共存。
2. 自动递增 ID：扫描 data/poems.json 中的最大 zy-### 编号，顺延分配，避免重号。
3. 查重排错：按标题及正文特征指纹自动去重，避免重复导入。
4. 格式合规：正文自动转为非空字符串数组，严格符合 validate_data.py 的 100% 通过标准。
====================================================================
使用方法：
  python scripts/import_manuscript_contracted.py [手稿路径.txt 或 .docx]
"""

import sys
import os
import re
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT_DIR / "data"
POEMS_JSON = DATA_DIR / "poems.json"
VOLUMES_JSON = DATA_DIR / "volumes.json"

# 4卷本规范卷目定义
NEW_VOLUMES = [
    {
        "id": "vol-hist-1",
        "name": "第一辑·为恋人而歌",
        "title": "为恋人而歌",
        "description": "2013年作，深情记录与妻子阿美的相知相爱、家庭生活与深挚情意。",
        "period": "2013",
        "foreword": "百花爱恋着春天，春风爱恋着杜鹃。生命旅途风景多，一路上我陪你走过。"
    },
    {
        "id": "vol-hist-2",
        "name": "第二辑·行吟歌者",
        "title": "行吟歌者",
        "description": "2016-2025年作，记录大江南北游历、邛海湿地行吟、南洋避秦客梦与时代感怀。",
        "period": "2016 - 2025",
        "foreword": "一壶消愁酒，闲云野鹤情悠悠。行吟四海，且将心事付碧水。"
    },
    {
        "id": "vol-hist-3",
        "name": "第三辑·凉山放歌",
        "title": "凉山放歌",
        "description": "2009年作，取材大凉山彝乡风情、山水灵秀与乡土歌谣，兼具民谣与长赋体裁。",
        "period": "2009",
        "foreword": "最大最圆是西昌月，最浓是索玛花香。山川胜景，放飞豪情。"
    },
    {
        "id": "vol-hist-6",
        "name": "第六辑·杂诗",
        "title": "杂诗感怀",
        "description": "早年及历年闲咏杂感，涵盖咏菊、读史、山水登临与友人唱和。",
        "period": "历年",
        "foreword": "闲情偶寄，借物舒怀。大笑三声释衷肠，小酒一盏解千愁。"
    }
]

def load_existing_data():
    poems = []
    volumes = []
    if POEMS_JSON.exists():
        with open(POEMS_JSON, "r", encoding="utf-8") as f:
            poems = json.load(f)
    if VOLUMES_JSON.exists():
        with open(VOLUMES_JSON, "r", encoding="utf-8") as f:
            volumes = json.load(f)
    return poems, volumes

def parse_text_to_poems(raw_text):
    """
    智能解析纯文本/Docx文本，识别卷目、标题、正文与日期注释
    """
    lines = raw_text.splitlines()
    parsed_poems = []
    
    current_vol_id = "vol-hist-1"
    current_vol_name = "第一辑·为恋人而歌"
    default_year = "2013"
    
    current_poem = None
    
    # 忽略目录页及敏感第四、五辑
    skip_mode = False
    
    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            continue
            
        # 卷目识别
        if re.search(r"^第[一1][辑輯]\s*为恋人而歌", line):
            current_vol_id = "vol-hist-1"
            current_vol_name = "第一辑·为恋人而歌"
            default_year = "2013"
            skip_mode = False
            continue
        elif re.search(r"^第[二2][辑輯]\s*行吟歌者", line):
            current_vol_id = "vol-hist-2"
            current_vol_name = "第二辑·行吟歌者"
            default_year = "2017"
            skip_mode = False
            continue
        elif re.search(r"^第[三3][辑輯]\s*凉山放歌", line):
            current_vol_id = "vol-hist-3"
            current_vol_name = "第三辑·凉山放歌"
            default_year = "2009"
            skip_mode = False
            continue
        elif re.search(r"^第[四4五5][辑輯]", line):
            skip_mode = True
            continue
        elif re.search(r"^第[六6][辑輯]\s*杂诗", line):
            current_vol_id = "vol-hist-6"
            current_vol_name = "第六辑·杂诗"
            default_year = "历年"
            skip_mode = False
            continue
            
        if skip_mode:
            continue
            
        # 日期检测 (如 2013.4.22.12.43 或 2017，10，18 或 2024,12,18)
        m_date = re.match(r"^(\d{4})[，,\.·/](\d{1,2})([，,\.·/](\d{1,2}))?", line)
        if m_date and current_poem:
            year_val = m_date.group(1)
            current_poem["notes"].append(f"作于 {line}")
            current_poem["year"] = year_val
            continue
            
        # 标题检测逻辑
        is_title = False
        if line.startswith("【题目】") or line.startswith("诗题："):
            title_text = re.sub(r"^(【题目】|诗题：)\s*", "", line)
            is_title = True
        elif len(line) <= 24 and not any(p in line for p in ["，", "。", "！", "？", "、"]) and not line.startswith("其"):
            # 简短无标点行判定为候选诗题
            if current_poem is None or len(current_poem["content"]) >= 2:
                title_text = line
                is_title = True
        elif line.startswith("其") and len(line) <= 6:
            # 组诗子篇
            if current_poem:
                title_text = f"{current_poem['title']}·{line}"
                is_title = True
            
        if is_title:
            if current_poem and current_poem["content"]:
                parsed_poems.append(current_poem)
            current_poem = {
                "title": title_text,
                "subtitle": "",
                "genre": "诗歌",
                "tune": "",
                "volume": current_vol_name,
                "volumeId": current_vol_id,
                "year": default_year,
                "location": "四川西昌" if "凉山" in current_vol_name else ("泰国" if "行吟" in current_vol_name else "客居"),
                "preface": "",
                "content": [],
                "notes": [],
                "tags": [current_vol_name.split("·")[-1]]
            }
            continue
            
        # 正文行
        if current_poem:
            # 过滤干扰标记
            if not line.startswith("目录") and not re.search(r"^[Pp]\d+—[Pp]\d+", line):
                current_poem["content"].append(line)
                
    if current_poem and current_poem["content"]:
        parsed_poems.append(current_poem)
        
    return parsed_poems

def main():
    print("=" * 65)
    print("《周庸诗集》四卷精简版数据安全入库流程启动")
    print("=" * 65)
    
    existing_poems, existing_volumes = load_existing_data()
    print(f"当前项目已有诗作: {len(existing_poems)} 首 | 已有卷目: {len(existing_volumes)} 卷")
    
    # 查找最大 ID
    max_id_num = 0
    for p in existing_poems:
        m = re.match(r"^zy-(\d+)$", p.get("id", ""))
        if m:
            max_id_num = max(max_id_num, int(m.group(1)))
    print(f"当前最高诗作编号: zy-{max_id_num:03d}")
    
    # 注册新卷目 (若不存在)
    vol_ids = {v["id"] for v in existing_volumes}
    added_vols = 0
    for nv in NEW_VOLUMES:
        if nv["id"] not in vol_ids:
            existing_volumes.append(nv)
            vol_ids.add(nv["id"])
            added_vols += 1
    if added_vols > 0:
        print(f"成功注入 {added_vols} 个独立历史卷目 (vol-hist-1/2/3/6)")
        
    # 输入手稿文件
    input_file = sys.argv[1] if len(sys.argv) > 1 else str(DATA_DIR / "raw_contracted_manuscript.txt")
    if not os.path.exists(input_file):
        print(f"提示: 请将精简手稿另存为 {input_file} 后再次运行本脚本。")
        return
        
    with open(input_file, "r", encoding="utf-8", errors="ignore") as f:
        raw_text = f.read()
        
    parsed_new = parse_text_to_poems(raw_text)
    print(f"从手稿中成功解析到 {len(parsed_new)} 篇诗作。")
    
    # 排重并分配 ID
    seen_sigs = set()
    for p in existing_poems:
        c_str = "".join(p.get("content", []))[:25]
        seen_sigs.add(f"{p.get('title','')}@@{c_str}")
        
    appended_count = 0
    for p in parsed_new:
        c_str = "".join(p["content"])[:25]
        sig = f"{p['title']}@@{c_str}"
        if sig in seen_sigs:
            continue
            
        max_id_num += 1
        p["id"] = f"zy-{max_id_num:03d}"
        existing_poems.append(p)
        seen_sigs.add(sig)
        appended_count += 1
        
    print(f"成功新增无冲突诗作: {appended_count} 首 (新编号至 zy-{max_id_num:03d})")
    
    # 写回文件
    with open(POEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(existing_poems, f, ensure_ascii=False, indent=2)
    with open(VOLUMES_JSON, "w", encoding="utf-8") as f:
        json.dump(existing_volumes, f, ensure_ascii=False, indent=2)
        
    print("data/poems.json 与 data/volumes.json 已安全更新完毕！")
    print("=" * 65)

if __name__ == "__main__":
    main()
