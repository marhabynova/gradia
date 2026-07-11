import psycopg2
conn = psycopg2.connect('postgresql://postgres:postgres@db:5432/gradia')
cur = conn.cursor()
try:
    cur.execute('ALTER TABLE biz_products ADD COLUMN IF NOT EXISTS source_platform VARCHAR(100);')
    cur.execute('ALTER TABLE biz_products ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);')
    cur.execute('ALTER TABLE biz_products ADD COLUMN IF NOT EXISTS description TEXT;')
    cur.execute('ALTER TABLE biz_products ADD COLUMN IF NOT EXISTS sync_status JSONB DEFAULT \'{"shopee": "pending", "tokopedia": "pending", "tiktok": "pending"}\'::jsonb;')
    cur.execute('ALTER TABLE biz_products ALTER COLUMN supplier_id DROP NOT NULL;')
    cur.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS enhancement_count INTEGER NOT NULL DEFAULT 0;')
    cur.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_enhancement_reset_date TIMESTAMP NOT NULL DEFAULT now();')
    cur.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS chat_count INTEGER NOT NULL DEFAULT 0;')
    cur.execute('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_chat_reset_date TIMESTAMP NOT NULL DEFAULT now();')
    conn.commit()
    print('Columns added successfully.')
except Exception as e:
    print('Error:', e)
cur.close()
conn.close()
