import React, { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertTriangle, ArrowDownToLine, ArrowUpRight, BarChart3, Bell, Boxes, ChevronRight,
  ClipboardList, LayoutDashboard, LogOut, Menu, PackagePlus, Plus, ReceiptText, Search,
  ShoppingCart, Store, Truck, UserCircle, Users, X
} from 'lucide-react'
import './styles.css'

const API = 'http://localhost:5000/api'

const apiFetch = (path, options = {}) => {
  const token = localStorage.getItem('grocery_token')
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API}${path}`, { ...options, headers }).then((response) => {
    if (response.status === 401) {
      localStorage.removeItem('grocery_token')
      localStorage.removeItem('grocery_user')
      window.dispatchEvent(new Event('auth-expired'))
    }
    return response
  })
}

const apiJson = (path) => apiFetch(path).then(async (response) => {
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to load data')
  return data
})

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Inventory', icon: Boxes },
  { label: 'Purchases', icon: ClipboardList },
  { label: 'Suppliers', icon: Truck },
  { label: 'Billing', icon: ReceiptText },
  { label: 'Sales', icon: ShoppingCart },
  { label: 'Reports', icon: BarChart3 },
]

const familyUnits = {
  Vegetables: ['kg', 'gram', 'piece', 'crate', 'bundle'],
  Fruits: ['kg', 'gram', 'piece', 'dozen', 'crate'],
  Dairy: ['litre', 'millilitre', 'piece', 'packet', 'box'],
  Bakery: ['piece', 'packet', 'box', 'dozen'],
  Grocery: ['kg', 'gram', 'packet', 'pouch', 'box', 'piece'],
  Household: ['piece', 'pack', 'bottle', 'litre', 'box'],
  'Personal Care': ['piece', 'pack', 'bottle', 'millilitre'],
  Drinks: ['litre', 'millilitre', 'bottle', 'can', 'pack'],
}

const money = (value) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value)
const currentDateLabel = () => new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())
const dateLabel = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
const sortByDateAdded = (records) => [...records].sort((first, second) => {
  const firstTime = Date.parse(first.date_added || first.date || '') || 0
  const secondTime = Date.parse(second.date_added || second.date || '') || 0
  return secondTime - firstTime || Number(second.id) - Number(first.id)
})
const supplierProductDetails = (supplier, products) => {
  const quantities = supplier.supply_quantities || {}
  const prices = supplier.supply_prices || {}
  const productEntries = Object.entries(quantities)
  if (!productEntries.length) return <span className="muted-cell">No products assigned</span>
  return <div className="supplier-products">{productEntries.map(([productId, quantity]) => { const product = products.find((item) => item.id === Number(productId)); return <small key={productId}><strong>{product?.name || `Product ${productId}`}</strong> · Remaining supply qty {quantity} · Supplier price {prices[productId] === undefined ? 'not set' : money(prices[productId])}</small> })}</div>
}
const purchaseProductDetails = (purchase) => purchase.products?.length ? <div className="supplier-products">{purchase.products.map((product) => <small key={product.product_id}>{product.product} · Qty {product.quantity} · {money(product.supplier_unit_price)} each</small>)}</div> : purchase.product || 'Multiple products'
const purchaseLineDetails = (purchase, field, formatter = (value) => value) => purchase.products?.length ? <div className="supplier-products">{purchase.products.map((product) => <small key={product.product_id}>{product.product}: {formatter(product[field])}</small>)}</div> : purchase[field] ?? '-'
const saleProductDetails = (sale) => sale.products?.length ? <div className="supplier-products">{sale.products.map((product) => <small key={product.product_id}>{product.product} · Qty {product.quantity} · {money(product.unit_price)} each</small>)}</div> : sale.product
const saleRows = (sales) => sortByDateAdded(sales)
const todayTotal = (records) => records.filter((record) => record.date === new Date().toISOString().slice(0, 10)).reduce((total, record) => total + Number(record.total || 0), 0)
const downloadReport = (products) => { const rows = [['SKU', 'Product', 'Category', 'Quantity', 'Price'], ...products.map((product) => [product.sku, product.name, product.category, product.quantity, product.price])]; const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'inventory-report.csv'; link.click(); URL.revokeObjectURL(link.href) }
const downloadSalesReport = (sales) => { const rows = [['Invoice', 'Products', 'Quantity', 'Billing unit price', 'Sale Total', 'Date'], ...saleRows(sales).map((sale) => [sale.id, sale.products?.map((product) => product.product).join('; ') || sale.product, sale.items || sale.quantity, sale.products?.map((product) => `${product.product}: ${product.unit_price}`).join('; ') || sale.unit_price, sale.total, sale.date])]; const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'sales-invoices.csv'; link.click(); URL.revokeObjectURL(link.href) }
const downloadPurchasesReport = (purchases) => { const rows = [['Purchase ID', 'Supplier', 'Product', 'Quantity', 'Supplier unit price', 'Purchase total', 'Date'], ...sortByDateAdded(purchases).flatMap((purchase) => purchase.products?.length ? purchase.products.map((product) => [purchase.id, purchase.supplier, product.product, product.quantity, product.supplier_unit_price, purchase.total, purchase.date]) : [[purchase.id, purchase.supplier, purchase.product, purchase.items, purchase.supplier_unit_price, purchase.total, purchase.date]])]; const blob = new Blob([rows.map((row) => row.map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'purchase-history.csv'; link.click(); URL.revokeObjectURL(link.href) }

function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setMessage('')
    try {
      const response = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) })
      const result = await response.json()
      if (!response.ok) { setMessage(result.error); return }
      onLogin(result)
    } catch { setMessage('Unable to connect to the inventory API') } finally { setSubmitting(false) }
  }
  return <div className="auth-shell"><div className="auth-card"><div className="brand"><span className="brand-mark">g</span><span>grocerly<span className="brand-dot">.</span></span></div><p className="eyebrow">Inventory workspace</p><h1>Welcome back</h1><p className="auth-copy">Sign in to manage your store.</p><form onSubmit={submit}><label>Username<input required value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" /></label><label>Password<input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" /></label><button className="primary-button auth-submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in'}</button>{message && <p className="auth-error">{message}</p>}</form><p className="demo-hint"><strong>Development-only accounts</strong><br />Staff: <strong>hari / 12345</strong> or <strong>abhi / 12345</strong><br />Admin: <strong>nishi / admin</strong></p></div></div>
}

function UserPage({ user, onLogout }) {
  return <section className="panel account-panel"><div className="account-hero"><span className="account-avatar"><UserCircle size={42} /></span><div><p className="eyebrow">User account</p><h2>{user.name}</h2><p>{user.role === 'admin' ? 'Administrator' : 'Staff member'}</p></div></div><div className="account-details"><div><span>Username</span><strong>{user.username}</strong></div><div><span>Access level</span><strong>{user.role === 'admin' ? 'Full administration' : 'Daily operations'}</strong></div></div><button className="outline-button" onClick={onLogout}><X size={16} /> Sign out</button></section>
}

function UsersPage({ users, currentUser, onChanged, onEdit }) {
  const removeUser = async (user) => {
    if (user.id === currentUser.id || !window.confirm(`Delete ${user.name}?`)) return
    const response = await apiFetch(`/users/${user.id}`, { method: 'DELETE' })
    const result = await response.json()
    if (!response.ok) { window.alert(result.error); return }
    onChanged()
  }
  return <section className="panel section-panel"><div className="panel-heading"><div><p className="eyebrow">Administration</p><h2>User access</h2></div><span className="alert-count">{users.length} users</span></div><div className="table-wrap"><table><thead><tr><th>User</th><th>Username</th><th>Role</th><th /></tr></thead><tbody>{sortByDateAdded(users).map((managedUser) => <tr key={managedUser.id}><td><div className="product-cell"><span className="product-icon cat-produce">{managedUser.name.charAt(0)}</span><span><strong>{managedUser.name}</strong>{managedUser.id === currentUser.id && <small>Current account</small>}</span></div></td><td>{managedUser.username}</td><td><span className={managedUser.role === 'admin' ? 'status' : 'status pending'}>{managedUser.role === 'admin' ? 'Administrator' : 'Staff'}</span></td><td><div className="user-actions"><button className="text-button" onClick={() => onEdit(managedUser)}>Edit</button><button className="text-button danger-button" disabled={managedUser.id === currentUser.id} onClick={() => removeUser(managedUser)}>Delete</button></div></td></tr>)}</tbody></table></div></section>
}

function SalesPage({ sales }) {
  return <section className="panel section-panel"><div className="panel-heading"><div><p className="eyebrow">Billing history</p><h2>Sales invoices</h2><p className="daily-total">Total sales today: <strong>{money(todayTotal(sales))}</strong></p></div><span className="alert-count">{sales.length} invoices</span></div><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Products</th><th>Quantity</th><th>Billing unit price</th><th>Sale Total</th><th>Date</th></tr></thead><tbody>{saleRows(sales).length === 0 ? <tr><td colSpan="6" className="empty-table">No invoices yet</td></tr> : saleRows(sales).map((sale) => <tr key={sale.id}><td><strong>{sale.id}</strong></td><td>{saleProductDetails(sale)}</td><td>{sale.items || sale.quantity}</td><td>{sale.products?.length ? <div className="supplier-products">{sale.products.map((product) => <small key={product.product_id}>{product.product}: {money(product.unit_price)}</small>)}</div> : money(sale.unit_price)}</td><td><strong className="total-value">{money(sale.total)}</strong></td><td>{dateLabel(sale.date)}</td></tr>)}</tbody></table></div></section>
}

function UserModal({ user, close, onSaved }) {
  const isEditing = Boolean(user)
  const [form, setForm] = useState({ name: user?.name || '', username: user?.username || '', password: '', role: user?.role || 'staff' })
  const [message, setMessage] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    const response = await apiFetch(isEditing ? `/users/${user.id}` : '/users', { method: isEditing ? 'PATCH' : 'POST', body: JSON.stringify(form) })
    const result = await response.json()
    if (!response.ok) { setMessage(result.error); return }
    onSaved()
  }
  return <FormModal title={isEditing ? 'Edit user' : 'Add a user'} close={close}><form onSubmit={submit}><label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Full name" /></label><label>Username<input required value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} placeholder="Username" /></label><label>{isEditing ? 'New password (optional)' : 'Password'}<input required={!isEditing} type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} /></label><label>Role<select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="staff">Staff</option><option value="admin">Administrator</option></select></label>{message && <p className="auth-error">{message}</p>}<ModalActions close={close} label={isEditing ? 'Save changes' : 'Create user'} /></form></FormModal>
}

function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('grocery_user')) || null } catch { return null }
  })
  const [activePage, setActivePage] = useState(() => user?.role === 'staff' ? 'Inventory' : 'Overview')
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [sales, setSales] = useState([])
  const [managedUsers, setManagedUsers] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const results = await Promise.allSettled([
      apiJson('/summary'),
      apiJson('/products'),
      apiJson('/suppliers'),
      apiJson('/purchases'),
      user?.role === 'admin' ? apiJson('/sales') : Promise.resolve([]),
      user?.role === 'admin' ? apiJson('/users') : Promise.resolve([]),
    ])
    if (results[0].status === 'fulfilled') setSummary(results[0].value)
    if (results[1].status === 'fulfilled') setProducts(results[1].value)
    if (results[2].status === 'fulfilled') setSuppliers(results[2].value)
    if (results[3].status === 'fulfilled') setPurchases(results[3].value)
    if (results[4].status === 'fulfilled') setSales(results[4].value)
    if (results[5].status === 'fulfilled') setManagedUsers(results[5].value)
    setLoading(false)
  }

  useEffect(() => { if (user) loadData().catch(() => setLoading(false)) }, [user])

  const handleLogin = ({ token, user: loggedInUser }) => {
    localStorage.setItem('grocery_token', token)
    localStorage.setItem('grocery_user', JSON.stringify(loggedInUser))
    setUser(loggedInUser)
  }
  const logout = () => {
    localStorage.removeItem('grocery_token')
    localStorage.removeItem('grocery_user')
    setUser(null)
  }

  useEffect(() => {
    window.addEventListener('auth-expired', logout)
    return () => window.removeEventListener('auth-expired', logout)
  }, [])

  const isAdmin = user?.role === 'admin'
  useEffect(() => {
    if (!isAdmin && !['Inventory', 'Billing'].includes(activePage)) setActivePage('Inventory')
  }, [activePage, isAdmin])

  if (!user) return <LoginPage onLogin={handleLogin} />
  const sortedProducts = sortByDateAdded(products)
  const sortedPurchases = sortByDateAdded(purchases)

  const filteredProducts = sortedProducts.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  )
  const lowStock = products.filter((product) => product.quantity <= product.reorder_level)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">g</span><span>grocerly<span className="brand-dot">.</span></span></div>
        <div className="workspace-switcher"><span className="workspace-avatar">G</span><span><strong>{isAdmin ? 'Admin Mode' : 'Staff Mode'}</strong></span><ChevronRight size={15} /></div>
        <p className="nav-label">Workspace</p>
        <nav>{navItems.filter(({ label }) => isAdmin || ['Inventory', 'Billing'].includes(label)).map(({ label, icon: Icon }) => <button className={activePage === label ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(label)} key={label}><Icon size={18} /><span>{label}</span>{label === 'Inventory' && lowStock.length > 0 && <em>{lowStock.length}</em>}</button>)}{isAdmin && <button className={activePage === 'Users' ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage('Users')}><Users size={18} /><span>Users</span></button>}</nav>
        <div className="sidebar-bottom"><button className="nav-item" onClick={logout}><LogOut size={18} /><span>Sign out</span></button></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><button className="mobile-menu"><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage}</strong></div><div className="topbar-actions"><button className="icon-button"><Bell size={19} /><i /></button><button className="user-menu" onClick={() => setActivePage('Account')}><span className="user-avatar">{user.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{user.name}</strong><small>{isAdmin ? 'Administrator' : 'Staff member'}</small></span><ChevronRight size={15} /></button></div></header>
        <div className="page-content">
          {activePage !== 'Account' && <section className="page-heading"><div><p className="eyebrow">{currentDateLabel()}</p><h1>{activePage === 'Overview' ? `Good morning, ${user.name.split(' ')[0]}` : activePage}</h1><p className="heading-copy">Here’s what’s happening with your store today.</p></div>{isAdmin && activePage === 'Users' ? <button className="primary-button" onClick={() => setShowModal('user')}><Plus size={18} /> Add user</button> : isAdmin && (activePage === 'Overview' || activePage === 'Inventory') ? <button className="primary-button" onClick={() => setShowModal('product')}><Plus size={18} /> Add product</button> : activePage === 'Purchases' ? <button className="primary-button" onClick={() => setShowModal('purchase')}><Plus size={18} /> Record purchase</button> : isAdmin && activePage === 'Suppliers' ? <button className="primary-button" onClick={() => setShowModal('supplier')}><Plus size={18} /> Add supplier</button> : activePage === 'Reports' ? <div className="page-actions"><button className="outline-button" onClick={() => downloadPurchasesReport(purchases)}><ArrowDownToLine size={17} /> Export purchases</button><button className="outline-button" onClick={() => downloadSalesReport(sales)}><ArrowDownToLine size={17} /> Export sales</button></div> : null}</section>}
          {activePage === 'Account' ? <UserPage user={user} onLogout={logout} /> : activePage === 'Users' ? <UsersPage users={managedUsers} currentUser={user} onChanged={loadData} onEdit={(selectedUser) => setShowModal({ type: 'user', user: selectedUser })} /> : activePage === 'Sales' ? <SalesPage sales={sales} /> : activePage === 'Overview' ? <Overview summary={summary} products={sortedProducts} suppliers={suppliers} purchases={sortedPurchases} lowStock={lowStock} setActivePage={setActivePage} isAdmin={isAdmin} /> : activePage === 'Billing' ? <Billing products={products} onSold={loadData} /> : activePage === 'Reports' ? <Reports products={products} summary={summary} /> : <SectionPage page={activePage} products={filteredProducts} suppliers={suppliers} purchases={purchases} search={search} setSearch={setSearch} setShowModal={setShowModal} canManage={isAdmin} />}
        </div>
      </main>
      {showModal === 'product' && <ProductModal suppliers={suppliers} close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {showModal === 'purchase' && <PurchaseModal products={products} suppliers={suppliers} close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {showModal === 'supplier' && <SupplierModal products={products} close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {(showModal === 'user' || showModal?.type === 'user') && <UserModal user={showModal?.user} close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {loading && <div className="loading-bar" />}
    </div>
  )
}

function Overview({ summary, products, suppliers, purchases, lowStock, setActivePage, isAdmin }) {
  if (!summary) return <div className="empty-state">Connecting to your inventory workspace...</div>
  return <>
    <section className="metrics-grid">
      <Metric label="Inventory value" value={money(summary.inventory_value)} change={`${summary.inventory_units} units`} icon={Boxes} tone="green" />
      {isAdmin && <Metric label="Sales today" value={money(summary.sales_today)} change={`${summary.orders_today} invoices`} icon={ArrowUpRight} tone="yellow" />}
      {isAdmin && <Metric label="Purchases today" value={money(summary.purchases_today)} change={`${summary.purchase_orders_today} orders`} icon={ShoppingCart} tone="blue" />}
      <Metric label="Low stock items" value={summary.low_stock} change="Needs attention" icon={AlertTriangle} tone="red" warning />
    </section>
    <section className="dashboard-grid">
      <div className="panel inventory-panel"><div className="panel-heading"><div><p className="eyebrow">Product overview</p><h2>Inventory at a glance</h2></div><button className="text-button" onClick={() => setActivePage('Inventory')}>View inventory <ChevronRight size={15} /></button></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Stock level</th><th>Price</th><th /></tr></thead><tbody>{products.slice(0, 5).map((product) => <tr key={product.id}><td><div className="product-cell"><span className={`product-icon cat-${product.category.toLowerCase()}`}>{product.name.charAt(0)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td><td><span className="category-pill">{product.category}</span></td><td><div className="stock-cell"><span className={product.quantity <= product.reorder_level ? 'stock-low' : 'stock-good'}>{product.quantity} {product.unit}s</span><div className="stock-track"><i style={{ width: `${Math.min(product.quantity / (product.reorder_level * 3) * 100, 100)}%` }} /></div></div></td><td>{money(product.price)}</td><td><button className="row-menu">•••</button></td></tr>)}</tbody></table></div></div>
      <div className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">Inventory watch</p><h2>Stock alerts</h2></div><span className="alert-count">{lowStock.length} alerts</span></div><div className="alert-list">{lowStock.map((product) => <div className="alert-item" key={product.id}><span className="alert-symbol"><AlertTriangle size={17} /></span><div><strong>{product.name}</strong><small>Only {product.quantity} {product.unit}s left</small></div><button className="icon-button small"><ArrowUpRight size={16} /></button></div>)}</div><button className="outline-button" onClick={() => setActivePage('Inventory')}>Review stock levels <ChevronRight size={16} /></button></div>
    </section>
    <section className="lower-grid"><div className="panel purchases-panel"><div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent purchases</h2></div><button className="text-button" onClick={() => setActivePage('Purchases')}>See all <ChevronRight size={15} /></button></div><div className="purchase-list">{purchases.map((purchase) => <div className="purchase-row" key={purchase.id}><span className="purchase-icon"><Truck size={17} /></span><div><strong>{purchase.id} <span className={purchase.status === 'Pending' ? 'status pending' : 'status'}>{purchase.status}</span></strong><small>{purchase.product || 'Multiple products'} · {purchase.supplier} · {purchase.items} items</small></div><div className="purchase-total"><strong>{money(purchase.total)}</strong><small>{dateLabel(purchase.date)}</small></div></div>)}</div></div><div className="panel quick-panel"><p className="eyebrow">Quick actions</p><h2>Keep things moving</h2><button className="quick-action" onClick={() => setActivePage('Billing')}><span><ReceiptText size={18} /></span> Create a new bill <ArrowUpRight size={16} /></button><button className="quick-action" onClick={() => setActivePage('Purchases')}><span><PackagePlus size={18} /></span> Record a purchase <ArrowUpRight size={16} /></button>{isAdmin && <button className="quick-action" onClick={() => setActivePage('Reports')}><span><ArrowDownToLine size={18} /></span> Export a report <ArrowUpRight size={16} /></button>}</div></section>
  </>
}

function Metric({ label, value, change, icon: Icon, tone, warning }) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><div className="metric-info"><span>{label}</span><strong>{value}</strong><small className={warning ? 'warning-text' : ''}><ArrowUpRight size={13} /> {change}</small></div><div className="sparkline"><span /><span /><span /><span /><span /><span /></div></div> }

function SectionPage({ page, products, suppliers, purchases, search, setSearch, setShowModal, canManage }) {
  const isInventory = page === 'Inventory'
  const isSuppliers = page === 'Suppliers'
  const rows = sortByDateAdded(isInventory ? products : page === 'Suppliers' ? suppliers : purchases)
  return <section className="panel section-panel"><div className="panel-heading"><div><p className="eyebrow">Management</p><h2>{page} directory</h2>{page === 'Purchases' && <p className="daily-total">Total purchases today: <strong>{money(todayTotal(purchases))}</strong></p>}</div><div className="section-tools"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${page.toLowerCase()}...`} /></div></div></div>{isInventory ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Supplier</th><th>Quantity</th><th>Price</th><th>Status</th></tr></thead><tbody>{rows.map((product) => <tr key={product.id}><td><div className="product-cell"><span className="product-icon cat-produce">{product.name.charAt(0)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td><td>{product.category}</td><td>{product.supplier}</td><td>{product.quantity} {product.unit}s</td><td>{money(product.price)}</td><td><span className={product.quantity <= product.reorder_level ? 'status pending' : 'status'}>{product.quantity <= product.reorder_level ? 'Low stock' : 'In stock'}</span></td></tr>)}</tbody></table></div> : <div className="table-wrap"><table><thead><tr>{isSuppliers ? <><th>Supplier</th><th>Contact</th><th>Products</th><th>Product details</th><th>Status</th></> : <><th>Purchase ID</th><th>Product details</th><th>Supplier</th><th>Supplier Qty Remaining</th><th>Purchase Total</th><th>Date</th><th>Status</th></>}</tr></thead><tbody>{rows.map((row) => isSuppliers ? <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.contact}</td><td>{row.products}</td><td>{supplierProductDetails(row, products)}</td><td><span className="status">{row.status}</span></td></tr> : <tr key={row.id}><td><strong>{row.id}</strong></td><td>{purchaseProductDetails(row)}</td><td>{row.supplier}</td><td>{purchaseLineDetails(row, 'supplier_quantity')}</td><td><strong className="total-value">{money(row.total)}</strong></td><td>{dateLabel(row.date)}</td><td><span className={row.status === 'Pending' ? 'status pending' : 'status'}>{row.status}</span></td></tr>)}</tbody></table></div>}</section>
}

