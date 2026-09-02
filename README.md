# Grocery Inventory Management

A JavaScript, Flask, and MySQL inventory workspace for managing grocery items, suppliers, stock, purchases, billing, and reports.

## Requirements

- Python 3.9 or newer with `pip` for the Flask backend
- Node.js 18 or newer with `npm` for the Vite frontend
- MySQL 8.0 or newer
- A terminal such as PowerShell, Command Prompt, or Bash

Check the installed versions before setup:

```powershell
python --version
pip --version
node --version
npm --version
```

Minimum supported versions:

| Tool | Version |
| --- | --- |
| Python | 3.9 or newer |
| pip | Included with Python 3.9 or newer |
| Node.js | 18 or newer |
| npm | Included with Node.js 18 or newer |

## Project structure

```text
backend/     Flask REST API
database/    MySQL schema, seed data, and setup scripts
frontend/    Vite and JavaScript application
```

## Setup and run locally

Start the backend and frontend in two separate terminals from the project root.

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
$env:MYSQL_PASSWORD = "admin123"
$env:MYSQL_POOL_SIZE = "10"
python app.py
```

On Command Prompt, activate the virtual environment with:

```bat
.venv\Scripts\activate.bat
```

The API runs at `http://localhost:5000`. Verify that it is available by opening:

`http://localhost:5000/api/health`

The expected response is:

```json
{"status":"ok","storage":"mysql"}
```

### 2. Create and seed the MySQL database

Connect to MySQL as `root` with password `admin123`, then run the SQL files in this order from a MySQL client such as MySQL Workbench:

```sql
SOURCE database/create_database.sql;
SOURCE database/schema.sql;
SOURCE database/seed.sql;
```


The scripts create the `grocery_inventory` database, create all required tables, and insert initial demo data. The backend defaults to these local MySQL settings:

| Setting | Value |
| --- | --- |
| Host | `127.0.0.1` |
| Port | `3306` |
| User | `root` |
| Password | `admin123` |
| Database | `grocery_inventory` |

### 3. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## Authentication and roles

The frontend starts with a login screen. The backend uses bearer tokens to protect the application API.

**Development-only demo accounts:**

| Username | Password | Role |
| --- | --- | --- |
| `nishi` | `admin` | Administrator |

Staff can view inventory, suppliers, purchases, reports, and create sales or purchases. Administrators can also add or update products, add suppliers, manage workspace settings, and access team controls. Authorization is enforced by the backend, so hiding a frontend control does not grant additional access.

## API overview

The backend exposes these routes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API status and storage mode |
| `POST` | `/api/auth/login` | Sign in and receive an access token |
| `GET` | `/api/auth/me` | Get the signed-in user |
| `GET` | `/api/users` | List users (admin only) |
| `POST` | `/api/users` | Create a user (admin only) |
| `PATCH` | `/api/users/<id>` | Update a user or role (admin only) |
| `DELETE` | `/api/users/<id>` | Delete a user (admin only) |
| `GET` | `/api/summary` | Dashboard summary values |
| `GET` | `/api/products` | List products |
| `POST` | `/api/products` | Add a product |
| `PATCH` | `/api/products/<id>` | Update a product |
| `POST` | `/api/sales` | Create a sale and reduce stock |
| `GET` | `/api/sales` | List billing invoices |
| `GET` | `/api/suppliers` | List suppliers |
| `POST` | `/api/suppliers` | Add a supplier |
| `GET` | `/api/purchases` | List purchases |
| `POST` | `/api/purchases` | Add a purchase and increase stock |
| `GET` | `/api/categories` | List product categories |

## Data and persistence

The backend uses MySQL for users, categories, products, suppliers, purchases, and sales. Changes made through the API persist across backend restarts. `database/seed_data.json` is retained as reference data; use `database/seed.sql` for the active MySQL seed data.

## Frontend commands

Run these from `frontend/`:

```powershell
npm run dev       # Start the development server
npm run build     # Create a production build
npm run preview   # Preview the production build locally
```

## Troubleshooting

- If PowerShell blocks activation, run `Set-ExecutionPolicy -Scope Process Bypass` for the current terminal, then activate `.venv` again.
- If port `5000` is already in use, stop the other process before starting Flask.
- If the frontend cannot load data, confirm that the backend is running and that `http://localhost:5000/api/health` responds successfully.
- If dependencies change, rerun `python -m pip install -r requirements.txt` or `npm install` in the relevant directory.
