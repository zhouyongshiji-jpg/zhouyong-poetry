#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
《周庸诗集》纯真迹全集编译脚本 (scripts/compile_all_poems.py)
【严格净化准则】：
1. 彻底剔除工程初期用于测试排版的 14 首虚拟样板诗（黄鹤楼、湄南河秋夕、水调歌头、九溪等）
2. 彻底剔除由于大标题混入的杂项（如“客居与感怀诗作”）
3. 仅 100% 收录周老先生亲笔创作的 109 首原稿真迹，分立【纯真迹四大卷】
"""

import json
import re
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
RAW_BATCH_63 = ROOT_DIR / "data" / "raw_batch_2025_08_and_2026.txt"
RAW_BATCH_46 = ROOT_DIR / "data" / "raw_batch_2025_2026.txt"
POEMS_JSON = ROOT_DIR / "data" / "poems.json"
VOLUMES_JSON = ROOT_DIR / "data" / "volumes.json"

# 周庸先生纯真迹四大卷架构定义
VOLUMES = [
  {
    "id": "vol-1",
    "name": "卷一·流浪者竹枝词",
    "title": "时代悲歌与世相针砭",
    "description": "2025年8月客居南洋作。感时抚事，寄慨中外，涵盖泰柬之争、俄乌战事、江油校园之痛、海外饯行归国与时代世相竹枝词三十首。",
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
    "name": "卷三·游子吟与泰北行",
    "title": "泰北纪行与佛国春色",
    "description": "2026年2月-3月游历泰北作。涵盖清迈古城、塔佩红墙、登素贴山双龙寺、访清莱孟莱王铜像，并录情人节练字、大年初一华欣欢腾与初春感怀二十七首。",
    "period": "2026.02 - 2026.03",
    "foreword": "丙午新春，策杖泰北。漫步塔佩红墙，登素贴山瞰人间，访清莱谒孟王。佛国安详，草木含情，聊写游子逍遥逸兴。"
  },
  {
    "id": "vol-4",
    "name": "卷四·暹罗长歌与晚晴行",
    "title": "异邦客梦与浩瀚海天",
    "description": "2026年4月-8月居泰国作。金链花开、泰缅边塞行、咖啡馆随吟、五二零寄母、那日的纪念、八月闲吟、暗夜独饮、华欣考新蕾发留别诸长歌十六首。",
    "period": "2026.04 - 2026.08",
    "foreword": "避秦求真，浪迹华欣。面对浩瀚大洋，常夜独酌，长歌当哭。岁月无情，文心不死，虽流落天涯，孤芳自赏，何惧之有。"
  }
]

# 坚决剔除的伪作/测试样板诗名单与非诗标题
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

def parse_txt_poems(filepath, default_vol_id="vol-1"):
    """从原始文本中准确解析周老先生诗篇"""
    with open(filepath, "r", encoding="utf-8") as f:
        text = f.read()

    lines = text.splitlines()
    poems = []
    current_poem = None

    i = 0
    while i < len(lines):
        line = lines[i].strip()
        if not line or line == "---":
            i += 1
            continue

        # 过滤大节标题
        if any(header in line for header in [
            "《流浪者竹枝词》系列", "2026年新春与初春寄怀", "《游子吟》系列",
            "客居闲吟与时政诗作", "《回乡曲》系列", "客居与感怀诗作"
        ]):
            i += 1
            continue

        # 检测诗题
        is_title = False
        raw_title = ""

        m_star = re.match(r"^\*\*(.+?)\*\*(?:\s*[（\(](.+?)[）\)])?$", line)
        if m_star:
            raw_title = m_star.group(1).strip()
            if m_star.group(2):
                raw_title += f"（{m_star.group(2).strip()}）"
            # 排除黑名单
            if raw_title not in BLACKLIST_TITLES and "客居与感怀" not in raw_title:
                is_title = True
        elif (
            line.startswith("流浪者竹枝词之") or
            line.startswith("游子吟之") or
            line.startswith("回乡曲之") or
            line in [
                "情人节抒怀", "年夜饭", "大年初一吟", "又见金链花",
                "再吟金链花", "泰缅边塞行", "咖啡馆随吟", "五二O随吟", "那日的纪念", "七月闲吟",
                "马年除夕寄语", "晨步遇雨", "定风波·浴海", "八月闲吟", "泰缅边境吟",
                "暗夜醉吟", "偶感短吟", "醉夫吟", "失乐园", "考新蕾发吟留别"
            ]
        ):
            if line not in BLACKLIST_TITLES:
                is_title = True
                raw_title = line

        if is_title:
            if current_poem and current_poem["content"]:
                poems.append(current_poem)
                current_poem = None

            # 标题与副题处理
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

            # 分卷归类
            if "竹枝词" in title:
                vol_id = "vol-1"
                genre = "七言竹枝词"
                year = "2025"
                loc = "泰国"
                tags = ["竹枝词", "时政", "海外客居", "2025"]
            elif "回乡曲" in title:
                vol_id = "vol-2"
                genre = "七言绝句"
                year = "2025"
                loc = "四川故里"
                tags = ["回乡曲", "慈母", "故乡", "方言", "2025"]
            elif "游子吟" in title:
                vol_id = "vol-3"
                genre = "五言绝句"
                year = "2026"
                loc = "泰国清迈/清莱"
                tags = ["游子吟", "泰北", "清迈", "双龙寺", "2026"]
            elif title in ["情人节抒怀", "年夜饭", "大年初一吟", "又见金链花"]:
                vol_id = "vol-3"
                genre = "古风长歌" if "抒怀" in title or "花" in title else "七言绝句"
                year = "2026"
                loc = "泰国华欣"
                tags = ["新春", "华欣", "初春", "2026"]
            else:
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

        # 检查是否为日期行
        m_date = re.match(r"^[\*]?(\d{4}\.\d{1,2}(?:\.\d{1,2})?)[\*]?$", line)
        if m_date and current_poem:
            d_str = m_date.group(1)
            current_poem["year"] = d_str.split(".")[0]
            current_poem["notes"].append(f"作于 {d_str}")
            i += 1
            continue

        # 检查是否为题记备注
        m_note = re.match(r"^[\*]?[（\(](.+?)[）\)][\*]?$", line)
        if m_note and current_poem:
            n_str = m_note.group(1).strip()
            if "仿苏轼" in n_str:
                current_poem["subtitle"] = n_str
            else:
                current_poem["notes"].append(n_str)
            i += 1
            continue

        # 正文诗句
        if current_poem:
            clean_l = line.strip()
            # 过滤掉孤立的标题残留
            if clean_l and clean_l not in BLACKLIST_TITLES:
                current_poem["content"].append(clean_l)

        i += 1

    if current_poem and current_poem["content"]:
        poems.append(current_poem)

    return poems

def main():
    print("🧹 开始全面净化诗集：剔除所有测试样板诗，编译纯真迹四大卷...")

    # 从两个原始手稿文件提取真实诗作
    poems_63 = parse_txt_poems(RAW_BATCH_63)
    poems_46 = parse_txt_poems(RAW_BATCH_46)

    all_dict = {}
    for p in poems_46:
        if p["title"] not in BLACKLIST_TITLES and p["content"]:
            all_dict[p["title"]] = p

    for p in poems_63:
        if p["title"] not in BLACKLIST_TITLES and p["content"]:
            all_dict[p["title"]] = p

    all_poems = list(all_dict.values())
    print(f"✨ 提纯出周老先生亲笔真迹: 共 {len(all_poems)} 首")

    # 分卷名称映射
    vol_map = {v["id"]: v["name"] for v in VOLUMES}

    for p in all_poems:
        t = p["title"]
        if "竹枝词" in t:
            p["volumeId"] = "vol-1"
        elif "回乡曲" in t:
            p["volumeId"] = "vol-2"
        elif "游子吟" in t or t in ["情人节抒怀", "年夜饭", "大年初一吟", "又见金链花"]:
            p["volumeId"] = "vol-3"
        else:
            p["volumeId"] = "vol-4"

        p["volume"] = vol_map[p["volumeId"]]

        # 准确标注诗体
        if len(p["content"]) == 4:
            first_l = re.sub(r"[，。！？、；：\s]", "", p["content"][0])
            if len(first_l) == 7:
                p["genre"] = "七言绝句" if "竹枝词" not in t else "七言竹枝词"
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

    # 排序：严格按 卷一 -> 卷二 -> 卷三 -> 卷四 展开
    def sort_key(p):
        v_order = {"vol-1": 1, "vol-2": 2, "vol-3": 3, "vol-4": 4}
        v_idx = v_order.get(p["volumeId"], 99)

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

        # 篇章时间排序辅助
        date_str = ""
        for n in p.get("notes", []):
            m_d = re.search(r"作于\s*(\d{4}\.\d{1,2}(?:\.\d{1,2})?)", n)
            if m_d:
                date_str = m_d.group(1)
                break

        return (v_idx, num, date_str, p["title"])

    all_poems.sort(key=sort_key)

    # 重新规范自增编号 zy-001 ~ zy-109
    for idx, p in enumerate(all_poems):
        p["id"] = f"zy-{idx + 1:03d}"

    # 保存 volumes.json 与 poems.json
    with open(VOLUMES_JSON, "w", encoding="utf-8") as f:
        json.dump(VOLUMES, f, ensure_ascii=False, indent=2)

    with open(POEMS_JSON, "w", encoding="utf-8") as f:
        json.dump(all_poems, f, ensure_ascii=False, indent=2)

    print("\n🎉 诗集净化与纯真迹重构圆满完成！")
    for vol in VOLUMES:
        cnt = sum(1 for p in all_poems if p["volumeId"] == vol["id"])
        print(f"  📂 【{vol['name']}】: 共 {cnt} 首纯真迹")
    print(f"💾 诗库已更新，全集共计周老先生亲笔诗作 {len(all_poems)} 首！")

if __name__ == "__main__":
    main()
