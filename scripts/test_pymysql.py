import pymysql
try:
    conn = pymysql.connect(
        host='127.0.0.1', port=3306,
        user='smart', password='smart123456',
        database='smart_home',
        charset='utf8mb4',
        ssl={'fake_flag_to_enable_tls': True},
    )
    with conn.cursor() as cur:
        cur.execute('SELECT 1')
        print('✅ pymysql OK:', cur.fetchone())
    conn.close()
except Exception as e:
    print('❌ pymysql:', type(e).__name__, str(e)[:200])
    # Try with different ssl settings
    try:
        conn = pymysql.connect(
            host='127.0.0.1', port=3306,
            user='smart', password='smart123456',
            database='smart_home',
            charset='utf8mb4',
            ssl={'ssl': {'fake': True}},
        )
        with conn.cursor() as cur:
            cur.execute('SELECT 1')
            print('✅ pymysql ssl OK:', cur.fetchone())
        conn.close()
    except Exception as e2:
        print('❌ pymysql ssl:', type(e2).__name__, str(e2)[:200])
