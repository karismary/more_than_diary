"""向数据库灌入 11 条测试日记（联调用）。

关键点：和真实「写日记」走同一条链路——
建 entry → commit → 切块(Fragment) → embedding(Vector)，
这样 AI 问答能真的检索到它们，而不是只出现在日记列表里。

用法（在 backend/ 目录下）：
    UV_CACHE_DIR=/tmp/diary-app-uv-cache uv run python seed_demo_entries.py
"""

from datetime import datetime

from sqlalchemy import func, select

from backend.db import SessionLocal
from backend.models import Entry
from backend.services.embedding import OpenAIEmbedder
from backend.services.indexing import index_entry
from backend.services.runtime_settings import embed_kwargs

# (created_at, mood, place, weather, content)
# mood 用前端心情筛选的取值（很好/不错/一般/低落），方便测「心情」过滤
ENTRIES = [
    (
        datetime(2026, 7, 12, 9, 30),
        "很好", "户外", "晴",
        "今天和组里的同事约着去走了东西冲海岸线，太阳特别毒，走了六个多小时，脸晒得通红，"
        "但是海风一吹，觉得特别值。回程在车上睡着了，梦里还踩着浪。下次一定记得带防晒和两升水。",
    ),
    (
        datetime(2026, 7, 26, 15, 0),
        "不错", "咖啡馆", "多云",
        "下午在巷口那家咖啡馆坐了四个小时，把《活着》剩下的一半读完了。"
        "福贵这一生经历那么多苦难还是活着，突然觉得自己那点烦恼不算什么。"
        "店主养了只橘猫，趴在我电脑上睡着了，想给它也写一篇日记。",
    ),
    (
        datetime(2026, 8, 3, 21, 40),
        "一般", "公司", "晴",
        "周会开了两个小时，方案又被推翻了一版，这周要加班赶进度，压力有点大。"
        "晚上回家路上看见卖西瓜的摊子，买了个小西瓜，切开是红的，心情稍微好了点。"
        "希望周三前能把接口调通。",
    ),
    (
        datetime(2026, 8, 9, 23, 10),
        "低落", "家", "雨",
        "今天情绪很低落，凌晨三点还睡不着，翻来覆去想工作的事。下午下大雨也没出门。"
        "自己煮了碗面，味道一般。可能是连续加班太久了，明天开始要早点睡。"
        "压力大的时候，至少还有日记可以写。",
    ),
    (
        datetime(2026, 8, 15, 16, 20),
        "不错", "家", "晴",
        "周末整理了书桌和书架，把散落的笔记分门别类放好。"
        "还定了个计划：想把手头学过的数据库和 RAG 知识整理成一份自己的教程，"
        "这个月剩下的周末都排给这件事。收拾完心情很舒畅，像把脑子也理了一遍。",
    ),
    (
        datetime(2026, 8, 21, 20, 0),
        "不错", "家", "晴",
        "今天给妈妈打了个电话，她一直念叨让我按时吃饭。"
        "晚上给自己买了块小蛋糕，就当简单过个日子。"
        "想起小时候过生日，妈妈总会煮两个鸡蛋，那时觉得稀松平常，现在想想挺暖的。",
    ),
    (
        datetime(2026, 8, 29, 18, 45),
        "很好", "家", "雨",
        "台风天，窗外雨下得特别大，窝在家里做了顿红烧肉，居然一次就成功了，肥而不腻。"
        "一边吃一边看老电影。雨天待在家里，有一种偷来的安稳感。",
    ),
    (
        datetime(2026, 9, 2, 22, 15),
        "不错", "公司", "阴",
        "新方案终于通过了，同事说我最近辛苦了，松了一大口气。"
        "晚上骑车回家，风凉凉的，路边的桂花好像要开了。"
        "准备周末去爬塘朗山——上次正经爬山还是七月走海岸线的时候，该动动筋骨了。",
    ),
    (
        datetime(2026, 9, 4, 22, 50),
        "一般", "家", "多云",
        "想给自己一直维护的项目写点介绍文字，坐了一晚上也没什么头绪，开头删了又写、写了又删。"
        "可能我更适合直接动手改代码。也许哪天翻翻日记，能找到一点想说的。",
    ),
    (
        datetime(2026, 9, 5, 17, 30),
        "低落", "家", "晴",
        "上午有点烦，感觉最近生活一团乱，工作、学习、锻炼全挤在一起，哪样都没顾好。"
        "下午出门沿着河边走了很久，慢慢走下来，心里平静不少。"
        "整理一下接下来想做的事：把跑步捡起来，每周三次。",
    ),
    (
        datetime(2026, 9, 6, 15, 10),
        "不错", "咖啡馆", "晴",
        "把一周的日记翻了一遍，发现这周其实干了不少事：方案过了、去爬了一次山、还整理了书桌。"
        "事情一件一件列出来，就没那么焦虑了。"
        "下午在咖啡馆写这篇，阳光很好。下周想试试给巷口那几只常驻的猫拍一组照片。",
    ),
]


def main() -> None:
    db = SessionLocal()
    try:
        before = db.execute(select(func.count()).select_from(Entry)).scalar_one()
        print(f"插入前 entries 已有 {before} 条")

        embedder = OpenAIEmbedder(**embed_kwargs(db))
        print(f"embedding：{embedder.model} · dim {embedder.dim}")

        for i, (created_at, mood, place, weather, content) in enumerate(ENTRIES, start=1):
            entry = Entry(
                content=content,
                mood=mood,
                place=place,
                weather=weather,
                created_at=created_at,
            )
            db.add(entry)
            db.commit()
            db.refresh(entry)

            try:
                # 与 routers/entries.py 的 create_entry 相同：先落 entry 再建索引
                vectors = index_entry(db=db, entry=entry, embedder=embedder)
                print(
                    f"[{i}/11] id={entry.id:>2}  {created_at:%m-%d}  心情={mood}  "
                    f"片段×{len(vectors)}  向量dim={vectors[0].dim if vectors else '-'}"
                )
            except Exception as exc:  # noqa: BLE001 —— 单条失败不中断后续
                db.rollback()
                print(f"[{i}/11] id={entry.id} 索引失败（entry 已保存，可稍后重建）：{type(exc).__name__} {exc}")

        after = db.execute(select(func.count()).select_from(Entry)).scalar_one()
        print(f"\n完成：entries 现有 {after} 条（本次 +{after - before}）")

    finally:
        db.close()


if __name__ == "__main__":
    main()
