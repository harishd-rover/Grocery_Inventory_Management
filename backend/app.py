from datetime import date, datetime, timezone
from functools import wraps
from secrets import token_urlsafe

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

app = Flask(__name__)
CORS(app)

categories = []
products = []
suppliers = []
purchases = []
sales = []

def utc_now():
    return datetime.now(timezone.utc).isoformat()


for records in (products, suppliers, purchases):
    for record in records:
        record.setdefault("date_added", f"{record.get('date', '2024-06-01')}T00:00:00+00:00")

users = {
    "hari": {"id": 1, "name": "Harish D", "role": "staff", "date_added": "2024-06-01T00:00:00+00:00", "password": generate_password_hash("12345")},
    "nishi": {"id": 2, "name": "Nishitha Shetty", "role": "admin", "date_added": "2024-06-02T00:00:00+00:00", "password": generate_password_hash("admin")},
    "abhi": {"id": 3, "name": "Abhi", "role": "staff", "date_added": "2024-06-03T00:00:00+00:00", "password": generate_password_hash("12345")},
}
active_tokens = {}


def require_auth(roles=None):
    allowed_roles = set(roles or [])

    def decorator(view):
        @wraps(view)
        def wrapped_view(*args, **kwargs):
            token = request.headers.get("Authorization", "").removeprefix("Bearer ").strip()
            user = active_tokens.get(token)
            if not user:
                return jsonify({"error": "Authentication required"}), 401
            if allowed_roles and user["role"] not in allowed_roles:
                return jsonify({"error": "Admin access required"}), 403
            g.current_user = user
            return view(*args, **kwargs)

        return wrapped_view

    return decorator


@app.post("/api/auth/login")
def login():
    payload = request.get_json() or {}
    username = payload.get("username", "").strip().lower()
    user = users.get(username)
    if not user or not check_password_hash(user["password"], payload.get("password", "")):
        return jsonify({"error": "Invalid username or password"}), 401
    token = token_urlsafe(32)
    user_details = {"id": user["id"], "name": user["name"], "username": username, "role": user["role"]}
    active_tokens[token] = user_details
    return jsonify({"token": token, "user": user_details})


@app.get("/api/auth/me")
@require_auth()
def current_user():
    return jsonify(g.current_user)


def public_user(user, username=None):
    return {"id": user["id"], "name": user["name"], "username": username or user["username"], "role": user["role"], "date_added": user["date_added"]}


def find_user(user_id):
    return next(((username, user) for username, user in users.items() if user["id"] == user_id), (None, None))


@app.get("/api/users")
@require_auth({"admin"})
def get_users():
    return jsonify([public_user(user, username) for username, user in users.items()])


@app.post("/api/users")
@require_auth({"admin"})
def add_user():
    payload = request.get_json() or {}
    username = payload.get("username", "").strip().lower()
    name = payload.get("name", "").strip()
    password = payload.get("password", "")
    role = payload.get("role", "staff").strip().lower()
    if not name or not username or not password:
        return jsonify({"error": "name, username and password are required"}), 400
    if role not in {"admin", "staff"}:
        return jsonify({"error": "role must be admin or staff"}), 400
    if username in users:
        return jsonify({"error": "Username already exists"}), 409
    user = {"id": max(item["id"] for item in users.values()) + 1, "name": name, "username": username, "role": role, "date_added": utc_now(), "password": generate_password_hash(password)}
    users[username] = user
    return jsonify(public_user(user)), 201


@app.patch("/api/users/<int:user_id>")
@require_auth({"admin"})
def update_user(user_id):
    current_username, user = find_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    payload = request.get_json() or {}
    username = payload.get("username", current_username).strip().lower()
    name = payload.get("name", user["name"]).strip()
    role = payload.get("role", user["role"]).strip().lower()
    if not name or not username:
        return jsonify({"error": "name and username are required"}), 400
    if role not in {"admin", "staff"}:
        return jsonify({"error": "role must be admin or staff"}), 400
    if username != current_username and username in users:
        return jsonify({"error": "Username already exists"}), 409
    if user["role"] == "admin" and role != "admin" and sum(item["role"] == "admin" for item in users.values()) == 1:
        return jsonify({"error": "At least one admin account is required"}), 400
    user.update({"name": name, "username": username, "role": role})
    if payload.get("password"):
        user["password"] = generate_password_hash(payload["password"])
    if username != current_username:
        del users[current_username]
        users[username] = user
    for token_user in active_tokens.values():
        if token_user["id"] == user_id:
            token_user.update(public_user(user))
    return jsonify(public_user(user))


