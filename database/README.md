# MySQL setup

1. Install the backend dependencies:

```powershell
cd backend
python -m pip install -r requirements.txt
```

2. Create the schema and seed the demo data from a MySQL client:

```sql
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```


Run those commands from the repository root, or use absolute paths in the MySQL client.

3. Configure the backend before starting Flask. PowerShell example:

```powershell
$env:MYSQL_HOST = "127.0.0.1"
$env:MYSQL_PORT = "3306"
$env:MYSQL_USER = "root"
$env:MYSQL_PASSWORD = "admin123"
$env:MYSQL_DATABASE = "grocery_inventory"
$env:MYSQL_POOL_SIZE = "10"
cd backend
python app.py
```

The defaults are `127.0.0.1`, port `3306`, user `root`, password `admin123`, database `grocery_inventory`, and a pool size of `10`. The pool size covers the frontend's concurrent startup requests; increase `MYSQL_POOL_SIZE` if more concurrent backend requests are expected. Restart Flask after changing this setting.

Seeded demo account:

- `nishi / admin`
