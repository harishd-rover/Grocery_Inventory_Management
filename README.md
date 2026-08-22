# Grocery Inventory Management

A React and Flask inventory workspace for managing grocery items, suppliers, stock, purchases, billing, and reports.

The starter records live in `database/seed_data.json`. Flask loads them into memory at startup; this file is only seed data and is not a persistent database.

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

The API runs at `http://localhost:5000` and currently uses in-memory data.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The frontend talks to the Flask API at `http://localhost:5000`.