function Billing({ products, onSold }) {
  const [quantities, setQuantities] = useState({})
  const [message, setMessage] = useState('')
  const selectedProducts = products.filter((product) => quantities[product.id])
  const total = selectedProducts.reduce((sum, product) => sum + product.price * Number(quantities[product.id]), 0)
  const submit = async (event) => { event.preventDefault(); const response = await apiFetch('/sales', { method: 'POST', body: JSON.stringify({ items: selectedProducts.map((product) => ({ product_id: product.id, quantity: Number(quantities[product.id]) })) }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return }; setMessage(`Invoice ${result.id} created for ${money(result.total)}`); setQuantities({}); onSold() }
  return <section className="panel simple-workflow"><p className="eyebrow">Billing</p><h2>Create a customer bill</h2><p>Select one or more items to sell. Stock is updated automatically.</p><form onSubmit={submit}><fieldset className="product-picker"><legend>Products to bill ({selectedProducts.length} selected)</legend>{products.length === 0 && <p className="empty-picker">No products available.</p>}{products.map((product) => <div className="product-picker-row" key={product.id}><label><input type="checkbox" checked={Boolean(quantities[product.id])} onChange={() => setQuantities({ ...quantities, [product.id]: quantities[product.id] ? '' : 1 })} />{product.name} <small>{product.quantity} in stock · {money(product.price)} each</small></label>{quantities[product.id] && <input aria-label={`${product.name} billing quantity`} required type="number" min="1" max={product.quantity} value={quantities[product.id]} onChange={(event) => setQuantities({ ...quantities, [product.id]: event.target.value })} />}</div>)}</fieldset><div className="workflow-total">Invoice total <strong>{money(total)}</strong></div><button className="primary-button" type="submit" disabled={!selectedProducts.length}><ReceiptText size={17} /> Create bill</button>{message && <p className="workflow-message">{message}</p>}</form></section>
}

function Reports({ products, summary }) {
  const categories = [...new Set(products.map((product) => product.category))]
  const profit = summary?.profit_today || 0
  return <section className="report-grid"><div className="panel report-card"><p className="eyebrow">Financial report</p><h2>Profit and loss today</h2><div className="financial-widgets"><div className="financial-widget sales"><span>Sales</span><strong>{money(summary?.sales_today || 0)}</strong><small>{summary?.orders_today || 0} invoices</small></div><div className="financial-widget purchases"><span>Purchases</span><strong>{money(summary?.purchases_today || 0)}</strong><small>{summary?.purchase_orders_today || 0} orders</small></div><div className={`financial-widget ${profit >= 0 ? 'profit' : 'loss'}`}><span>{profit >= 0 ? 'Profit' : 'Loss'}</span><strong>{money(Math.abs(profit))}</strong><small>{profit >= 0 ? 'Positive result' : 'Negative result'}</small></div></div><div className="report-line"><span>Net result</span><strong className={profit >= 0 ? 'profit-text' : 'warning-text'}>{profit >= 0 ? 'Profit' : 'Loss'}</strong></div></div><div className="panel report-card"><p className="eyebrow">Stock report</p><h2>Inventory health</h2><div className="report-number">{summary?.products || 0}<small>products tracked</small></div><div className="report-line"><span>Healthy stock</span><strong>{products.filter((product) => product.quantity > product.reorder_level).length}</strong></div><div className="report-line"><span>Needs reorder</span><strong className="warning-text">{products.filter((product) => product.quantity <= product.reorder_level).length}</strong></div></div><div className="panel report-card"><p className="eyebrow">Category report</p><h2>Products by category</h2>{categories.length === 0 && <p className="empty-picker">No products available.</p>}{categories.map((category) => <div className="category-report" key={category}><span>{category}</span><div><i style={{ width: `${products.filter((product) => product.category === category).length / products.length * 100}%` }} /></div><strong>{products.filter((product) => product.category === category).length}</strong></div>)}</div></section>
}

function PurchaseModal({ products, suppliers, close, onSaved }) {
  const [form, setForm] = useState({ supplier: '' })
  const [quantities, setQuantities] = useState({})
  const availableProducts = products.filter((product) => product.supplier === form.supplier)
  const selectedSupplier = suppliers.find((supplier) => supplier.name === form.supplier)
  const [message, setMessage] = useState('')
  const selectedProducts = availableProducts.filter((product) => quantities[product.id])
  const submit = async (event) => { event.preventDefault(); const items = selectedProducts.map((product) => ({ product_id: product.id, quantity: Number(quantities[product.id]) })); const response = await apiFetch('/purchases', { method: 'POST', body: JSON.stringify({ supplier: form.supplier, items }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error || 'Unable to save purchase'); return }; onSaved() }
  const selectSupplier = (supplier) => { setForm({ supplier }); setQuantities({}); setMessage('') }
  return <FormModal title="Record a purchase" close={close}><form onSubmit={submit}><label>Supplier price<select required value={form.supplier} onChange={(event) => selectSupplier(event.target.value)}><option value="">Select a supplier</option>{suppliers.map((supplier) => <option value={supplier.name} key={supplier.id}>{supplier.name}</option>)}</select></label><fieldset className="product-picker"><legend>Products to purchase ({selectedProducts.length} selected)</legend>{!form.supplier && <p className="empty-picker">Select a supplier first.</p>}{form.supplier && availableProducts.length === 0 && <p className="empty-picker">No products are assigned to this supplier.</p>}{availableProducts.map((product) => <div className="product-picker-row" key={product.id}><label><input type="checkbox" checked={Boolean(quantities[product.id])} onChange={() => setQuantities({ ...quantities, [product.id]: quantities[product.id] ? '' : 1 })} />{product.name} <small>{product.unit} · {money(product.price)} inventory price · supplier {money(selectedSupplier?.supply_prices?.[String(product.id)] || 0)}</small><small className="supplier-availability">Supplier available quantity: {selectedSupplier?.supply_quantities?.[String(product.id)] || 0}</small></label>{quantities[product.id] && <input aria-label={`${product.name} purchase quantity`} required type="number" min="1" max={selectedSupplier?.supply_quantities?.[String(product.id)] || 1} value={quantities[product.id]} onChange={(event) => setQuantities({ ...quantities, [product.id]: event.target.value })} />}</div>)}</fieldset>{message && <p className="auth-error">{message}</p>}<ModalActions close={close} label="Save purchase" /></form></FormModal>
}

function SupplierModal({ products, close, onSaved }) {
  const [form, setForm] = useState({ name: '', contact: '' })
  const [productIds, setProductIds] = useState([])
  const [productQuantities, setProductQuantities] = useState({})
  const [productPrices, setProductPrices] = useState({})
  const [message, setMessage] = useState('')
  const toggleProduct = (productId) => setProductIds((selected) => { if (selected.includes(productId)) { setProductQuantities((quantities) => { const next = { ...quantities }; delete next[productId]; return next }); setProductPrices((prices) => { const next = { ...prices }; delete next[productId]; return next }); return selected.filter((id) => id !== productId) }; setProductQuantities((quantities) => ({ ...quantities, [productId]: 1 })); setProductPrices((prices) => ({ ...prices, [productId]: '' })); return [...selected, productId] })
  const submit = async (event) => { event.preventDefault(); const response = await apiFetch('/suppliers', { method: 'POST', body: JSON.stringify({ ...form, product_ids: productIds, supply_quantities: productQuantities, supply_prices: productPrices }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error || 'Unable to add supplier'); return }; onSaved() }
  return <FormModal title="Add a supplier" close={close}><form onSubmit={submit}><label>Supplier name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Supplier name" /></label><label>Contact number<input required value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="Phone number" /></label><fieldset className="product-picker"><legend>Products, quantities and supplier prices ({productIds.length} selected)</legend>{products.length === 0 && <p className="empty-picker">Create products first to assign them to this supplier.</p>}{products.map((product) => <div className="product-picker-row" key={product.id}><label><input type="checkbox" checked={productIds.includes(product.id)} onChange={() => toggleProduct(product.id)} />{product.name} <small>{product.unit} · inventory {money(product.price)}</small></label>{productIds.includes(product.id) && <div className="product-supply-fields"><label>Supply quantity<input aria-label={`${product.name} supply quantity`} required type="number" min="1" value={productQuantities[product.id] || 1} onChange={(event) => setProductQuantities({ ...productQuantities, [product.id]: event.target.value })} /></label><label>Supplier unit price<input aria-label={`${product.name} supplier unit price`} required type="number" min="0" step="0.01" placeholder="0.00" value={productPrices[product.id]} onChange={(event) => setProductPrices({ ...productPrices, [product.id]: event.target.value })} /></label></div>}</div>)}</fieldset>{message && <p className="auth-error">{message}</p>}<ModalActions close={close} label="Save supplier" /></form></FormModal>
}

function FormModal({ title, close, children }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal"><div className="modal-header"><div><p className="eyebrow">Workspace</p><h2>{title}</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div><div className="modal-form">{children}</div></div></div> }
function ModalActions({ close, label }) { return <div className="modal-actions"><button type="button" className="outline-button" onClick={close}>Cancel</button><button type="submit" className="primary-button">{label}</button></div> }

function ProductModal({ suppliers, close, onSaved }) {
  const [form, setForm] = useState({ name: '', category: 'Vegetables', unit: 'kg', price: '', quantity: '', supplier: '' })
  const units = familyUnits[form.category] || ['piece']
  const [message, setMessage] = useState('')
  const submit = async (event) => { event.preventDefault(); const response = await apiFetch('/products', { method: 'POST', body: JSON.stringify({ ...form, price: Number(form.price), quantity: Number(form.quantity) }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error || 'Unable to save product'); return }; onSaved() }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal"><div className="modal-header"><div><p className="eyebrow">Inventory</p><h2>Add a product</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div><form onSubmit={submit}><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Basmati rice" /></label><div className="form-grid"><label>Product family<select value={form.category} onChange={(event) => { const category = event.target.value; setForm({ ...form, category, unit: familyUnits[category][0] }) }}><option>Vegetables</option><option>Fruits</option><option>Dairy</option><option>Bakery</option><option>Grocery</option><option>Household</option><option>Personal Care</option><option>Drinks</option></select></label><label>Unit<select required value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}>{units.map((unit) => <option key={unit}>{unit}</option>)}</select></label></div><div className="form-grid"><label>Inventory unit price<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0.00" /></label><label>Opening quantity<input required type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" /></label></div><label>Supplier (optional)<select value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })}><option value="">No supplier</option>{suppliers.map((supplier) => <option value={supplier.name} key={supplier.id}>{supplier.name}</option>)}</select></label>{message && <p className="auth-error">{message}</p>}<div className="modal-actions"><button type="button" className="outline-button" onClick={close}>Cancel</button><button type="submit" className="primary-button">Save product</button></div></form></div></div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
