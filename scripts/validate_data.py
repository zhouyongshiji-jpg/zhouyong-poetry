#!/usr/bin/env python3
"""
《周庸诗集》数据完整性自动体检脚本
用于在发布前全面检查 data/volumes.json 和 data/poems.json 的格式、ID、卷归属与内容完整性。

运行命令：
    python scripts/validate_data.py

退出码：
    0 = 校验 100% 通过，可以安全发布
    1 = 存在阻断性错误，禁止发布！
"""

import json
import re
import sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).resolve().parent.parent
VOLUMES_PATH = ROOT / "data" / "volumes.json"
POEMS_PATH = ROOT / "data" / "poems.json"

POEM_ID_PATTERN = re.compile(r"^zy-\d{3,}$")
VOLUME_ID_PATTERN = re.compile(r"^vol-[A-Za-z0-9_-]+$")

errors = []
warnings = []

def check():
    if not VOLUMES_PATH.exists():
        errors.append(f"缺少卷目文件: {VOLUMES_PATH}")
        return
    if not POEMS_PATH.exists():
        errors.append(f"缺少诗作文件: {POEMS_PATH}")
        return

    try:
        with open(VOLUMES_PATH, "r", encoding="utf-8") as f:
            volumes = json.load(f)
    except Exception as e:
        errors.append(f"volumes.json 解析失败: {e}")
        return

    try:
        with open(POEMS_PATH, "r", encoding="utf-8") as f:
            poems = json.load(f)
    except Exception as e:
        errors.append(f"poems.json 解析失败: {e}")
        return

    # 1. 检查 volumes.json
    if not isinstance(volumes, list) or len(volumes) == 0:
        errors.append("volumes.json 必须是非空数组")
        return

    vol_ids = set()
    for idx, v in enumerate(volumes):
        v_id = v.get("id", "")
        if not v_id or not VOLUME_ID_PATTERN.match(v_id):
            errors.append(f"卷目第 {idx+1} 项缺少合法的 'id' (例: vol-1)")
        if v_id in vol_ids:
            errors.append(f"卷目 ID 重复: {v_id}")
        vol_ids.add(v_id)
        if not v.get("name"):
            errors.append(f"卷目 {v_id} 缺少 'name'")

    # 2. 检查 poems.json
    if not isinstance(poems, list) or len(poems) == 0:
        errors.append("poems.json 必须是非空数组")
        return

    poem_ids = []
    seen_content = {}

    for idx, p in enumerate(poems):
        pid = p.get("id", "")
        loc = f"第 {idx+1} 首诗 (ID: {pid or '未知'})"

        if not pid or not POEM_ID_PATTERN.match(pid):
            errors.append(f"{loc}: ID 格式不符合 'zy-###' 规范")
        poem_ids.append(pid)

        # 卷归属
        v_id = p.get("volumeId")
        if not v_id:
            errors.append(f"{loc}: 缺少 'volumeId'")
        elif v_id not in vol_ids:
            errors.append(f"{loc}: 引用了不存在的卷目 ID '{v_id}'")

        # 标题与正文
        title = p.get("title", "").strip()
        if not title:
            errors.append(f"{loc}: 标题不能为空")

        content = p.get("content")
        if not isinstance(content, list) or len(content) == 0:
            errors.append(f"{loc}: 正文 'content' 必须为非空字符串数组")
        else:
            for l_idx, line in enumerate(content):
                if not isinstance(line, str):
                    errors.append(f"{loc} 第 {l_idx+1} 行正文不是字符串")

            # 签名比对排重
            clean_lines = "".join(re.sub(r"[\s，。！？、：；“”‘’]", "", l) for l in content)
            sig = f"{title}@@{clean_lines[:40]}"
            if sig in seen_content:
                warnings.append(f"{loc} 与 {seen_content[sig]} 标题及前40字高度雷同，请确认是否误重复导入")
            seen_content[sig] = pid

    # 检查 ID 唯一性
    counts = Counter(poem_ids)
    duplicates = [pid for pid, c in counts.items() if c > 1]
    if duplicates:
        errors.append(f"存在重复诗作 ID: {', '.join(duplicates)}")

    # 检查 ID 序号连续性警告
    id_nums = []
    for pid in poem_ids:
        m = re.match(r"^zy-(\d+)$", pid)
        if m:
            id_nums.append(int(m.group(1)))
    if id_nums:
        expected = list(range(1, len(id_nums) + 1))
        if id_nums != expected:
            missing = set(expected) - set(id_nums)
            if missing:
                warnings.append(f"诗作编号存在跳号 (缺失: {sorted(list(missing))[:10]}...)，若是故去作品隐藏则属正常")

    # 输出体检报告
    print("=" * 65)
    print(f"《周庸诗集》数据健康体检报告 (全集总计: {len(poems)} 首 | 共 {len(volumes)} 卷)")
    print("=" * 65)

    for v in volumes:
        count = sum(1 for p in poems if p.get("volumeId") == v["id"])
        print(f"  • [{v['id']}] {v['name']}: {count} 首")

    print("-" * 65)
    if warnings:
        print(f"⚠️  发现 {len(warnings)} 项警告提示（不阻断发布）：")
        for w in warnings:
            print(f"   [提示] {w}")

    if errors:
        print(f"❌ 发现 {len(errors)} 项严重错误（禁止发布！）：")
        for e in errors:
            print(f"   [错误] {e}")
        print("=" * 65)
        print("体检未通过！请修复上述错误后再执行发布。")
        sys.exit(1)
    else:
        print("✅ 全集数据 100% 校验通过！零语法错误、零重复ID、卷关联完全吻合。")
        print("=" * 65)
        sys.exit(0)

if __name__ == "__main__":
    check()
