USE grocery_inventory_v1;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sale_items;
TRUNCATE TABLE sales;
TRUNCATE TABLE purchase_items;
TRUNCATE TABLE purchases;
TRUNCATE TABLE supplier_products;
TRUNCATE TABLE products;
TRUNCATE TABLE suppliers;
TRUNCATE TABLE categories;
TRUNCATE TABLE users;
SET FOREIGN_KEY_CHECKS = 1;

INSERT INTO categories (name) VALUES ('Produce');

INSERT INTO users (name, username, password_hash, role, date_added) VALUES
('Nishitha Shetty', 'nishi', 'scrypt:32768:8:1$YLpfW8XPjOplR9E7$ace2176a17155cdb2e343fe4eae056e8a92f124ca7fc05fedd0ab557ec17c3baadbf402153568dfffb7b1bc65c0deb014cb6ad82ac1a6788aa741d1e57172655', 'admin', '2024-06-02 00:00:00');

INSERT INTO suppliers (name, contact, status) VALUES
('Fresh Farms', '+1 (555) 014-2088', 'Active');

INSERT INTO products (sku, name, category_id, price, quantity, reorder_level, unit, supplier_id, date_added)
SELECT 'PRD-1001', 'Organic Bananas', c.id, 2.49, 42, 20, 'bunch', s.id, '2024-06-01 00:00:00'
FROM categories c CROSS JOIN suppliers s
WHERE c.name = 'Produce' AND s.name = 'Fresh Farms';

INSERT INTO supplier_products (supplier_id, product_id, supply_quantity, supply_price)
SELECT s.id, p.id, 100, 1.80
FROM suppliers s CROSS JOIN products p
WHERE s.name = 'Fresh Farms' AND p.sku = 'PRD-1001';

INSERT INTO purchases (reference, supplier_id, total, purchase_date, status)
SELECT 'PO-24018', id, 428.40, '2024-06-24', 'Received'
FROM suppliers WHERE name = 'Fresh Farms';

INSERT INTO purchase_items (purchase_id, product_id, quantity, supplier_unit_price)
SELECT pu.id, p.id, 3, 1.80
FROM purchases pu CROSS JOIN products p
WHERE pu.reference = 'PO-24018' AND p.sku = 'PRD-1001';

INSERT INTO sales (reference, customer_name, customer_contact, total, sale_date)
VALUES ('INV-1001', 'Walk-in Customer', '0000000000', 2.49, '2024-06-24');

INSERT INTO sale_items (sale_id, product_id, quantity, unit_price)
SELECT s.id, p.id, 1, 2.49
FROM sales s CROSS JOIN products p
WHERE s.reference = 'INV-1001' AND p.sku = 'PRD-1001';
