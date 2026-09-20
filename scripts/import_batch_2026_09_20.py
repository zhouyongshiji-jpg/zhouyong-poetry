#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
导入 2026-09-20 批次诗作：
1. 回乡曲补齐 8 首 (zy-1364 ~ zy-1371) -> 归入 vol-3 (卷七·回乡曲与慈母寿)
2. 泰妹篇新作 24 首 (zy-1372 ~ zy-1395) -> 归入 vol-5 (卷九·暹罗长歌与晚晴行)
"""

import json
import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
POEMS_PATH = os.path.join(ROOT, "data", "poems.json")
VOLUMES_PATH = os.path.join(ROOT, "data", "volumes.json")

# 备份
shutil.copyfile(POEMS_PATH, POEMS_PATH + ".bak")
shutil.copyfile(VOLUMES_PATH, VOLUMES_PATH + ".bak")
print("[OK] Backup created.")

with open(POEMS_PATH, "r", encoding="utf-8") as f:
    poems = json.load(f)

with open(VOLUMES_PATH, "r", encoding="utf-8") as f:
    volumes = json.load(f)

# 1. 构造 8 首《回乡曲》
hx_part1 = [
    {
        "title": "回乡曲之013",
        "subtitle": "",
        "preface": "",
        "content": [
            "人道暹罗天炎热，",
            "孰料故乡更高温！",
            "应是秋风送爽时，",
            "难耐暑热汗淋淋！"
        ],
        "notes": ["作于 2025.8.21"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "故里", "酷暑", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1364"
    },
    {
        "title": "回乡曲之014",
        "subtitle": "",
        "preface": "",
        "content": [
            "半夜炎热促人醒，",
            "开窗只见滿天星。",
            "欲呼山风吹过来，",
            "请为归客降降溫！"
        ],
        "notes": ["作于 2025.8.21"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "故里", "夜吟", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1365"
    },
    {
        "title": "回乡曲之015",
        "subtitle": "",
        "preface": "",
        "content": [
            "公安来电相问讯，",
            "党国关爱应感恩！",
            "疲惫游子归故国，",
            "只为老母来庆生。"
        ],
        "notes": ["作于 2025.8.21"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "问讯", "孝道", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1366"
    },
    {
        "title": "回乡曲之016",
        "subtitle": "",
        "preface": "",
        "content": [
            "日里不作亏心事，",
            "夜来哪怕鬼敲门？",
            "天下本来没鸟事，",
            "庸人自扰天将倾！"
        ],
        "notes": ["作于 2025.8.21"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "坦荡", "自省", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1367"
    }
]

hx_part2 = [
    {
        "title": "回乡曲之103",
        "subtitle": "",
        "preface": "",
        "content": [
            "羞与蠢货同月天，",
            "耻同畜类苦争辯！",
            "风马牛间不相及，",
            "马嘴驴脸总枉然！"
        ],
        "notes": ["作于 2025.10.9"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "世态", "交锋", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1368"
    },
    {
        "title": "回乡曲之104",
        "subtitle": "",
        "preface": "",
        "content": [
            "无分男女老与幼，",
            "非同族类隔云壤！",
            "话不投机半句多，",
            "故旧相见话天凉！"
        ],
        "notes": ["作于 2025.10.9"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "故旧", "世味", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1369"
    },
    {
        "title": "回乡曲之105",
        "subtitle": "",
        "preface": "",
        "content": [
            "五十年代大学生，",
            "一生执教肓他人。",
            "脑里全塞猪狗屎，",
            "滿嘴喷粪臭熏熏！"
        ],
        "notes": ["作于 2025.10.9"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "辛辣", "刺世", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1370"
    },
    {
        "title": "回乡曲之106",
        "subtitle": "",
        "preface": "",
        "content": [
            "人间良知何处觅？",
            "世上真理哪里寻？",
            "歪理邪说无人识，",
            "黄钟毁弃瓦釜鸣！"
        ],
        "notes": ["作于 2025.10.9"],
        "year": "2025",
        "location": "四川/筠连/故里",
        "genre": "七言绝句",
        "tags": ["回乡曲", "良知", "沉思", "2025"],
        "volumeId": "vol-3",
        "volume": "卷七·回乡曲与慈母寿",
        "id": "zy-1371"
    }
]

# 2. 构造 24 首《泰妹篇》
taimei_raw = [
    (1, ["这个泰妹很年轻，", "不便透露其芳龄。", "身材中等略胖乎，", "性格善良人温驯。"], "2026.9.17"),
    (2, ["她的名字很奇葩:", "叫做帕差拉坡娜。", "我给中名叫贾波，", "网名谐音几无差。"], "2026.9.17"),
    (3, ["这个泰妹很粘人，", "老公老公叫不停。", "一时半会暂分别，", "手机呼叫声连声。"], "2026.9.17"),
    (4, ["她是乌龙塔尼人，", "小乖家居在农村。", "她有良田二十亩，", "小小家园颇温馨!"], "2026.9.17"),
    (5, ["老牛最爱吃嫩草，", "无奈牛老牙不好!", "猜我年龄五十多，", "老夫老牙几笑掉!"], "2026.9.17"),
    (6, ["吾乃风流倜傥人，", "天马行空不正经!", "牛逼吹得再声响，", "做爱不行等于零!"], "2026.9.17"),
    (7, ["风流终归是风流，", "伦理法律不敢丢。", "老夫是条单身狗，", "找个泰妹人不羞!"], "2026.9.17"),
    (8, ["罗刹国人尚躺平，", "剩女成堆敢问津？", "三金彩礼天文数，", "梦里也难遇爱情!"], "2026.9.17"),
    (9, ["泰妹向我发天问:", "之前是否有恋人？", "不敢相懑诚相告，", "二三泰妹曾相亲。"], "2026.9.17"),
    (10, ["泰妹听后很平静，", "夸我诚实是好人!", "此事暹罗寻常有，", "一夫多妻人不惊。"], "2026.9.17"),
    (11, ["泰国社会尚包容，", "和谐安定路路通。", "固然民不算富有，", "自由民主近大同。"], "2026.9.17"),
    (12, ["婚恋自由重爱情，", "彼此相爱最要紧。", "房子车子与票子，", "闻所未闻奇怪论!"], "2026.9.17"),
    (13, ["泰妹最爱睡懒觉，", "呼噜呼拉翘臀高。", "老夫跑完三公里，", "泰妹还在梦逍遥。"], "2026.9.17"),
    (14, ["平时打工很辛苦，", "睡点懒觉理不输。", "泰妹尤其感激我，", "不打不骂任舒服!"], "2026.9.17"),
    (15, ["原订八点半起床，", "明日懶觉有点黄。", "忽接信息改十点，", "仍可懶睡喜欲狂!"], "2026.9.17"),
    (16, ["泰妹睡觉开空调，", "冷得老夫嗷嗷叫!", "我关她开拉剧战，", "此事糟糕不糟糕？"], "2026.9.17"),
    (17, ["这个泰妹喜叫床，", "鬼哭狼嚎喊爹娘!", "老牛嫩草分外香，", "一树梨花压海棠!"], "2026.9.18"),
    (18, ["一树梨花压海棠，", "风流韻事万古扬!", "当年东坡讽老友，", "文人骚客笑断腸!"], "2026.9.18"),
    (19, ["敢吃嫩草胆儿大，", "只问一事怕不怕？", "梨花海棠那桩事，", "怎可胡弄蒙骗她？"], "2026.9.18"),
    (20, ["我也不敢吹牛逼，", "力不足兮心有余!", "好汉莫提当年勇，", "勉强对付小咪咪!"], "2026.9.18"),
    (21, ["美女友人发天问:", "泰女与你真感情？", "究竟生理上需要，", "还是相爱遇知音？"], "2026.9.20"),
    (22, ["人间真爱吾所愿，", "泰铢一停情归零。", "嫁汉穿衣加吃饭，", "我需做爱度人生!"], "2026.9.20"),
    (23, ["暹罗生活七八年，", "分分合合已看惯。", "多少欧美白鬼佬，", "嫩草闹剧飞劳燕!"], "2026.9.20"),
    (24, ["我对真爱已死心，", "愿人负我不负人!", "今朝有酒今朝醉，", "有情有义度人生!"], "2026.9.20"),
]

taimei_poems = []
for num, content, date in taimei_raw:
    poem_obj = {
        "title": f"泰妹篇之{num}",
        "subtitle": "",
        "preface": "",
        "content": content,
        "notes": [f"作于 {date}"],
        "year": "2026",
        "location": "泰国",
        "genre": "七言绝句",
        "tags": ["泰妹篇", "泰国", "晚晴", "情缘", "幽默", "2026"],
        "volumeId": "vol-5",
        "volume": "卷九·暹罗长歌与晚晴行",
        "id": f"zy-{1371 + num}"
    }
    taimei_poems.append(poem_obj)

print(f"[OK] Generated 8 回乡曲 poems (zy-1364~zy-1371) and 24 泰妹篇 poems (zy-1372~zy-1395).")

# 3. 寻找插入位置
# 回乡曲之012 的位置
idx_012 = next(i for i, p in enumerate(poems) if p["title"] == "回乡曲之012")
# 插入 hx_part1 (之013~之016)
for offset, p in enumerate(hx_part1):
    poems.insert(idx_012 + 1 + offset, p)
print(f"[OK] Inserted 4 poems after 回乡曲之012 (index {idx_012+1}).")

# 回乡曲之102 的位置
idx_102 = next(i for i, p in enumerate(poems) if p["title"] == "回乡曲之102")
# 插入 hx_part2 (之103~之106)
for offset, p in enumerate(hx_part2):
    poems.insert(idx_102 + 1 + offset, p)
print(f"[OK] Inserted 4 poems after 回乡曲之102 (index {idx_102+1}).")

# vol-5 最后一首七夕歌的位置
idx_qixi = next(i for i, p in enumerate(poems) if p["title"] == "七夕歌" and p.get("volumeId") == "vol-5")
for offset, p in enumerate(taimei_poems):
    poems.insert(idx_qixi + 1 + offset, p)
print(f"[OK] Inserted 24 泰妹篇 poems after 七夕歌 (index {idx_qixi+1}).")

print(f"New total poems count: {len(poems)}")

# 4. 更新 volumes.json
for v in volumes:
    if v["id"] == "vol-3":
        v["description"] = "2025年8月-11月归国探亲作。全集完整收录《回乡曲之001》至《之142》，深情记录一口川普返故园、老母倚门迎儿、长兄手足、同窗佳宴、大凉山故地、泸山古刹访友、九十八岁慈母仙寿、遵母令拒礼金、弟侄拼酒老屋宿醉与门前鱼塘垂钓一百三十二首。"
    elif v["id"] == "vol-5":
        v["description"] = "2021年-2026年居泰国作。收录今日咖啡馆随吟、美臀篇、金链花四咏、拷涛放歌与闲吟、红树林三章、清迈泰北纪行、水灯节、元旦随笔、偶遇泰警、重读商君列传，及晚晴最新幽默风月组诗《泰妹篇二十四章》诸浩瀚长歌与晚晴抒怀九十二首。"

# 写入文件
with open(POEMS_PATH, "w", encoding="utf-8") as f:
    json.dump(poems, f, ensure_ascii=False, indent=2)

with open(VOLUMES_PATH, "w", encoding="utf-8") as f:
    json.dump(volumes, f, ensure_ascii=False, indent=2)

print("[OK] Successfully written to poems.json and volumes.json.")