@app.delete("/api/users/<int:user_id>")
@require_auth({"admin"})
def delete_user(user_id):
    username, user = find_user(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if user_id == g.current_user["id"]:
        return jsonify({"error": "You cannot delete your own account"}), 400
    if user["role"] == "admin" and sum(item["role"] == "admin" for item in users.values()) == 1:
        return jsonify({"error": "At least one admin account is required"}), 400
    del users[username]
    for token in [token for token, token_user in active_tokens.items() if token_user["id"] == user_id]:
        del active_tokens[token]
    return jsonify({"message": "User deleted"})

@app.get("/api/summary")
@require_auth()
def summary():
    today = date.today().isoformat()
    todays_sales = [sale for sale in sales if sale.get("date") == today]
    todays_purchases = [purchase for purchase in purchases if purchase.get("date") == today]
    sales_total = sum(sale.get("total", 0) for sale in todays_sales)
    purchases_total = sum(purchase.get("total", 0) for purchase in todays_purchases)
    return jsonify({
        "products": len(products),
        "inventory_units": sum(item.get("quantity", 0) for item in products),
        "inventory_value": round(sum(item["price"] * item["quantity"] for item in products), 2),
        "low_stock": sum(item["quantity"] <= item["reorder_level"] for item in products),
        "suppliers": len(suppliers),
        "sales_today": round(sales_total, 2),
        "orders_today": len(todays_sales),
        "purchases_today": round(purchases_total, 2),
        "purchase_orders_today": len(todays_purchases),
        "profit_today": round(sales_total - purchases_total, 2),
        "sales_change": 0,
    })

@app.get("/api/products")
@require_auth()
def get_products():
    return jsonify(products)

@app.post("/api/products")
@require_auth({"admin"})
def add_product():
    payload = request.get_json() or {}
    required = ["name", "category", "unit", "price", "quantity"]
    if any(field not in payload for field in required):
        return jsonify({"error": "name, category, unit, price and quantity are required"}), 400
    supplier_name = payload.get("supplier") or "Unassigned"
    if supplier_name != "Unassigned" and not any(item["name"] == supplier_name for item in suppliers):
        return jsonify({"error": "Selected supplier was not found"}), 400
    new_product = {"id": max((item["id"] for item in products), default=0) + 1, "sku": f"PRD-{1000 + len(products) + 1}", "unit": "unit", "supplier": supplier_name, "reorder_level": 10, "date_added": utc_now(), **payload}
    new_product["supplier"] = supplier_name
    products.append(new_product)
    if supplier_name != "Unassigned":
        supplier = next(item for item in suppliers if item["name"] == supplier_name)
        supplier["products"] += 1
    return jsonify(new_product), 201

@app.patch("/api/products/<int:product_id>")
@require_auth({"admin"})
def update_product(product_id):
    product = next((item for item in products if item["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.update(request.get_json() or {})
    return jsonify(product)

@app.post("/api/sales")
@require_auth({"admin", "staff"})
def create_sale():
    payload = request.get_json() or {}
    sale_items = payload.get("items")
    if sale_items is None and "product_id" in payload:
        sale_items = [{"product_id": payload["product_id"], "quantity": payload.get("quantity", 1)}]
    if not isinstance(sale_items, list) or not sale_items:
        return jsonify({"error": "At least one product item is required"}), 400
    validated_items = []
    for item in sale_items:
        product = next((record for record in products if record["id"] == int(item.get("product_id"))), None)
        quantity = int(item.get("quantity", 0))
        if not product:
            return jsonify({"error": "Product not found"}), 404
        if quantity < 1 or product["quantity"] < quantity:
            return jsonify({"error": f"Not enough stock available for {product['name']}"}), 400
        validated_items.append({"product": product, "quantity": quantity})
    for item in validated_items:
        item["product"]["quantity"] -= item["quantity"]
    sale = {"id": f"INV-{1000 + len(sales) + 1}", "items": sum(item["quantity"] for item in validated_items), "products": [{"product_id": item["product"]["id"], "product": item["product"]["name"], "quantity": item["quantity"], "unit_price": item["product"]["price"]} for item in validated_items], "total": round(sum(item["product"]["price"] * item["quantity"] for item in validated_items), 2), "date": date.today().isoformat(), "date_added": utc_now()}
    sales.append(sale)
    return jsonify(sale), 201

@app.get("/api/sales")
@require_auth({"admin"})
def get_sales():
    return jsonify(sales)

@app.get("/api/suppliers")
@require_auth()
def get_suppliers():
    return jsonify(suppliers)

@app.get("/api/purchases")
@require_auth()
def get_purchases():
    return jsonify(purchases)

@app.post("/api/purchases")
@require_auth({"admin", "staff"})
def add_purchase():
    payload = request.get_json() or {}
    if "items" in payload:
        purchase_items = payload["items"]
    elif "product_id" in payload and "quantity" in payload:
        purchase_items = [{"product_id": payload["product_id"], "quantity": payload["quantity"]}]
    else:
        return jsonify({"error": "supplier and at least one product item are required"}), 400
    if not payload.get("supplier") or not isinstance(purchase_items, list) or not purchase_items:
        return jsonify({"error": "supplier and at least one product item are required"}), 400
    supplier_record = next((item for item in suppliers if item["name"] == payload["supplier"]), None)
    if not supplier_record:
        return jsonify({"error": "Supplier not found"}), 404
    validated_items = []
    for item in purchase_items:
        product = next((record for record in products if record["id"] == int(item.get("product_id"))), None)
        if not product:
            return jsonify({"error": "Product not found"}), 404
        if product["supplier"] != payload["supplier"]:
            return jsonify({"error": f"{product['name']} is not supplied by this supplier"}), 400
        supplier_quantity = supplier_record.get("supply_quantities", {}).get(str(product["id"]))
        supplier_price = supplier_record.get("supply_prices", {}).get(str(product["id"]))
        quantity = int(item.get("quantity", 0))
        if supplier_quantity is None or supplier_price is None:
            return jsonify({"error": f"Supplier quantity and price are not configured for {product['name']}"}), 400
        if quantity < 1 or quantity > int(supplier_quantity):
            return jsonify({"error": f"Quantity for {product['name']} must be between 1 and {supplier_quantity}"}), 400
        validated_items.append({"product": product, "quantity": quantity, "supplier_quantity": int(supplier_quantity), "supplier_unit_price": supplier_price})
    for item in validated_items:
        item["product"]["quantity"] += item["quantity"]
        supplier_record["supply_quantities"][str(item["product"]["id"])] = item["supplier_quantity"] - item["quantity"]
    purchase = {"id": f"PO-{24019 + len(purchases)}", "supplier": payload["supplier"], "items": sum(item["quantity"] for item in validated_items), "products": [{"product_id": item["product"]["id"], "product": item["product"]["name"], "quantity": item["quantity"], "supplier_quantity": item["supplier_quantity"] - item["quantity"], "supplier_quantity_purchased": item["quantity"], "supplier_unit_price": item["supplier_unit_price"]} for item in validated_items], "total": round(sum(item["supplier_unit_price"] * item["quantity"] for item in validated_items), 2), "date": date.today().isoformat(), "date_added": utc_now(), "status": "Received"}
    purchases.insert(0, purchase)
    return jsonify(purchase), 201

@app.get("/api/categories")
@require_auth()
def get_categories():
    return jsonify(categories)

@app.post("/api/suppliers")
@require_auth({"admin"})
def add_supplier():
    payload = request.get_json() or {}
    if not payload.get("name") or not payload.get("contact"):
        return jsonify({"error": "name and contact are required"}), 400
    product_ids = payload.get("product_ids", [])
    supply_quantities = payload.get("supply_quantities", {})
    supply_prices = payload.get("supply_prices", {})
    if not isinstance(product_ids, list):
        return jsonify({"error": "product_ids must be a list"}), 400
    if not isinstance(supply_quantities, dict):
        return jsonify({"error": "supply_quantities must be an object"}), 400
    if not isinstance(supply_prices, dict):
        return jsonify({"error": "supply_prices must be an object"}), 400
    selected_products = [product for product in products if product["id"] in product_ids]
    if len(selected_products) != len(set(product_ids)):
        return jsonify({"error": "One or more selected products were not found"}), 400
    try:
        normalized_quantities = {str(product_id): int(supply_quantities[str(product_id)]) for product_id in product_ids}
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Each selected product needs a valid supply quantity"}), 400
    if any(quantity < 1 for quantity in normalized_quantities.values()):
        return jsonify({"error": "Supply quantities must be at least 1"}), 400
    try:
        normalized_prices = {str(product_id): float(supply_prices[str(product_id)]) for product_id in product_ids}
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "Each selected product needs a valid supplier unit price"}), 400
    if any(price < 0 for price in normalized_prices.values()):
        return jsonify({"error": "Supplier unit prices cannot be negative"}), 400
    supplier = {"id": max((item["id"] for item in suppliers), default=0) + 1, "name": payload["name"], "contact": payload["contact"], "products": len(selected_products), "supply_quantities": normalized_quantities, "supply_prices": normalized_prices, "status": "Active", "date_added": utc_now()}
    for product in selected_products:
        product["supplier"] = supplier["name"]
    suppliers.append(supplier)
    return jsonify(supplier), 201

@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "storage": "in-memory"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
