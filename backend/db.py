import os
from contextlib import contextmanager
from pathlib import Path

import mysql.connector
from mysql.connector import pooling
from dotenv import load_dotenv

load_dotenv(Path(__file__).with_name(".env"))


def _config():
    return {
        "host": os.getenv("MYSQL_HOST", "localhost"),
        "port": int(os.getenv("MYSQL_PORT", "3306")),
        "user": os.getenv("MYSQL_USER", "grocery_admin"),
        "password": os.getenv("MYSQL_PASSWORD", "Admin123"),
        "database": os.getenv("MYSQL_DATABASE", "grocery_inventory_v1"),
    }


_pool = None


def get_pool():
    global _pool
    if _pool is None:
        pool_size = int(os.getenv("MYSQL_POOL_SIZE", "20"))
        _pool = pooling.MySQLConnectionPool(pool_name="grocery_pool", pool_size=pool_size, **_config())
    return _pool


@contextmanager
def connection(dictionary=True):
    conn = get_pool().get_connection()
    cursor = conn.cursor(dictionary=dictionary)
    try:
        yield conn, cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()
