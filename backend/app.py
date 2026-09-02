from datetime import date, datetime, timezone
from functools import wraps
from secrets import token_urlsafe

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from mysql.connector import Error
from werkzeug.security import check_password_hash, generate_password_hash

from db import connection

app = Flask(__name__)
CORS(app)
active_tokens = {}


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


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


def public_user(user):
    return {"id": user["id"], "name": user["name"], "username": user["username"], "role": user["role"], "date_added": user["date_added"].isoformat() if hasattr(user["date_added"], "isoformat") else user["date_added"]}


def product_row(row):
    return {**row, "price": float(row["price"]), "supplier": row["supplier"] or "Unassigned", "date_added": row["date_added"].isoformat()}


def supplier_row(row):
    return {"id": row["id"], "name": row["name"], "contact": row["contact"], "products": row["products"], "status": row["status"], "date_added": row["date_added"].isoformat()}


def purchase_row(row):
    return {"id": row["reference"], "supplier": row["supplier"], "product": row["product"], "items": row["items"], "total": float(row["total"]), "date": row["purchase_date"].isoformat(), "date_added": row["date_added"].isoformat(), "status": row["status"]}


def sale_row(row):
    return {"id": row["reference"], "items": row["items"], "products": row["products"], "total": float(row["total"]), "date": row["sale_date"].isoformat(), "date_added": row["date_added"].isoformat()}


@app.post("/api/auth/login")
def login():
    payload = request.get_json() or {}
    username = payload.get("username", "").strip().lower()
    try:
        with connection() as (_, cursor):
            cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
            user = cursor.fetchone()
    except Error:
        return jsonify({"error": "Database unavailable"}), 503
    if not user or not check_password_hash(user["password_hash"], payload.get("password", "")):
        return jsonify({"error": "Invalid username or password"}), 401
    details = public_user(user)
    token = token_urlsafe(32)
    active_tokens[token] = details
    return jsonify({"token": token, "user": details})


@app.get("/api/auth/me")
@require_auth()
def current_user():
    return jsonify(g.current_user)


@app.get("/api/users")
@require_auth({"admin"})
def get_users():
    with connection() as (_, cursor):
        cursor.execute("SELECT * FROM users ORDER BY date_added DESC, id DESC")
        return jsonify([public_user(user) for user in cursor.fetchall()])


@app.post("/api/users")
@require_auth({"admin"})
def add_user():
    payload = request.get_json() or {}
    username = str(payload.get("username") or "").strip().lower()
    name = str(payload.get("name") or "").strip()
    password = payload.get("password") or ""
    role = str(payload.get("role") or "staff").strip().lower()
    if not name or not username or not password:
        return jsonify({"error": "name, username and password are required"}), 400
    if role not in {"admin", "staff"}:
        return jsonify({"error": "role must be admin or staff"}), 400
    try:
        with connection() as (_, cursor):
            cursor.execute("INSERT INTO users (name, username, password_hash, role) VALUES (%s, %s, %s, %s)", (name, username, generate_password_hash(password), role))
            cursor.execute("SELECT * FROM users WHERE id = %s", (cursor.lastrowid,))
            return jsonify(public_user(cursor.fetchone())), 201
    except Error as error:
        if getattr(error, "errno", None) == 1062:
            return jsonify({"error": "Username already exists"}), 409
        return jsonify({"error": "Unable to create user"}), 400


@app.patch("/api/users/<int:user_id>")
@require_auth({"admin"})
def update_user(user_id):
    payload = request.get_json() or {}
    with connection() as (_, cursor):
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        username = str(payload.get("username", user["username"]) or "").strip().lower()
        name = str(payload.get("name", user["name"]) or "").strip()
        role = str(payload.get("role", user["role"]) or "").strip().lower()
        if not name or not username or role not in {"admin", "staff"}:
            return jsonify({"error": "Valid name, username and role are required"}), 400
        if user["role"] == "admin" and role != "admin":
            cursor.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
            if cursor.fetchone()["count"] == 1:
                return jsonify({"error": "At least one admin account is required"}), 400
        fields = ["name = %s", "username = %s", "role = %s"]
        values = [name, username, role]
        if payload.get("password"):
            fields.append("password_hash = %s")
            values.append(generate_password_hash(payload["password"]))
        values.append(user_id)
        try:
            cursor.execute(f"UPDATE users SET {', '.join(fields)} WHERE id = %s", values)
        except Error as error:
            if getattr(error, "errno", None) == 1062:
                return jsonify({"error": "Username already exists"}), 409
            raise
        cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
        updated = public_user(cursor.fetchone())
    for token_user in active_tokens.values():
        if token_user["id"] == user_id:
            token_user.update(updated)
    return jsonify(updated)


