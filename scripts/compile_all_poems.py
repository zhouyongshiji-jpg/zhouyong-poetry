#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《周庸诗集》全量诗篇规范化编译与分卷整理脚本 (scripts/compile_all_poems.py)
整合：
1. 微信文件传输助手最新 63 首诗作（2025.08 流浪者竹枝词、2026.02 新春、2026.02-03 游子吟、2026.04-07 闲吟）
2. 2025.10-11《回乡曲》全系列（36首）
3. 2026 暹罗客居长歌（八月闲吟、暗夜醉吟、醉夫吟、泰缅边境吟、考新蕾发吟留别等）
4. 经典神州山河行吟与倚声词曲
"""

import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_BATCH_63 = ROOT_DIR / "data" / "raw_batch_2025_08_and_2026.txt"
RAW_BATCH_46 = ROOT_DIR / "data" / "raw_batch_2025_2026.txt"
POEMS_JSON = ROOT_DIR / "data" / "poems.json"
VOLUMES_JSON = ROOT_DIR / "data" / "volumes.json"

# 六卷宏大规制定义
VOLUMES = [
  {
    "id": "vol-1",
    "name": "卷一·流浪者竹枝词",
    "title": "时代悲歌与世相针砭",
    "description": "2025年8月客居南洋作。感时抚事，寄慨中外，涵盖泰柬之争、俄乌战事、江油校园之痛、海外饯行与时代世相竹枝词三十首。",
    "period": "2025.08",
    "foreword": "乙巳初秋，客寓南洋。目击世风日下，战乱频仍，百姓罹难。聊效竹枝体，口语入韵，直刺时弊，虽语多谐谑，实痛彻心脾也。"
  },
  {
    "id": "vol-2",
    "name": "卷二·回乡曲与慈母寿",
    "title": "神州故土与九八仙寿",
    "description": "2025年10月-11月归国探亲作。深情记录九十八岁慈母寿辰、谨遵母令拒礼金、故里川音、弟侄拼酒、门前鱼塘垂钓与赤子真情三十六首。",
    "period": "2025.10 - 2025.11",
    "foreword": "少小离家，老大归来。慈母仙寿九十八，精神矍铄如春花。膝下承欢，醉歌长短。举目故园，人事全非，唯母恩深如东海。"
  },
  {
    "id": "vol-3",
    "name": "卷三·游子吟与初春客怀",
    "title": "泰北纪行与佛国春色",
    "description": "2026年2月-3月游历泰北作。涵盖清迈古城、塔佩门、登素贴山双龙寺、访清莱孟莱王铜像，并录情人节练字、大年初一华欣欢腾与初春感怀二十七首。",
    "period": "2026.02 - 2026.03",
    "foreword": "丙午新春，策杖泰北。漫步塔佩红墙，登素贴山瞰人间，访清莱谒孟王。佛国安详，草木含情，聊写游子逍遥逸兴。"
  },
  {
    "id": "vol-4",
    "name": "卷四·暹罗长歌与晚晴行吟",
    "title": "异邦客梦与浩瀚海天",
    "description": "2026年4月-8月居泰国作。金链花开、泰缅边塞行、咖啡馆随吟、五二零寄母、那日的纪念、八月闲吟、暗夜独饮、华欣考新蕾发留别诸长歌十六首。",
    "period": "2026.04 - 2026.08",
    "foreword": "避秦求真，浪迹华欣。面对浩瀚大洋，常夜独酌，长歌当哭。岁月无情，文心不死，虽流落天涯，孤芳自赏，何惧之有。"
  },
  {
    "id": "vol-5",
    "name": "卷五·神州万里与平生行止",
    "title": "故土名胜与知交唱和",
    "description": "青年及壮岁行历神州山河与文友酬唱，包含黄鹤楼怀古、重过江南忆旧游、杭州九溪踏青、小院春茶试新泉、秋窗夜读与题赠泰华华校十首。",
    "period": "1980 - 2024",
    "foreword": "踏遍青山人未老，风景这边独好。回望神州万里关山，同窗雅集，故人情深，笔墨留痕，岁月悠悠。"
  },
  {
    "id": "vol-6",
    "name": "卷六·倚声填词长短句",
    "title": "词牌曲选与旷达幽怀",
    "description": "长短句词选，体裁涵盖定风波·浴海、水调歌头·中秋望月、鹧鸪天·春雨初晴、晨步遇雨（仿苏轼定风波）等五首。",
    "period": "1985 - 2026",
    "foreword": "倚声填词，聊发狂狷。律诗谨严而词境放达，一蓑烟雨任平生，何妨吟啸且徐行。"
  }
]

def parse_txt_poems(filepath, default_vol_id="vol-1"):
    """解析文本格式的诗作"""
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    lines = text.splitlines()
    poems = []
    current_poem = None
    current_section = ""

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line == "---":
            i += 1
            continue

        # 检测章节标头
        if "《流浪者竹枝词》" in line:
            current_section = "竹枝词"
            i += 1
            continue
        elif "2026年新春与初春寄怀" in line:
            current_section = "新春初春"
            i += 1
            continue
        elif "《游子吟》" in line:
            current_section = "游子吟"
            i += 1
            continue
        elif "客居闲吟与时政" in line or "客居闲吟" in line:
            current_section = "客居闲吟"
            i += 1
            continue
        elif "《回乡曲》" in line:
            current_section = "回乡曲"
            i += 1
            continue

        # 检测是否为诗题行（如：流浪者竹枝词之125（泰柬之战）、游子吟之一、**回乡曲之107**、情人节抒怀 等）
        is_title = False
        raw_title = ""

        m_star = re.match(r"^\*\*(.+?)\*\*(?:\s*[（\(](.+?)[）\)])?$", line)
        if m_star:
            is_title = True
            raw_title = m_star.group(1).strip()
            if m_star.group(2):
                raw_title += f"（{m_star.group(2).strip()}）"
        elif (
            line.startswith("流浪者竹枝词之") or
            line.startswith("游子吟之") or
            line.startswith("回乡曲之") or
            line in ["情人节抒怀", "年夜饭", "大年初一吟", "又见金链花", "再吟金链花", "泰缅边塞行", "咖啡馆随吟", "五二O随吟", "那日的纪念", "七月闲吟",
                     "马年除夕寄语", "晨步遇雨", "定风波·浴海", "八月闲吟", "泰缅边境吟", "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别"]
        ):
            is_title = True
            raw_title = line

        if is_title:
            if current_poem:
                poems.append(current_poem)
                current_poem = None

            # 解析标题与括号中的主题
            title = raw_title
            subtitle = ""
            notes = []
            m_brace = re.match(r"^(.+?)[（\(](.+?)[）\)]$", raw_title)
            if m_brace:
                title = m_brace.group(1).strip()
                sub_info = m_brace.group(2).strip()
                if "仿苏轼" in sub_info or "原录作" in sub_info:
                    notes.append(sub_info)
                else:
                    subtitle = sub_info

            # 分配默认卷目
            vol_id = default_vol_id
            genre = "七绝"
            loc = "泰国"
            year = "2026"
            tags = []

            if "竹枝词" in title:
                vol_id = "vol-1"
                genre = "七言竹枝词"
                year = "2025"
                tags = ["竹枝词", "时政", "海外客居", "2025"]
            elif "回乡曲" in title:
                vol_id = "vol-2"
                genre = "七言绝句"
                year = "2025"
                loc = "四川故里"
                tags = ["回乡曲", "慈母", "故乡", "方言", "2025"]
            elif "游子吟" in title:
                vol_id = "vol-3"
                genre = "五言绝句" if len(raw_title) < 10 else "古风"
                year = "2026"
                loc = "泰国清迈/清莱"
                tags = ["游子吟", "泰北", "清迈", "双龙寺", "2026"]
            elif title in ["情人节抒怀", "年夜饭", "大年初一吟", "又见金链花"]:
                vol_id = "vol-3"
                genre = "古风长歌" if "抒怀" in title or "花" in title else "七绝"
                year = "2026"
                loc = "泰国华欣"
                tags = ["新春", "华欣", "初春", "2026"]
            elif title in ["定风波·浴海", "晨步遇雨"]:
                vol_id = "vol-6"
                genre = "词曲·定风波"
                year = "2026"
                loc = "泰国海滨"
                tags = ["词曲", "定风波", "自由"]
            elif current_section == "客居闲吟" or title in ["再吟金链花", "泰缅边塞行", "咖啡馆随吟", "五二O随吟", "那日的纪念", "七月闲吟", "八月闲吟", "泰缅边境吟", "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别"]:
                vol_id = "vol-4"
                genre = "古风长歌"
                year = "2026"
                loc = "泰国华欣/泰缅边境"
                tags = ["长歌", "华欣", "边塞", "感怀", "2026"]

            current_poem = {
                "id": "",
                "title": title,
                "subtitle": subtitle,
                "genre": genre,
                "tune": "定风波" if "定风波" in title else "",
                "volume": "",
                "volumeId": vol_id,
                "year": year,
                "location": loc,
                "preface": "",
                "content": [],
                "notes": notes,
                "tags": tags
            }
            i += 1
            continue

        # 检查是否为日期行：例如 2025.8.1 或 *2025.10.18*
        m_date = re.match(r"^[\*]?(\d{4}\.\d{1,2}(?:\.\d{1,2})?)[\*]?$", line)
        if m_date and current_poem:
            d_str = m_date.group(1)
            current_poem["year"] = d_str.split(".")[0]
            current_poem["notes"].append(f"作于 {d_str}")
            i += 1
            continue

        # 检查是否为题记备注：例如 *（钓一上午，无鱼上钩。空手而归！）*
        m_note = re.match(r"^[\*]?[（\(](.+?)[）\)][\*]?$", line)
        if m_note and current_poem:
            n_str = m_note.group(1).strip()
            if "仿苏轼" in n_str:
                current_poem["subtitle"] = n_str
            else:
                current_poem["notes"].append(n_str)
            i += 1
            continue

        # 正文行
        if current_poem:
            current_poem["content"].append(line)

        i += 1

    if current_poem:
        poems.append(current_poem)

    return poems

def main():
    print("🚀 开始全量诗稿整合与六卷架构编译...")

    # 1. 解析微信最新 63 首诗
    poems_63 = parse_txt_poems(RAW_BATCH_63)
    print(f"  📖 从微信最新诗稿解析出: {len(poems_63)} 首")

    # 2. 解析回乡曲与客居 46 首诗
    poems_46 = parse_txt_poems(RAW_BATCH_46)
    print(f"  📖 从回乡曲批次解析出: {len(poems_46)} 首")

    # 3. 读取原先在库的 13 首经典代表作（如湄南河、黄鹤楼、水调歌头等）
    classics = []
    if POEMS_JSON.exists():
        with open(POEMS_JSON, "r", encoding="utf-8") as f:
            existing = json.load(f)
            # 提取非竹枝词、非回乡曲且非 2026 长歌的早期代表作
            for p in existing:
                if (
                    not p["title"].startswith("流浪者竹枝词之") and
                    not p["title"].startswith("回乡曲之") and
                    not p["title"].startswith("游子吟之") and
                    p["title"] not in [
                        "马年除夕寄语", "晨步遇雨", "定风波·浴海", "八月闲吟", "泰缅边境吟",
                        "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别",
                        "情人节抒怀", "年夜饭", "大年初一吟", "又见金链花", "再吟金链花",
                        "泰缅边塞行", "咖啡馆随吟", "五二O随吟", "那日的纪念", "七月闲吟"
                    ]
                ):
                    classics.append(p)

    print(f"  📖 保留经典传统律绝词作: {len(classics)} 首")

    # 4. 合并去重（根据标题，若有重复则以最新版为准）
    all_dict = {}

    for p in classics:
        all_dict[p["title"]] = p

    for p in poems_46:
        all_dict[p["title"]] = p

    for p in poems_63:
        all_dict[p["title"]] = p

    all_poems = list(all_dict.values())
    print(f"  ✨ 合并去重后诗作总计: {len(all_poems)} 首")

    # 5. 精细分类至六卷并重新规整卷目名
    vol_map = {v["id"]: v["name"] for v in VOLUMES}

    for p in all_poems:
        # 分卷微调逻辑
        t = p["title"]
        if "竹枝词" in t:
            p["volumeId"] = "vol-1"
        elif "回乡曲" in t:
            p["volumeId"] = "vol-2"
        elif "游子吟" in t or t in ["情人节抒怀", "年夜饭", "大年初一吟", "又见金链花"]:
            p["volumeId"] = "vol-3"
        elif t in [
            "再吟金链花", "泰缅边塞行", "咖啡馆随吟", "五二O随吟", "那日的纪念", "七月闲吟",
            "马年除夕寄语", "八月闲吟", "泰缅边境吟", "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别"
        ]:
            p["volumeId"] = "vol-4"
        elif t in ["水调歌头·中秋望月", "鹧鸪天·春雨初晴", "定风波·浴海", "晨步遇雨"]:
            p["volumeId"] = "vol-6"
            p["genre"] = "词曲"
        else:
            p["volumeId"] = "vol-5"

        p["volume"] = vol_map[p["volumeId"]]

        # 调整诗体
        if len(p["content"]) == 4:
            first_l = re.sub(r"[，。！？、；：\s]", "", p["content"][0])
            if len(first_l) == 7:
                p["genre"] = "七言绝句"
            elif len(first_l) == 5:
                p["genre"] = "五言绝句"
        elif len(p["content"]) >= 8:
            first_l = re.sub(r"[，。！？、；：\s]", "", p["content"][0])
            if len(first_l) == 7:
                p["genre"] = "七言古风长歌"
            elif len(first_l) == 5:
                p["genre"] = "五言古风长歌"
            else:
                p["genre"] = "古风长歌"

    # 6. 排序策略：先按卷次 (vol-1 -> vol-6) 归拢，卷内按编号或时间自然流淌
    def sort_key(p):
        v_order = {"vol-1": 1, "vol-2": 2, "vol-3": 3, "vol-4": 4, "vol-5": 5, "vol-6": 6}
        v_idx = v_order.get(p["volumeId"], 99)

        # 提取诗名中的数字（如 竹枝词之125、回乡曲之107、游子吟之一/之11）
        num = 0
        m_num = re.search(r"之(\d+)", p["title"])
        if m_num:
            num = int(m_num.group(1))
        else:
            # 汉字数字转数字
            cn_map = {"一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10,
                      "十一": 11, "十二": 12, "十三": 13, "十四": 14, "十五": 15, "十六": 16, "十七": 17, "十八": 18, "十九": 19, "二十": 20, "二十一": 21, "二十二": 22, "二十三": 23}
            m_cn = re.search(r"之([一二三四五六七八九十]+)", p["title"])
            if m_cn:
                num = cn_map.get(m_cn.group(1), 0)

        date_str = ""
        for n in p.get("notes", []):
            m_d = re.search(r"作于\s*(\d{4}\.\d{1,2}(?:\.\d{1,2})?)", n)
            if m_d:
                date_str = m_d.group(1)
                break

        return (v_idx, num, date_str, p["title"])

    all_poems.sort(key=sort_key)

    # 7. 重新分配连续自增的优美编号 zy-001 ~ zy-XXX
    for idx, p in enumerate(all_poems):
        p["id"] = f"zy-{idx + 1:03d}"

    # 8. 保存 volumes.json 与 poems.json
    with open(VOLUMES_JSON, "w", encoding="utf-8") as f:
        json.dump(VOLUMES, f, ensure_ascii=False, indent=2)

    with open(POEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(all_poems, f, ensure_ascii=False, indent=2)

    print("\n🎉 六卷编纂大功告成！")
    for vol in VOLUMES:
        cnt = sum(1 for p in all_poems if p["volumeId"] == vol["id"])
        print(f"  📂 【{vol['name']}】: 共收录 {cnt} 首")
    print(f"💾 诗库更新完毕，共收录周庸先生诗作 {len(all_poems)} 首！")

if __name__ == "__main__":
    main()
