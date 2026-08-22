import json
from datetime import date
from pathlib import Path

from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE_FILE = Path(__file__).resolve().parent.parent / "database" / "seed_data.json"
with DATABASE_FILE.open(encoding="utf-8") as seed_file:
    seed_data = json.load(seed_file)

categories = seed_data["categories"]
products = seed_data["products"]
suppliers = seed_data["suppliers"]
purchases = seed_data["purchases"]
sales = []

@app.get("/api/summary")
def summary():
    return jsonify({
        "products": len(products),
        "inventory_value": round(sum(item["price"] * item["quantity"] for item in products), 2),
        "low_stock": sum(item["quantity"] <= item["reorder_level"] for item in products),
        "suppliers": len(suppliers),
        "sales_today": 1284.60,
        "orders_today": 38,
        "sales_change": 12.5,
    })

@app.get("/api/products")
def get_products():
    return jsonify(products)

@app.post("/api/products")
def add_product():
    payload = request.get_json() or {}
    required = ["name", "category", "price", "quantity"]
    if any(field not in payload for field in required):
        return jsonify({"error": "name, category, price and quantity are required"}), 400
    new_product = {"id": max(item["id"] for item in products) + 1, "sku": f"PRD-{1000 + len(products) + 1}", "unit": "unit", "supplier": "Unassigned", "reorder_level": 10, **payload}
    products.append(new_product)
    return jsonify(new_product), 201

@app.patch("/api/products/<int:product_id>")
def update_product(product_id):
    product = next((item for item in products if item["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.update(request.get_json() or {})
    return jsonify(product)

@app.post("/api/sales")
def create_sale():
    payload = request.get_json() or {}
    product = next((item for item in products if item["id"] == payload.get("product_id")), None)
    quantity = int(payload.get("quantity", 1))
    if not product:
        return jsonify({"error": "Product not found"}), 404
    if quantity < 1 or product["quantity"] < quantity:
        return jsonify({"error": "Not enough stock available"}), 400
    product["quantity"] -= quantity
    sale = {"id": f"INV-{1000 + len(sales) + 1}", "product": product["name"], "quantity": quantity, "total": round(product["price"] * quantity, 2)}
    sales.append(sale)
    return jsonify(sale), 201

@app.get("/api/suppliers")
def get_suppliers():
    return jsonify(suppliers)

@app.get("/api/purchases")
def get_purchases():
    return jsonify(purchases)

@app.post("/api/purchases")
def add_purchase():
    payload = request.get_json() or {}
    required = ["supplier", "product_id", "quantity"]
    if any(field not in payload for field in required):
        return jsonify({"error": "supplier, product_id and quantity are required"}), 400
    product = next((item for item in products if item["id"] == int(payload["product_id"])), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    quantity = int(payload["quantity"])
    if quantity < 1:
        return jsonify({"error": "Quantity must be at least 1"}), 400
    product["quantity"] += quantity
    purchase = {"id": f"PO-{24019 + len(purchases)}", "supplier": payload["supplier"], "product": product["name"], "items": quantity, "total": round(product["price"] * quantity, 2), "date": date.today().isoformat(), "status": "Received"}
    purchases.insert(0, purchase)
    return jsonify(purchase), 201

@app.get("/api/categories")
def get_categories():
    return jsonify(categories)

@app.post("/api/suppliers")
def add_supplier():
    payload = request.get_json() or {}
    if not payload.get("name") or not payload.get("contact"):
        return jsonify({"error": "name and contact are required"}), 400
    supplier = {"id": max(item["id"] for item in suppliers) + 1, "name": payload["name"], "contact": payload["contact"], "products": 0, "status": "Active"}
    suppliers.append(supplier)
    return jsonify(supplier), 201

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "storage": "in-memory"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