@app.delete("/api/users/<int:user_id>")
@require_auth({"admin"})
def delete_user(user_id):
    if user_id == g.current_user["id"]:
        return jsonify({"error": "You cannot delete your own account"}), 400
    with connection() as (_, cursor):
        cursor.execute("SELECT role FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"error": "User not found"}), 404
        if user["role"] == "admin":
            cursor.execute("SELECT COUNT(*) AS count FROM users WHERE role = 'admin'")
            if cursor.fetchone()["count"] == 1:
                return jsonify({"error": "At least one admin account is required"}), 400
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
    return jsonify({"message": "User deleted"})


@app.get("/api/summary")
@require_auth()
def summary():
    with connection() as (_, cursor):
        cursor.execute("SELECT COUNT(*) AS products, COALESCE(SUM(quantity), 0) AS inventory_units, COALESCE(SUM(price * quantity), 0) AS inventory_value, COALESCE(SUM(quantity <= reorder_level), 0) AS low_stock FROM products")
        result = cursor.fetchone()
        cursor.execute("SELECT COUNT(*) AS count FROM suppliers")
        supplier_count = cursor.fetchone()["count"]
        cursor.execute("SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count FROM sales WHERE sale_date = CURDATE()")
        sales_today = cursor.fetchone()
        cursor.execute("SELECT COALESCE(SUM(total), 0) AS total, COUNT(*) AS count FROM purchases WHERE purchase_date = CURDATE()")
        purchases_today = cursor.fetchone()
    sales_total, purchase_total = float(sales_today["total"]), float(purchases_today["total"])
    return jsonify({"products": result["products"], "inventory_units": result["inventory_units"], "inventory_value": float(result["inventory_value"]), "low_stock": result["low_stock"], "suppliers": supplier_count, "sales_today": sales_total, "orders_today": sales_today["count"], "purchases_today": purchase_total, "purchase_orders_today": purchases_today["count"], "profit_today": sales_total - purchase_total, "sales_change": 0})


@app.get("/api/products")
@require_auth()
def get_products():
    with connection() as (_, cursor):
        cursor.execute("SELECT p.*, s.name AS supplier FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.date_added DESC, p.id DESC")
        return jsonify([product_row(row) for row in cursor.fetchall()])


@app.post("/api/products")
@require_auth({"admin"})
def add_product():
    payload = request.get_json() or {}
    required = ["name", "category", "unit", "price", "quantity"]
    if any(field not in payload for field in required):
        return jsonify({"error": "name, category, unit, price and quantity are required"}), 400
    with connection() as (_, cursor):
        cursor.execute("SELECT id FROM categories WHERE name = %s", (payload["category"],))
        category = cursor.fetchone()
        if not category:
            cursor.execute("INSERT INTO categories (name) VALUES (%s)", (payload["category"],))
            category_id = cursor.lastrowid
        else:
            category_id = category["id"]
        supplier_id = None
        if payload.get("supplier"):
            cursor.execute("SELECT id FROM suppliers WHERE name = %s", (payload["supplier"],))
            supplier = cursor.fetchone()
            if not supplier:
                return jsonify({"error": "Selected supplier was not found"}), 400
            supplier_id = supplier["id"]
        cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM products")
        product_id = cursor.fetchone()["id"]
        sku = f"PRD-{1000 + product_id}"
        cursor.execute("INSERT INTO products (sku, name, category_id, price, quantity, reorder_level, unit, supplier_id) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)", (sku, payload["name"], category_id, payload["price"], payload["quantity"], payload.get("reorder_level", 10), payload["unit"], supplier_id))
        cursor.execute("SELECT p.*, s.name AS supplier FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = %s", (cursor.lastrowid,))
        return jsonify(product_row(cursor.fetchone())), 201


@app.patch("/api/products/<int:product_id>")
@require_auth({"admin"})
def update_product(product_id):
    payload = request.get_json() or {}
    allowed = {key: payload[key] for key in ("name", "price", "quantity", "reorder_level", "unit") if key in payload}
    if not allowed:
        return jsonify({"error": "No product fields supplied"}), 400
    with connection() as (_, cursor):
        cursor.execute(f"UPDATE products SET {', '.join(f'{key} = %s' for key in allowed)} WHERE id = %s", [*allowed.values(), product_id])
        if cursor.rowcount == 0:
            return jsonify({"error": "Product not found"}), 404
        cursor.execute("SELECT p.*, s.name AS supplier FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.id WHERE p.id = %s", (product_id,))
        return jsonify(product_row(cursor.fetchone()))


@app.get("/api/suppliers")
@require_auth()
def get_suppliers():
    with connection() as (_, cursor):
        cursor.execute("SELECT s.*, COUNT(sp.product_id) AS products FROM suppliers s LEFT JOIN supplier_products sp ON s.id = sp.supplier_id GROUP BY s.id ORDER BY s.date_added DESC, s.id DESC")
        return jsonify([supplier_row(row) for row in cursor.fetchall()])


@app.post("/api/suppliers")
@require_auth({"admin"})
def add_supplier():
    payload = request.get_json() or {}
    product_ids, quantities, prices = payload.get("product_ids", []), payload.get("supply_quantities", {}), payload.get("supply_prices", {})
    if not payload.get("name") or not payload.get("contact"):
        return jsonify({"error": "name and contact are required"}), 400
    if not product_ids:
        return jsonify({"error": "Select at least one product"}), 400
    with connection() as (_, cursor):
        cursor.execute("INSERT INTO suppliers (name, contact) VALUES (%s, %s)", (payload["name"], payload["contact"]))
        supplier_id = cursor.lastrowid
        for product_id in product_ids:
            try:
                quantity, price = int(quantities[str(product_id)]), float(prices[str(product_id)])
            except (KeyError, TypeError, ValueError):
                return jsonify({"error": "Each selected product needs a valid supply quantity and price"}), 400
            if quantity < 1 or price < 0:
                return jsonify({"error": "Supply quantity must be at least 1 and price cannot be negative"}), 400
            cursor.execute("INSERT INTO supplier_products (supplier_id, product_id, supply_quantity, supply_price) VALUES (%s, %s, %s, %s)", (supplier_id, product_id, quantity, price))
            cursor.execute("UPDATE products SET supplier_id = %s WHERE id = %s", (supplier_id, product_id))
        cursor.execute("SELECT s.*, COUNT(sp.product_id) AS products FROM suppliers s LEFT JOIN supplier_products sp ON s.id = sp.supplier_id WHERE s.id = %s GROUP BY s.id", (supplier_id,))
        return jsonify(supplier_row(cursor.fetchone())), 201


@app.get("/api/purchases")
@require_auth()
def get_purchases():
    with connection() as (_, cursor):
        cursor.execute("SELECT pu.*, s.name AS supplier, GROUP_CONCAT(p.name SEPARATOR ', ') AS product, SUM(pi.quantity) AS items FROM purchases pu JOIN suppliers s ON pu.supplier_id = s.id JOIN purchase_items pi ON pu.id = pi.purchase_id JOIN products p ON pi.product_id = p.id GROUP BY pu.id ORDER BY pu.purchase_date DESC, pu.id DESC")
        return jsonify([purchase_row(row) for row in cursor.fetchall()])


@app.post("/api/purchases")
@require_auth({"admin", "staff"})
def add_purchase():
    payload = request.get_json() or {}
    items = payload.get("items") or ([{"product_id": payload.get("product_id"), "quantity": payload.get("quantity")}] if payload.get("product_id") else [])
    if not payload.get("supplier") or not items:
        return jsonify({"error": "supplier and at least one product item are required"}), 400
    with connection() as (_, cursor):
        cursor.execute("SELECT * FROM suppliers WHERE name = %s", (payload["supplier"],))
        supplier = cursor.fetchone()
        if not supplier:
            return jsonify({"error": "Supplier not found"}), 404
        validated, total = [], 0
        for item in items:
            cursor.execute("SELECT p.*, sp.supply_quantity, sp.supply_price FROM products p JOIN supplier_products sp ON p.id = sp.product_id WHERE p.id = %s AND sp.supplier_id = %s FOR UPDATE", (int(item["product_id"]), supplier["id"]))
            product = cursor.fetchone()
            quantity = int(item.get("quantity", 0))
            if not product:
                return jsonify({"error": "Product is not supplied by this supplier"}), 400
            if quantity < 1 or quantity > product["supply_quantity"]:
                return jsonify({"error": f"Quantity for {product['name']} must be between 1 and {product['supply_quantity']}"}), 400
            validated.append((product, quantity))
            total += float(product["supply_price"]) * quantity
        cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM purchases")
        reference = f"PO-{24019 + cursor.fetchone()['id'] - 1}"
        cursor.execute("INSERT INTO purchases (reference, supplier_id, total, purchase_date, status) VALUES (%s, %s, %s, %s, 'Received')", (reference, supplier["id"], total, date.today()))
        purchase_id = cursor.lastrowid
        for product, quantity in validated:
            cursor.execute("INSERT INTO purchase_items (purchase_id, product_id, quantity, supplier_unit_price) VALUES (%s, %s, %s, %s)", (purchase_id, product["id"], quantity, product["supply_price"]))
            cursor.execute("UPDATE products SET quantity = quantity + %s WHERE id = %s", (quantity, product["id"]))
            cursor.execute("UPDATE supplier_products SET supply_quantity = supply_quantity - %s WHERE supplier_id = %s AND product_id = %s", (quantity, supplier["id"], product["id"]))
        return jsonify({"id": reference, "supplier": supplier["name"], "items": sum(quantity for _, quantity in validated), "total": round(total, 2), "date": date.today().isoformat(), "status": "Received"}), 201


@app.get("/api/sales")
@require_auth({"admin"})
def get_sales():
    with connection() as (_, cursor):
        cursor.execute("SELECT sa.*, SUM(si.quantity) AS items FROM sales sa JOIN sale_items si ON sa.id = si.sale_id GROUP BY sa.id ORDER BY sa.sale_date DESC, sa.id DESC")
        sales = []
        for row in cursor.fetchall():
            cursor.execute("SELECT si.product_id, p.name AS product, si.quantity, si.unit_price FROM sale_items si JOIN products p ON si.product_id = p.id WHERE si.sale_id = %s", (row["id"],))
            row["products"] = cursor.fetchall()
            sales.append(sale_row(row))
        return jsonify(sales)


@app.post("/api/sales")
@require_auth({"admin", "staff"})
def create_sale():
    payload = request.get_json() or {}
    items = payload.get("items") or ([{"product_id": payload.get("product_id"), "quantity": payload.get("quantity", 1)}] if payload.get("product_id") else [])
    if not items:
        return jsonify({"error": "At least one product item is required"}), 400
    with connection() as (_, cursor):
        validated, total = [], 0
        for item in items:
            cursor.execute("SELECT * FROM products WHERE id = %s FOR UPDATE", (int(item["product_id"]),))
            product, quantity = cursor.fetchone(), int(item.get("quantity", 0))
            if not product:
                return jsonify({"error": "Product not found"}), 404
            if quantity < 1 or product["quantity"] < quantity:
                return jsonify({"error": f"Not enough stock available for {product['name']}"}), 400
            validated.append((product, quantity))
            total += float(product["price"]) * quantity
        cursor.execute("SELECT COALESCE(MAX(id), 0) + 1 AS id FROM sales")
        reference = f"INV-{1000 + cursor.fetchone()['id']}"
        cursor.execute("INSERT INTO sales (reference, total, sale_date) VALUES (%s, %s, %s)", (reference, total, date.today()))
        sale_id = cursor.lastrowid
        for product, quantity in validated:
            cursor.execute("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (%s, %s, %s, %s)", (sale_id, product["id"], quantity, product["price"]))
            cursor.execute("UPDATE products SET quantity = quantity - %s WHERE id = %s", (quantity, product["id"]))
        return jsonify({"id": reference, "items": sum(quantity for _, quantity in validated), "total": round(total, 2), "date": date.today().isoformat()}), 201


@app.get("/api/categories")
@require_auth()
def get_categories():
    with connection() as (_, cursor):
        cursor.execute("SELECT name FROM categories ORDER BY name")
        return jsonify([row["name"] for row in cursor.fetchall()])


@app.get("/api/health")
def health():
    try:
        with connection() as (_, cursor):
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return jsonify({"status": "ok", "storage": "mysql"})
    except Error:
        return jsonify({"status": "error", "storage": "mysql"}), 503


if __name__ == "__main__":
    app.run(debug=True, port=5000)
