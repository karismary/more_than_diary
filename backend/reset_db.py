"""重置 MySQL 表结构：删除旧表，让 create_all 重建带 mood/place/weather 的新表。

只重建结构，不含测试数据（旧数据不重要，已确认可删）。
复用项目已验证的 SQLAlchemy engine 连接方式，不手动解析密码。
用法：uv run python reset_db.py
"""

from sqlalchemy import text

from backend.db import Base, engine, init_db


def main() -> None:
    # 按外键依赖逆序 DROP（fragments/vectors 依赖 entries），entry_chunks 是旧版遗留表
    with engine.connect() as conn:
        for table in ["vectors", "fragments", "entry_chunks", "entries"]:
            conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
            print(f"已删除 {table}")
        conn.commit()

    # 让 create_all 重建三张新表（含 mood/place/weather 列）
    init_db()
    print("已重建 entries/fragments/vectors（含 mood/place/weather）")


if __name__ == "__main__":
    main()
