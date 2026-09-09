#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《周庸诗集》全集编译与结构化处理脚本 (scripts/compile_all_poems.py)
收录周老先生 100% 亲笔真迹，全集按编年与题材分为纯真迹五大卷：
1. 卷一·去国行与南洋客梦 (2018 - 2024)
2. 卷二·流浪者竹枝词 (2025.05 - 2025.08)
3. 卷三·回乡曲与慈母寿 (2025.08 - 2025.11)
4. 卷四·游子吟与泰北行 (2026.02 - 2026.03)
5. 卷五·暹罗长歌与晚晴行 (2025 - 2026)
"""

import json
import re
from pathlib import Path
from collections import OrderedDict

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_BATCH_63 = ROOT_DIR / "data" / "raw_batch_2025_08_and_2026.txt"
RAW_BATCH_46 = ROOT_DIR / "data" / "raw_batch_2025_2026.txt"
RAW_BATCH_NEW = ROOT_DIR / "data" / "raw_batch_2026_09_09.txt"
POEMS_JSON = ROOT_DIR / "data" / "poems.json"
VOLUMES_JSON = ROOT_DIR / "data" / "volumes.json"

# 周庸先生纯真迹五大卷架构定义
VOLUMES = [
  {
    "id": "vol-1",
    "name": "卷一·去国行与南洋客梦",
    "title": "沧桑去国与南洋初歇",
    "description": "2018年-2024年作。收录去国前夕云南抚仙湖诗五首、海外夜市饮酒歌、游侬帕兰寺、晨绕拷桃、贺铁流之子大婚、泼水节狂欢、痛悼铁流、中秋家宴、重游普吉岛及时代世相针砭十七首。",
    "period": "2018 - 2024",
    "foreword": "去国流亡，关山难越。抚仙湖畔琉璃万顷，依稀旧梦；南洋异邦椰风蕉雨，独酌行吟。悼昔贤，贺良友，感世事之翻覆，记漂泊之微痕。"
  },
  {
    "id": "vol-2",
    "name": "卷二·流浪者竹枝词",
    "title": "时代悲歌与世相针砭",
    "description": "2025年5月-8月客居南洋作。全集完整收录《流浪者竹枝词之一》至《之158》，涵盖避秦求存、就医自嘲、拷汪宫记游、祈雨孝道、泰柬之争、俄乌战事、江油校园之痛与时代世相针砭一百四十一首。",
    "period": "2025.05 - 2025.08",
    "foreword": "乙巳夏秋，客寓暹罗。目击世风日下，战乱频仍，百姓罹难。聊效刘禹锡竹枝体，口语入韵，谐谑其表，痛彻其里，敢为苍生言真话，不作歌德昧良心。"
  },
  {
    "id": "vol-3",
    "name": "卷三·回乡曲与慈母寿",
    "title": "神州故土与九八仙寿",
    "description": "2025年8月-11月归国探亲作。全集完整收录《回乡曲之001》至《之142》，深情记录一口川普返故园、老母倚门迎儿、长兄手足、同窗佳宴、大凉山故地、泸山古刹访友、九十八岁慈母仙寿、遵母令拒礼金、弟侄拼酒老屋宿醉与门前鱼塘垂钓一百二十四首。",
    "period": "2025.08 - 2025.11",
    "foreword": "少小离家，老大归来。慈母仙寿九十八，目盲耳聋，倚门迎儿，闻儿归泪淋淋。膝下承欢，醉歌长短。举目故园，人事全非，唯母恩深如东海。"
  },
  {
    "id": "vol-4",
    "name": "卷四·游子吟与泰北行",
    "title": "泰北纪行与佛国春色",
    "description": "2026年2月-3月游历泰北作。涵盖清迈古城、塔佩红墙、登素贴山双龙寺、访清莱孟莱王铜像，并录情人节练字、大年初一华欣欢腾与初春感怀二十七首。",
    "period": "2026.02 - 2026.03",
    "foreword": "丙午新春，策杖泰北。漫步塔佩红墙，登素贴山瞰人间，访清莱谒孟王。佛国安详，草木含情，聊写游子逍遥逸兴。"
  },
  {
    "id": "vol-5",
    "name": "卷五·暹罗长歌与晚晴行",
    "title": "异邦客梦与浩瀚海天",
    "description": "2025年-2026年居泰国作。收录今日咖啡馆随吟、美臀篇、四吟金链花、元旦海滩陷沙记、马年除夕寄语、再吟金链花、泰缅边塞行、五二零寄母、那日的纪念、八月闲吟、暗夜独饮、华欣考新蕾发留别诸长歌二十首。",
    "period": "2025 - 2026",
    "foreword": "避秦求真，浪迹华欣。面对浩瀚大洋，常夜独酌，长歌当哭。岁月无情，文心不死，虽流落天涯，孤芳自赏，何惧之有。"
  }
]

# 严格黑名单（仅针对旧版本测试时混入的虚拟样板诗与非诗标题）
BLACKLIST_TITLES = {
    "与诸友九溪十八涧踏青",
    "唐人街岁暮偶感",
    "客居与感怀诗作",
    "寄赠泰国文友素拉蓬先生",
    "小院春茶试新泉",
    "曼谷湄南河秋夕感怀",
    "清迈素帖山观瀑偶题",
    "登黄鹤楼怀古",
    "秋窗夜读感怀",
    "芭提雅登高望海",
    "重过江南忆旧游",
    "题赠曼谷崇华中文学校",
    "水调歌头·中秋望月",
    "鹧鸪天·春雨初晴",
    "客居与感怀诗作（2026年）"
}

def extract_date_from_line(l):
    """解析多样化手稿日期，含中文逗号、漏点与后缀"""
    l_str = l.strip()
    m = re.match(r"^(\d{4})[，,\.·\*](\d{1,2})[，,\.·\*](\d{1,2})(?:[\s，,·\*].*)?$", l_str)
    if m:
        return f"{m.group(1)}.{int(m.group(2))}.{int(m.group(3))}", m.group(1)
    m2 = re.match(r"^(\d{4})[，,\.·\*](\d{1})(\d{2})$", l_str)
    if m2:
        return f"{m2.group(1)}.{int(m2.group(2))}.{int(m2.group(3))}", m2.group(1)
    return None, None

def parse_existing_batches():
    """解析第一、二批手稿（2025.08竹枝词、回乡曲107-142、游子吟、2026长歌）"""
    poems = []
    
    # 解析 raw_batch_2025_08_and_2026.txt
    if RAW_BATCH_63.exists():
        with open(RAW_BATCH_63, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()
        
        curr_p = None
        i = 0
        while i < len(lines):
            l = lines[i].strip()
            if not l or l == "---":
                i += 1
                continue
            if any(h in l for h in ["《流浪者竹枝词》系列", "2026年新春与初春寄怀", "《游子吟》系列", "客居闲吟与时政诗作"]):
                i += 1
                continue

            # 检测标题
            is_title = False
            raw_title = ""
            if l.startswith("流浪者竹枝词之") or l.startswith("游子吟之") or l in [
                "情人节抒怀", "年夜饭", "大年初一吟", "又见金链花",
                "再吟金链花", "泰缅边塞行", "咖啡馆随吟", "五二O随吟", "那日的纪念", "七月闲吟"
            ]:
                if l not in BLACKLIST_TITLES:
                    is_title = True
                    raw_title = l

            if is_title:
                if curr_p and curr_p["content"]:
                    poems.append(curr_p)
                title = raw_title
                subtitle = ""
                notes = []
                m_brace = re.match(r"^(.+?)[（\(](.+?)[）\)]$", raw_title)
                if m_brace:
                    title = m_brace.group(1).strip()
                    subtitle = m_brace.group(2).strip()
                
                curr_p = {
                    "title": title,
                    "subtitle": subtitle,
                    "preface": "",
                    "content": [],
                    "notes": notes,
                    "year": "2025" if "竹枝词" in title else "2026",
                    "location": "泰国",
                    "genre": "绝句",
                    "tags": []
                }
                i += 1
                continue

            d_str, yr = extract_date_from_line(l)
            if d_str and curr_p:
                curr_p["notes"].append(f"作于 {d_str}")
                curr_p["year"] = yr
                i += 1
                continue

            if curr_p:
                clean_l = l.strip()
                if clean_l and clean_l not in BLACKLIST_TITLES:
                    if clean_l == "一":
                        clean_l = "【其一】"
                    elif clean_l == "二":
                        clean_l = "【其二】"
                    curr_p["content"].append(clean_l)
            i += 1
        if curr_p and curr_p["content"]:
            poems.append(curr_p)

    # 解析 raw_batch_2025_2026.txt (回乡曲107-142与长歌10首)
    if RAW_BATCH_46.exists():
        with open(RAW_BATCH_46, "r", encoding="utf-8") as f:
            lines = f.read().splitlines()

        curr_p = None
        i = 0
        while i < len(lines):
            l = lines[i].strip()
            if not l or l == "---":
                i += 1
                continue
            if any(h in l for h in ["《回乡曲》系列", "客居与感怀诗作"]):
                i += 1
                continue

            is_title = False
            raw_title = ""
            m_star = re.match(r"^\*\*(.+?)\*\*(?:\s*[（\(](.+?)[）\)])?$", l)
            if m_star:
                raw_title = m_star.group(1).strip()
                if m_star.group(2):
                    raw_title += f"（{m_star.group(2).strip()}）"
                if raw_title not in BLACKLIST_TITLES:
                    is_title = True
            elif l.startswith("回乡曲之") or l in [
                "马年除夕寄语", "晨步遇雨", "定风波·浴海", "八月闲吟", "泰缅边境吟",
                "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别"
            ]:
                if l not in BLACKLIST_TITLES:
                    is_title = True
                    raw_title = l

            if is_title:
                if curr_p and curr_p["content"]:
                    poems.append(curr_p)
                title = raw_title
                subtitle = ""
                notes = []
                m_brace = re.match(r"^(.+?)[（\(](.+?)[）\)]$", raw_title)
                if m_brace:
                    title = m_brace.group(1).strip()
                    subtitle = m_brace.group(2).strip()
                
                curr_p = {
                    "title": title,
                    "subtitle": subtitle,
                    "preface": "",
                    "content": [],
                    "notes": notes,
                    "year": "2025" if "回乡曲" in title else "2026",
                    "location": "四川故里" if "回乡曲" in title else "泰国",
                    "genre": "绝句",
                    "tags": []
                }
                i += 1
                continue

            d_str, yr = extract_date_from_line(l)
            if d_str and curr_p:
                curr_p["notes"].append(f"作于 {d_str}")
                curr_p["year"] = yr
                i += 1
                continue

            m_note = re.match(r"^[\*]?[（\(](.+?)[）\)][\*]?$", l)
            if m_note and curr_p:
                n_str = m_note.group(1).strip()
                if "仿苏轼" in n_str:
                    curr_p["subtitle"] = n_str
                else:
                    curr_p["notes"].append(n_str)
                i += 1
                continue

            if curr_p:
                clean_l = l.strip()
                if clean_l and clean_l not in BLACKLIST_TITLES:
                    if clean_l == "一":
                        clean_l = "【其一】"
                    elif clean_l == "二":
                        clean_l = "【其二】"
                    curr_p["content"].append(clean_l)
            i += 1
        if curr_p and curr_p["content"]:
            poems.append(curr_p)

    return poems

def parse_new_batch():
    """解析 2026-09-09 最新一批手稿（去国篇、早年竹枝词、回乡曲前半部等）"""
    if not RAW_BATCH_NEW.exists():
        return []

    text = RAW_BATCH_NEW.read_text(encoding="utf-8")
    messages = re.split(r"(?:公正周\s+\d{1,2}:\d{2}|—————\s+\d{4}-\d{2}-\d{2}\s+—————)", text)
    clean_msgs = [m.strip() for m in messages if m.strip() and m.strip() != "<"]

    new_poems = []

    for block in clean_msgs:
        lines = [l.strip() for l in block.splitlines() if l.strip() and not l.startswith("公正周") and l != "<"]
        if not lines:
            continue

        # 1. 抚仙湖诗五首
        if any("抚仙湖诗" in l or "抚仙湖" in l for l in lines[:2]):
            preface = ""
            curr_p = None
            for l in lines:
                if "抚仙湖诗五首" in l:
                    continue
                if l.startswith("(") and l.endswith(")"):
                    preface = l[1:-1].strip()
                    continue
                m_sub = re.match(r"^(其[一二三四五])$", l)
                if m_sub:
                    if curr_p:
                        new_poems.append(curr_p)
                    s_lbl = m_sub.group(1)
                    curr_p = {
                        "title": f"抚仙湖诗五首（{s_lbl}）",
                        "subtitle": s_lbl,
                        "preface": preface,
                        "content": [],
                        "notes": [],
                        "year": "2018",
                        "location": "云南抚仙湖",
                        "genre": "五言绝句" if s_lbl in ["其一", "其三", "其四"] else "七言绝句",
                        "tags": ["抚仙湖", "云南", "客居", "2018"]
                    }
                    continue
                d_str, yr = extract_date_from_line(l)
                if d_str and curr_p:
                    curr_p["notes"].append(f"作于 {d_str}")
                    curr_p["year"] = yr
                    continue
                if curr_p:
                    curr_p["content"].append(l)
            if curr_p:
                new_poems.append(curr_p)
            continue

        # 2. 回乡曲 blocks
        if any(re.search(r"(?:回乡曲|曲乡曲|一乡曲|乡曲)之(?:0回)?\d+", l) for l in lines):
            curr_p = None
            for l in lines:
                m_hx = re.match(r"^(?:回乡曲|曲乡曲|一乡曲|乡曲)之(?:0回)?(\d+)(?:\((.+?)\))?$", l)
                if m_hx:
                    if curr_p:
                        new_poems.append(curr_p)
                    num = int(m_hx.group(1))
                    sub = m_hx.group(2) or ""
                    curr_p = {
                        "title": f"回乡曲之{num:03d}",
                        "subtitle": sub,
                        "preface": "",
                        "content": [],
                        "notes": [],
                        "year": "2025",
                        "location": "四川故里",
                        "genre": "七言绝句",
                        "tags": ["回乡曲", "慈母", "故乡", "2025"]
                    }
                    continue
                d_str, yr = extract_date_from_line(l)
                if d_str and curr_p:
                    curr_p["notes"].append(f"作于 {d_str}")
                    curr_p["year"] = yr
                    continue
                if curr_p:
                    curr_p["content"].append(l)
            if curr_p:
                new_poems.append(curr_p)
            continue

        # 3. 流浪者竹枝词 blocks
        is_zz = any("竹枝词" in l or "竹枝" in l or re.match(r"^之[0-9一二三四五六七八九十]+", l) for l in lines)
        if is_zz:
            curr_p = None
            for l in lines:
                if l in ["流浪者竹枝词", "流浪者竹枝"]:
                    continue
                m_zz = re.match(r"^(?:流浪者竹枝(?:词)?)?之([0-9一二三四五六七八九十]+)(?:\((.+?)\))?$", l)
                if m_zz:
                    if curr_p:
                        new_poems.append(curr_p)
                    raw_num = m_zz.group(1)
                    sub = m_zz.group(2) or ""
                    cn_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10}
                    num_str = str(cn_map[raw_num]) if raw_num in cn_map else raw_num
                    curr_p = {
                        "title": f"流浪者竹枝词之{num_str}",
                        "subtitle": sub,
                        "preface": "",
                        "content": [],
                        "notes": [],
                        "year": "2025",
                        "location": "泰国",
                        "genre": "七言竹枝词",
                        "tags": ["竹枝词", "时政", "海外客居", "2025"]
                    }
                    continue
                d_str, yr = extract_date_from_line(l)
                if d_str and curr_p:
                    curr_p["notes"].append(f"作于 {d_str}")
                    curr_p["year"] = yr
                    continue
                if l.startswith("(") and l.endswith(")") and curr_p:
                    curr_p["notes"].append(l[1:-1])
                    continue
                if curr_p:
                    curr_p["content"].append(l)
            if curr_p:
                new_poems.append(curr_p)
            continue

        # 4. 独立诗篇
        first_l = lines[0]
        sub_title = ""
        notes = []
        preface = ""
        content = []
        year = "2024"
        loc = "泰国"
        tags = []

        if first_l == "今日咖啡馆" and len(lines) > 1 and lines[1] == "随吟":
            title = "今日咖啡馆随吟"
            c_start = 2
            year = "2025"
            tags = ["咖啡馆", "曼谷", "闲适", "随吟"]
        elif first_l.startswith("七言古风歌咏"):
            title = "七言古风歌咏晓铁德慧新婚誌喜"
            sub_title = "天涯游子 敬賀"
            c_start = 0
            for idx_l, l in enumerate(lines):
                if "金秋时节桂子香" in l:
                    c_start = idx_l
                    break
            year = "2023"
            tags = ["古风长歌", "贺诗", "铁流", "新婚", "2023"]
        elif first_l in ["饮酒歌", "悼铁流", "泼水节随吟", "题中国麻客", "莫言一大树", "臭毛贼腥火", "游侬帕兰寺", 
                            "晨绕拷桃转一圈", "美臀篇", "情人节", "考新蕾发吟留别", "失乐园", "醉夫吟", 
                            "暗夜醉吟", "泰缅边境吟", "大年初一吟", "四吟金链花", "中秋抒怀", "元旦海边玩"]:
            title = first_l
            c_start = 1
        elif first_l == "重游普吉来芭东，":
            title = "重游普吉来芭东"
            c_start = 0
        elif first_l == "莫言一大树，":
            title = "莫言一大树"
            c_start = 0
        elif first_l == "臭毛贼腥火，":
            title = "臭毛贼腥火"
            c_start = 0
        elif first_l == "晨绕拷桃转一圈，":
            title = "晨绕拷桃转一圈"
            c_start = 0
        elif first_l == "元旦海边玩，":
            title = "元旦海滩陷沙记"
            sub_title = "车陷沙间遇救感怀"
            c_start = 0
        else:
            title = first_l
            c_start = 1

        for l in lines[c_start:]:
            d_str, yr = extract_date_from_line(l)
            if d_str:
                notes.append(f"作于 {d_str}")
                year = yr
                continue
            m_d_tail = re.search(r"(\d{4})[，,\.·\*](\d{1,2})[，,\.·\*](\d{1,2})", l)
            if m_d_tail and (l.endswith("日") or l.endswith("18") or l.endswith("13") or l.endswith("14") or l.endswith("17") or l.endswith("21")):
                d_str = f"{m_d_tail.group(1)}.{int(m_d_tail.group(2))}.{int(m_d_tail.group(3))}"
                notes.append(f"作于 {d_str}")
                year = m_d_tail.group(1)
                clean_l = l[:m_d_tail.start()].strip()
                if clean_l:
                    content.append(clean_l)
                continue
            content.append(l)

        new_poems.append({
            "title": title,
            "subtitle": sub_title,
            "preface": preface,
            "content": content,
            "notes": notes,
            "year": year,
            "location": loc,
            "genre": "古风长歌" if len(content) > 8 else "七言绝句",
            "tags": tags
        })

    return new_poems

def main():
    print("🚀 开始编译《周庸诗集》全量纯真迹文集...")

    p_old = parse_existing_batches()
    p_new = parse_new_batch()

    print(f"📦 旧批次提取: {len(p_old)} 首")
    print(f"📦 新批次提取: {len(p_new)} 首")

    # 全局排重：基于（标题、副题、诗文前两句指纹）
    merged_poems = []
    seen = set()

    for p in p_old + p_new:
        if not p["content"]:
            continue
        if p["title"] in BLACKLIST_TITLES:
            continue
        c_clean = "".join(p["content"][:2]).replace(" ", "").replace("，", "").replace("。", "").replace("！", "").replace("!", "")
        # 指纹定义：
        # 对于竹枝词同号诗作，包含 subtitle 和 content 确保两首各得其所
        fp = (p["title"], p.get("subtitle") or "", c_clean)
        if fp in seen:
            continue
        seen.add(fp)
        merged_poems.append(p)

    print(f"✨ 全局排重合并后，全集周老亲笔真迹共计: {len(merged_poems)} 首")

    # 分卷归类映射 (5 Volumes)
    for p in merged_poems:
        t = p["title"]
        yr = p.get("year", "2025")

        # 卷一：去国行与南洋客梦 (2018 - 2024)
        if "抚仙湖" in t or t in [
            "饮酒歌", "悼铁流", "泼水节随吟", "题中国麻客", "莫言一大树", "臭毛贼腥火",
            "游侬帕兰寺", "晨绕拷桃转一圈", "七言古风歌咏晓铁德慧新婚誌喜", "情人节", "重游普吉来芭东", "中秋抒怀"
        ]:
            p["volumeId"] = "vol-1"
            if not p.get("location"):
                p["location"] = "云南抚仙湖" if "抚仙湖" in t else "泰国"

        # 卷二：流浪者竹枝词 (2025.05 - 2025.08)
        elif "竹枝词" in t:
            p["volumeId"] = "vol-2"
            p["location"] = "泰国"
            p["genre"] = "七言竹枝词"

        # 卷三：回乡曲与慈母寿 (2025.08 - 2025.11)
        elif "回乡曲" in t:
            p["volumeId"] = "vol-3"
            p["location"] = "四川故里"
            p["genre"] = "七言绝句"

        # 卷四：游子吟与泰北行 (2026.02 - 2026.03)
        elif "游子吟" in t or t in ["情人节抒怀", "年夜饭", "大年初一吟", "又见金链花"]:
            p["volumeId"] = "vol-4"
            p["location"] = "泰国华欣/泰北"

        # 卷五：暹罗长歌与晚晴行 (2025 - 2026)
        else:
            p["volumeId"] = "vol-5"
            p["location"] = "泰国华欣/泰缅边境"

        # 体裁准确校准
        c_len = len(p["content"])
        if c_len == 4:
            first_c = re.sub(r"[，。！？、；：\s]", "", p["content"][0])
            if len(first_c) == 7:
                p["genre"] = "七言绝句" if "竹枝词" not in t else "七言竹枝词"
            elif len(first_c) == 5:
                p["genre"] = "五言绝句"
        elif c_len > 4:
            first_c = re.sub(r"[，。！？、；：\s]", "", p["content"][0])
            if len(first_c) == 7:
                p["genre"] = "七言古风长歌"
            elif len(first_c) == 5:
                p["genre"] = "五言古风长歌"
            else:
                p["genre"] = "古风长歌"

    # 分卷名称填充
    vol_map = {v["id"]: v["name"] for v in VOLUMES}
    for p in merged_poems:
        p["volume"] = vol_map[p["volumeId"]]

    # 篇目排序规则
    def poem_sort_key(p):
        v_order = {"vol-1": 1, "vol-2": 2, "vol-3": 3, "vol-4": 4, "vol-5": 5}
        v_idx = v_order.get(p["volumeId"], 99)

        # 篇号数字排序（如 竹枝词之125、回乡曲之001、游子吟之1）
        num = 0
        m_num = re.search(r"之(\d+)", p["title"])
        if m_num:
            num = int(m_num.group(1))
        else:
            cn_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
                      "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15, "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20, "二十一": 21, "二十二": 22, "二十三": 23}
            m_cn = re.search(r"之([一二三四五六七八九十]+)", p["title"])
            if m_cn:
                num = cn_map.get(m_cn.group(1), 0)

        # 日期排序辅助
        date_str = ""
        for n in p.get("notes", []):
            m_d = re.search(r"作于\s*(\d{4}\.\d{1,2}(?:\.\d{1,2})?)", n)
            if m_d:
                date_str = m_d.group(1)
                break
        if not date_str and p.get("year"):
            date_str = p.get("year")

        return (v_idx, num, date_str, p["title"])

    merged_poems.sort(key=poem_sort_key)

    # 重新连续统一分配诗篇编号 zy-001 ~ zy-329
    for idx, p in enumerate(merged_poems):
        p["id"] = f"zy-{idx + 1:03d}"

    # 保存至 volumes.json 与 poems.json
    with open(VOLUMES_JSON, "w", encoding="utf-8") as f:
        json.dump(VOLUMES, f, ensure_ascii=False, indent=2)

    with open(POEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(merged_poems, f, ensure_ascii=False, indent=2)

    print("\n🎉 《周庸诗集》全量纯真迹文集编译圆满成功！")
    for vol in VOLUMES:
        cnt = sum(1 for p in merged_poems if p["volumeId"] == vol["id"])
        print(f"  📂 【{vol['name']}】: 共 {cnt} 首纯真迹")
    print(f"💾 数据库已更新，全集共计周老先生亲笔诗作 {len(merged_poems)} 首！")

if __name__ == "__main__":
    main()
