# Grocery Inventory Management Backend Technical Report

## 1. Overview

This file is the backend API for the grocery inventory management system. It is implemented in Python using Flask, a lightweight web framework. The file exposes REST endpoints for authentication, user management, product management, sales, purchases, supplier management, and summary dashboard metrics.

The application is purpose-built for a small business inventory workflow. It stores data in memory while the server is running, which makes it easy to test quickly but means the data is lost when the server restarts.

---

## 2. Imports and Dependencies

```python
from datetime import date, datetime, timezone
from functools import wraps
from secrets import token_urlsafe

from flask import Flask, g, jsonify, request
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash
```

This block imports the libraries needed for the app:

- `datetime`, `date`, `timezone`: used for date and timestamp creation.
- `wraps`: preserves metadata on decorated functions.
- `token_urlsafe`: creates random secure authentication tokens.
- `Flask`: builds the API server.
- `g`: stores per-request global state.
- `jsonify`: turns Python objects into JSON responses.
- `request`: reads incoming HTTP request data.
- `CORS`: allows cross-origin requests from the frontend.
- `check_password_hash` / `generate_password_hash`: hash and validate passwords securely.

---

## 3. Application Setup

```python
app = Flask(__name__)
CORS(app)
```

- `Flask(__name__)` creates the Flask application instance.
- `CORS(app)` lets the frontend, hosted separately, talk to the backend without browser blocking.

This is necessary because frontend and backend usually run on different ports, such as 5173 for Vite and 5000 for Flask.

---

## 4. In-Memory Storage

```python
categories = []
products = []
suppliers = []
purchases = []
sales = []
```

These arrays hold all runtime data.

- `categories`: category list for inventory classification.
- `products`: product inventory records.
- `suppliers`: vendor records.
- `purchases`: incoming inventory records.
- `sales`: outgoing inventory transactions.

Because these are lists in memory, the app has no real persistence. This is a prototype architecture, suitable for development or demo systems.

---

## 5. UTC Timestamp Helper

```python
def utc_now():
    return datetime.now(timezone.utc).isoformat()
```

This helper creates a timestamp in ISO format with UTC timezone.

Example output:

```python
2026-08-25T12:00:00+00:00
```

This is used for auditing and date tracking on products, suppliers, users, and purchase/sale records.

---

## 6. Date-Added Fallback Logic

```python
for records in (products, suppliers, purchases):
    for record in records:
        record.setdefault("date_added", f"{record.get('date', '2024-06-01')}T00:00:00+00:00")
```

This loops over records to ensure that missing `date_added` fields get a default value.

It uses `setdefault`, which only sets a key if it does not already exist.

This protects against missing timestamps in seed or imported data and helps keep all records consistent.

---

## 7. Seed Users

```python
users = {
    "hari": {"id": 1, "name": "Harish D", "role": "staff", "date_added": "2024-06-01T00:00:00+00:00", "password": generate_password_hash("12345")},
    "nishi": {"id": 2, "name": "Nishitha Shetty", "role": "admin", "date_added": "2024-06-02T00:00:00+00:00", "password": generate_password_hash("admin")},
    "abhi": {"id": 3, "name": "Abhi", "role": "staff", "date_added": "2024-06-03T00:00:00+00:00", "password": generate_password_hash("12345")},
}
active_tokens = {}
```

This defines the built-in users:

- `hari`: staff user
- `nishi`: admin user
- `abhi`: staff user

Passwords are hashed, so user credentials are not stored in plain text.

`active_tokens` stores valid login sessions; the key is a generated token and the value is the user object.

---

## 8. Authentication Decorator

```python
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
```

This is a custom decorator that ensures protected routes require valid login credentials.

### Behavior

- Reads `Authorization` header
- Strips the `Bearer ` prefix
- Looks up the token in `active_tokens`
- Returns 401 if invalid or missing
- Returns 403 if user lacks required role
- Sets `g.current_user` when authentication passes

This is the central access control layer for the application.

---

## 9. Login Endpoint

```python
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
```

This API endpoint authenticates a user.

### Flow

1. Reads JSON payload.
2. Normalizes username to lowercase.
3. Finds the matching user.
4. Validates password using hash comparison.
5. Generates a random token.
6. Stores token in memory.
7. Returns token and user data to the frontend.

This is the main login route used by the React frontend.

---

## 10. Current User Endpoint

```python
@app.get("/api/auth/me")
@require_auth()
def current_user():
    return jsonify(g.current_user)
```

This route returns the currently logged-in user details.

It is protected by the authentication decorator, so only valid tokens are allowed.

---

## 11. Public User Utility

```python
def public_user(user, username=None):
    return {"id": user["id"], "name": user["name"], "username": username or user["username"], "role": user["role"], "date_added": user["date_added"]}
```

This strips out sensitive data such as password hash and returns a safe version of the user object.

This helps avoid exposing internal auth data to the frontend.

---

## 12. User Search Helper

