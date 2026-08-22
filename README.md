# Grocery Inventory Management

A React and Flask inventory workspace for managing grocery items, suppliers, stock, purchases, billing, and reports.

## Requirements

- Python 3.9 or newer with `pip`
- Node.js 18 or newer with `npm`
- A terminal such as PowerShell, Command Prompt, or Bash

Check the installed versions:

```powershell
python --version
pip --version
node --version
npm --version
```

## Project structure

```text
backend/     Flask REST API
database/    JSON seed data
frontend/    Vite and React application
```

## Setup and run locally

Start the backend and frontend in two separate terminals from the project root.

### 1. Start the backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python app.py
```

On Command Prompt, activate the virtual environment with:

```bat
.venv\Scripts\activate.bat
```

The API runs at `http://localhost:5000`. Verify that it is available by opening:


http://localhost:5000/api/health
```

The expected response is:

```json
{"status":"ok","storage":"in-memory"}
```

### 2. Start the frontend

In a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

## API overview

The backend exposes these routes:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check API status and storage mode |
| `GET` | `/api/summary` | Dashboard summary values |
| `GET` | `/api/products` | List products |
| `POST` | `/api/products` | Add a product |
| `PATCH` | `/api/products/<id>` | Update a product |
| `POST` | `/api/sales` | Create a sale and reduce stock |
| `GET` | `/api/suppliers` | List suppliers |
| `POST` | `/api/suppliers` | Add a supplier |
| `GET` | `/api/purchases` | List purchases |
| `POST` | `/api/purchases` | Add a purchase and increase stock |
| `GET` | `/api/categories` | List product categories |

## Data and persistence

Starter records are stored in `database/seed_data.json`. Flask loads this file into memory when the backend starts. Changes made through the API are lost when the backend restarts, and the seed file is not modified. Persistent storage is intentionally kept behind the API boundary for a future MySQL migration.

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
