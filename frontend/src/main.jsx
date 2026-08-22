import React, { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import {
  AlertTriangle, ArrowDownToLine, ArrowUpRight, BarChart3, Bell, Boxes, ChevronRight,
  ClipboardList, LayoutDashboard, Menu, PackagePlus, Plus, ReceiptText, Search, Settings,
  ShoppingCart, Store, Truck, Users, X
} from 'lucide-react'
import './styles.css'

const API = 'http://localhost:5000/api'

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Inventory', icon: Boxes },
  { label: 'Purchases', icon: ClipboardList },
  { label: 'Suppliers', icon: Truck },
  { label: 'Billing', icon: ReceiptText },
  { label: 'Reports', icon: BarChart3 },
]

const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value)
const dateLabel = (value) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
const downloadReport = (products) => { const rows = [['SKU', 'Product', 'Category', 'Quantity', 'Price'], ...products.map((product) => [product.sku, product.name, product.category, product.quantity, product.price])]; const blob = new Blob([rows.map((row) => row.join(',')).join('\n')], { type: 'text/csv' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'inventory-report.csv'; link.click(); URL.revokeObjectURL(link.href) }

function App() {
  const [activePage, setActivePage] = useState('Overview')
  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [purchases, setPurchases] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    const [summaryData, productsData, suppliersData, purchasesData] = await Promise.all([
      fetch(`${API}/summary`).then((response) => response.json()),
      fetch(`${API}/products`).then((response) => response.json()),
      fetch(`${API}/suppliers`).then((response) => response.json()),
      fetch(`${API}/purchases`).then((response) => response.json()),
    ])
    setSummary(summaryData)
    setProducts(productsData)
    setSuppliers(suppliersData)
    setPurchases(purchasesData)
    setLoading(false)
  }

  useEffect(() => { loadData().catch(() => setLoading(false)) }, [])

  const filteredProducts = products.filter((product) =>
    `${product.name} ${product.sku} ${product.category}`.toLowerCase().includes(search.toLowerCase())
  )
  const lowStock = products.filter((product) => product.quantity <= product.reorder_level)

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">g</span><span>grocerly<span className="brand-dot">.</span></span></div>
        <div className="workspace-switcher"><span className="workspace-avatar">G</span><span><strong>Greenfield Market</strong><small>Admin workspace</small></span><ChevronRight size={15} /></div>
        <p className="nav-label">Workspace</p>
        <nav>{navItems.map(({ label, icon: Icon }) => <button className={activePage === label ? 'nav-item active' : 'nav-item'} onClick={() => setActivePage(label)} key={label}><Icon size={18} /><span>{label}</span>{label === 'Inventory' && lowStock.length > 0 && <em>{lowStock.length}</em>}</button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><Users size={18} /><span>Team members</span></button><button className="nav-item"><Settings size={18} /><span>Settings</span></button><div className="help-box"><span className="help-icon">?</span><div><strong>Need a hand?</strong><small>Visit the help center</small></div><ChevronRight size={15} /></div></div>
      </aside>
      <main className="main-content">
        <header className="topbar"><button className="mobile-menu"><Menu size={21} /></button><div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>{activePage}</strong></div><div className="topbar-actions"><button className="icon-button"><Bell size={19} /><i /></button><div className="user-menu"><span className="user-avatar">AC</span><span><strong>Alex Carter</strong><small>Administrator</small></span><ChevronRight size={15} /></div></div></header>
        <div className="page-content">
          <section className="page-heading"><div><p className="eyebrow">Monday, June 24, 2024</p><h1>{activePage === 'Overview' ? 'Good morning, Alex' : activePage}</h1><p className="heading-copy">Here’s what’s happening with your store today.</p></div>{activePage === 'Overview' || activePage === 'Inventory' ? <button className="primary-button" onClick={() => setShowModal('product')}><Plus size={18} /> Add product</button> : activePage === 'Purchases' ? <button className="primary-button" onClick={() => setShowModal('purchase')}><Plus size={18} /> Record purchase</button> : activePage === 'Suppliers' ? <button className="primary-button" onClick={() => setShowModal('supplier')}><Plus size={18} /> Add supplier</button> : activePage === 'Reports' ? <button className="outline-button" onClick={() => downloadReport(products)}><ArrowDownToLine size={17} /> Export report</button> : null}</section>
          {activePage === 'Overview' ? <Overview summary={summary} products={products} suppliers={suppliers} purchases={purchases} lowStock={lowStock} setActivePage={setActivePage} /> : activePage === 'Billing' ? <Billing products={products} onSold={loadData} /> : activePage === 'Reports' ? <Reports products={products} summary={summary} /> : <SectionPage page={activePage} products={filteredProducts} suppliers={suppliers} purchases={purchases} search={search} setSearch={setSearch} setShowModal={setShowModal} />}
        </div>
      </main>
      {showModal === 'product' && <ProductModal close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {showModal === 'purchase' && <PurchaseModal products={products} suppliers={suppliers} close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {showModal === 'supplier' && <SupplierModal close={() => setShowModal(null)} onSaved={() => { setShowModal(null); loadData() }} />}
      {loading && <div className="loading-bar" />}
    </div>
  )
}

function Overview({ summary, products, suppliers, purchases, lowStock, setActivePage }) {
  if (!summary) return <div className="empty-state">Connecting to your inventory workspace...</div>
  return <>
    <section className="metrics-grid">
      <Metric label="Inventory value" value={money(summary.inventory_value)} change="8.2%" icon={Boxes} tone="green" />
      <Metric label="Sales today" value={money(summary.sales_today)} change={`${summary.sales_change}%`} icon={ArrowUpRight} tone="yellow" />
      <Metric label="Orders today" value={summary.orders_today} change="5.4%" icon={ShoppingCart} tone="blue" />
      <Metric label="Low stock items" value={summary.low_stock} change="Needs attention" icon={AlertTriangle} tone="red" warning />
    </section>
    <section className="dashboard-grid">
      <div className="panel inventory-panel"><div className="panel-heading"><div><p className="eyebrow">Product overview</p><h2>Inventory at a glance</h2></div><button className="text-button" onClick={() => setActivePage('Inventory')}>View inventory <ChevronRight size={15} /></button></div><div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Stock level</th><th>Price</th><th /></tr></thead><tbody>{products.slice(0, 5).map((product) => <tr key={product.id}><td><div className="product-cell"><span className={`product-icon cat-${product.category.toLowerCase()}`}>{product.name.charAt(0)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td><td><span className="category-pill">{product.category}</span></td><td><div className="stock-cell"><span className={product.quantity <= product.reorder_level ? 'stock-low' : 'stock-good'}>{product.quantity} {product.unit}s</span><div className="stock-track"><i style={{ width: `${Math.min(product.quantity / (product.reorder_level * 3) * 100, 100)}%` }} /></div></div></td><td>{money(product.price)}</td><td><button className="row-menu">•••</button></td></tr>)}</tbody></table></div></div>
      <div className="panel alerts-panel"><div className="panel-heading"><div><p className="eyebrow">Inventory watch</p><h2>Stock alerts</h2></div><span className="alert-count">{lowStock.length} alerts</span></div><div className="alert-list">{lowStock.map((product) => <div className="alert-item" key={product.id}><span className="alert-symbol"><AlertTriangle size={17} /></span><div><strong>{product.name}</strong><small>Only {product.quantity} {product.unit}s left</small></div><button className="icon-button small"><ArrowUpRight size={16} /></button></div>)}</div><button className="outline-button" onClick={() => setActivePage('Inventory')}>Review stock levels <ChevronRight size={16} /></button></div>
    </section>
    <section className="lower-grid"><div className="panel purchases-panel"><div className="panel-heading"><div><p className="eyebrow">Latest activity</p><h2>Recent purchases</h2></div><button className="text-button" onClick={() => setActivePage('Purchases')}>See all <ChevronRight size={15} /></button></div><div className="purchase-list">{purchases.map((purchase) => <div className="purchase-row" key={purchase.id}><span className="purchase-icon"><Truck size={17} /></span><div><strong>{purchase.id} <span className={purchase.status === 'Pending' ? 'status pending' : 'status'}>{purchase.status}</span></strong><small>{purchase.product || 'Multiple products'} · {purchase.supplier} · {purchase.items} items</small></div><div className="purchase-total"><strong>{money(purchase.total)}</strong><small>{dateLabel(purchase.date)}</small></div></div>)}</div></div><div className="panel quick-panel"><p className="eyebrow">Quick actions</p><h2>Keep things moving</h2><button className="quick-action" onClick={() => setActivePage('Billing')}><span><ReceiptText size={18} /></span> Create a new bill <ArrowUpRight size={16} /></button><button className="quick-action" onClick={() => setActivePage('Purchases')}><span><PackagePlus size={18} /></span> Record a purchase <ArrowUpRight size={16} /></button><button className="quick-action" onClick={() => setActivePage('Reports')}><span><ArrowDownToLine size={18} /></span> Export a report <ArrowUpRight size={16} /></button></div></section>
  </>
}

function Metric({ label, value, change, icon: Icon, tone, warning }) { return <div className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={19} /></div><div className="metric-info"><span>{label}</span><strong>{value}</strong><small className={warning ? 'warning-text' : ''}><ArrowUpRight size={13} /> {change}</small></div><div className="sparkline"><span /><span /><span /><span /><span /><span /></div></div> }

function SectionPage({ page, products, suppliers, purchases, search, setSearch, setShowModal }) {
  const isInventory = page === 'Inventory'
  const isSuppliers = page === 'Suppliers'
  const rows = isInventory ? products : page === 'Suppliers' ? suppliers : purchases
  return <section className="panel section-panel"><div className="panel-heading"><div><p className="eyebrow">Management</p><h2>{page} directory</h2></div><div className="section-tools"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`Search ${page.toLowerCase()}...`} /></div>{isInventory && <button className="outline-button" onClick={() => setShowModal('product')}><Plus size={16} /> Add product</button>}</div></div>{isInventory ? <div className="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Supplier</th><th>Quantity</th><th>Price</th><th>Status</th></tr></thead><tbody>{rows.map((product) => <tr key={product.id}><td><div className="product-cell"><span className="product-icon cat-produce">{product.name.charAt(0)}</span><span><strong>{product.name}</strong><small>{product.sku}</small></span></div></td><td>{product.category}</td><td>{product.supplier}</td><td>{product.quantity} {product.unit}s</td><td>{money(product.price)}</td><td><span className={product.quantity <= product.reorder_level ? 'status pending' : 'status'}>{product.quantity <= product.reorder_level ? 'Low stock' : 'In stock'}</span></td></tr>)}</tbody></table></div> : <div className="table-wrap"><table><thead><tr>{isSuppliers ? <><th>Supplier</th><th>Contact</th><th>Products</th><th>Status</th></> : <><th>Purchase ID</th><th>Product</th><th>Supplier</th><th>Items</th><th>Total</th><th>Date</th><th>Status</th></>}</tr></thead><tbody>{rows.map((row) => isSuppliers ? <tr key={row.id}><td><strong>{row.name}</strong></td><td>{row.contact}</td><td>{row.products}</td><td><span className="status">{row.status}</span></td></tr> : <tr key={row.id}><td><strong>{row.id}</strong></td><td>{row.product || 'Multiple products'}</td><td>{row.supplier}</td><td>{row.items}</td><td>{money(row.total)}</td><td>{dateLabel(row.date)}</td><td><span className={row.status === 'Pending' ? 'status pending' : 'status'}>{row.status}</span></td></tr>)}</tbody></table></div>}</section>
}

function Billing({ products, onSold }) {
  const [productId, setProductId] = useState(products[0]?.id || '')
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState('')
  const selected = products.find((product) => product.id === Number(productId))
  const submit = async (event) => { event.preventDefault(); const response = await fetch(`${API}/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ product_id: Number(productId), quantity: Number(quantity) }) }); const result = await response.json(); if (!response.ok) { setMessage(result.error); return }; setMessage(`Bill ${result.id} created for ${money(result.total)}`); setQuantity(1); onSold() }
  return <section className="panel simple-workflow"><p className="eyebrow">Billing</p><h2>Create a customer bill</h2><p>Select an item to sell. Stock is updated automatically.</p><form onSubmit={submit}><label>Product<select value={productId} onChange={(event) => setProductId(event.target.value)}>{products.map((product) => <option value={product.id} key={product.id}>{product.name} · {product.quantity} available</option>)}</select></label><label>Quantity<input type="number" min="1" max={selected?.quantity || 1} value={quantity} onChange={(event) => setQuantity(event.target.value)} /></label><div className="workflow-total">Total <strong>{money((selected?.price || 0) * Number(quantity))}</strong></div><button className="primary-button" type="submit"><ReceiptText size={17} /> Create bill</button>{message && <p className="workflow-message">{message}</p>}</form></section>
}

function Reports({ products, summary }) {
  const categories = [...new Set(products.map((product) => product.category))]
  return <section className="report-grid"><div className="panel report-card"><p className="eyebrow">Stock report</p><h2>Inventory health</h2><div className="report-number">{summary?.products || 0}<small>products tracked</small></div><div className="report-line"><span>Healthy stock</span><strong>{products.filter((product) => product.quantity > product.reorder_level).length}</strong></div><div className="report-line"><span>Needs reorder</span><strong className="warning-text">{products.filter((product) => product.quantity <= product.reorder_level).length}</strong></div></div><div className="panel report-card"><p className="eyebrow">Category report</p><h2>Products by category</h2>{categories.map((category) => <div className="category-report" key={category}><span>{category}</span><div><i style={{ width: `${products.filter((product) => product.category === category).length / products.length * 100}%` }} /></div><strong>{products.filter((product) => product.category === category).length}</strong></div>)}</div></section>
}

function PurchaseModal({ products, suppliers, close, onSaved }) {
  const [form, setForm] = useState({ supplier: '', product_id: products[0]?.id || '', quantity: 1 })
  const submit = async (event) => { event.preventDefault(); await fetch(`${API}/purchases`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, product_id: Number(form.product_id), quantity: Number(form.quantity) }) }); onSaved() }
  return <FormModal title="Record a purchase" close={close}><form onSubmit={submit}><label>Supplier<select required value={form.supplier} onChange={(event) => setForm({ ...form, supplier: event.target.value })}><option value="">Select a supplier</option>{suppliers.map((supplier) => <option value={supplier.name} key={supplier.id}>{supplier.name}</option>)}</select></label><label>Product<select value={form.product_id} onChange={(event) => setForm({ ...form, product_id: event.target.value })}>{products.map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label><label>Quantity<input required type="number" min="1" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label><ModalActions close={close} label="Save purchase" /></form></FormModal>
}

function SupplierModal({ close, onSaved }) {
  const [form, setForm] = useState({ name: '', contact: '' })
  const submit = async (event) => { event.preventDefault(); await fetch(`${API}/suppliers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }); onSaved() }
  return <FormModal title="Add a supplier" close={close}><form onSubmit={submit}><label>Supplier name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Supplier name" /></label><label>Contact number<input required value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} placeholder="Phone number" /></label><ModalActions close={close} label="Save supplier" /></form></FormModal>
}

function FormModal({ title, close, children }) { return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal"><div className="modal-header"><div><p className="eyebrow">Workspace</p><h2>{title}</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div><div className="modal-form">{children}</div></div></div> }
function ModalActions({ close, label }) { return <div className="modal-actions"><button type="button" className="outline-button" onClick={close}>Cancel</button><button type="submit" className="primary-button">{label}</button></div> }

function ProductModal({ close, onSaved }) {
  const [form, setForm] = useState({ name: '', category: 'Produce', price: '', quantity: '' })
  const submit = async (event) => { event.preventDefault(); await fetch(`${API}/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: Number(form.price), quantity: Number(form.quantity) }) }); onSaved() }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && close()}><div className="modal"><div className="modal-header"><div><p className="eyebrow">Inventory</p><h2>Add a product</h2></div><button className="icon-button" onClick={close}><X size={18} /></button></div><form onSubmit={submit}><label>Product name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Greek yogurt" /></label><div className="form-grid"><label>Category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value })}><option>Produce</option><option>Dairy</option><option>Pantry</option><option>Beverages</option><option>Snacks</option></select></label><label>Price<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} placeholder="0.00" /></label></div><label>Opening quantity<input required type="number" min="0" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} placeholder="0" /></label><div className="modal-actions"><button type="button" className="outline-button" onClick={close}>Cancel</button><button type="submit" className="primary-button">Save product</button></div></form></div></div>
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)