```python
def find_user(user_id):
    return next(((username, user) for username, user in users.items() if user["id"] == user_id), (None, None))
```

This helper locates a user by numeric ID.

It uses `next` to return the first matching item or `(None, None)` if not found.

---

## 13. List Users

```python
@app.get("/api/users")
@require_auth({"admin"})
def get_users():
    return jsonify([public_user(user, username) for username, user in users.items()])
```

This returns all users in a safe format.

It is admin-only. The role check prevents staff users from listing all accounts.

---

## 14. Create User

```python
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
```

This creates a new account.

Validation rules:

- name required
- username required
- password required
- role must be admin or staff
- username must be unique

The new user record is inserted into the dictionary and stored with a hashed password.

---

## 15. Update User

```python
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
```

This updates an existing user record.

It carefully avoids:

- duplicate usernames
- empty required fields
- demoting the last admin account

It also updates any active session token whose user matches the updated user ID so the frontend sees fresh user details.

---

## 16. Delete User

```python
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
```

This removes a user, but it protects against bad states:

- you cannot delete your own account
- you cannot delete the only admin

It also logs them out by deleting their matching token session.

---

## 17. Summary Dashboard Endpoint

```python
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
```

This computes important dashboard values.

It filters records for today and then sums totals. It returns a summary object used by the frontend dashboard.

This gives quick business metrics like:

- current inventory quantity
- inventory value
- low-stock items
- purchases and sales totals
- profit for the day

---

## 18. List Products

```python
@app.get("/api/products")
@require_auth()
def get_products():
    return jsonify(products)
```

Returns all product records for the authenticated user.

---

## 19. Add Product

```python
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
```

This creates a new product in stock.

Important points:

- payload must include required fields
- if supplier is provided, supplier must exist
- product ID is auto-generated
- SKU is auto-generated
- reorder level defaults to 10
- inventory product count is tied to supplier

---

## 20. Update Product

```python
@app.patch("/api/products/<int:product_id>")
@require_auth({"admin"})
def update_product(product_id):
    product = next((item for item in products if item["id"] == product_id), None)
    if not product:
        return jsonify({"error": "Product not found"}), 404
    product.update(request.get_json() or {})
    return jsonify(product)
```

This updates an existing product with a PATCH request.

It does not do much validation; it simply merges incoming JSON fields into the current product record.

---

## 21. Create Sale

```python
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
```

This creates a sale transaction.

### Logic

- Accepts either a list of items or a single product payload
- Validates product existence and stock levels
- Decreases product quantities to reflect sales
- Builds a sale record with invoice-like metadata
- Appends it to the `sales` list

This implements the inventory-out flow for the business.

---

## 22. Get Sales

```python
@app.get("/api/sales")
@require_auth({"admin"})
def get_sales():
    return jsonify(sales)
```

This returns all sales records and is restricted to admin access.

---

## 23. List Suppliers

```python
@app.get("/api/suppliers")
@require_auth()
def get_suppliers():
    return jsonify(suppliers)
```

Returns all supplier records.

---

## 24. List Purchases

```python
@app.get("/api/purchases")
@require_auth()
def get_purchases():
    return jsonify(purchases)
```

Returns purchase history for the user.

---

## 25. Create Purchase

```python
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
```

This records a purchase order and updates stock and supplier supply metadata.

Important logic:

- verifies supplier and product match
- ensures product is assigned to that supplier
- validates quantity against supplier limits
- increments product quantity in stock
- reduces remaining supplier quantity
- stores purchase details and total amount

This is the inventory-in flow of the system.

---

## 26. Get Categories

```python
@app.get("/api/categories")
@require_auth()
def get_categories():
    return jsonify(categories)
```

Returns category data for logged-in users.

The list is empty in the current version because nothing populates it.

---

## 27. Add Supplier

```python
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
```

This creates a supplier and associates chosen products with them.

It ensures:

- product IDs are valid
- quantities and prices are valid numbers
- quantities are positive
- not negative prices

It updates each selected product to reflect the new supplier assignment.

---

## 28. Health Endpoint

```python
@app.get("/api/health")
def health():
    return jsonify({"status": "ok", "storage": "in-memory"})
```

This endpoint confirms the API is alive and reveals that data is stored in memory.

---

## 29. Startup Logic

```python
if __name__ == "__main__":
    app.run(debug=True, port=5000)
```

This portion runs the Flask application when the file is executed directly.

Parameters:

- `debug=True`: enables debug mode for easier development feedback
- `port=5000`: runs the server on port 5000

---

## 30. Conclusion

This file is the main backend service for the grocery inventory system. It provides a REST API with in-memory data storage, authentication, role-based access control, product operations, sales and purchase logic, supplier relationships, and summary metrics for the frontend dashboard.

It is ideal for a prototype or internal project, but it is not production-ready because data is not persisted beyond the server runtime and some route validation is minimal.

In future versions, this file would likely be refactored into a cleaner architecture with repository/service layers and a database such as MySQL.
