'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Package, Truck, Plus, Trash2, ArrowLeft, RefreshCw, AlertCircle, Save, Check } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  supplierId?: string;
  quantity: string;
  minStock: string;
  unitType: 'liter' | 'piece' | 'kg' | 'unit';
  costPrice?: string;
}

export default function InventoryPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [activeTab, setActiveTab] = useState<'items' | 'suppliers'>('items');

  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  // New Item Modal / Form
  const [showItemModal, setShowItemModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSupplier, setNewItemSupplier] = useState('');
  const [newItemQty, setNewItemQty] = useState('0');
  const [newItemMinStock, setNewItemMinStock] = useState('5');
  const [newItemUnit, setNewItemUnit] = useState<'liter' | 'piece' | 'kg' | 'unit'>('unit');
  const [newItemCost, setNewItemCost] = useState('0.00');

  // New Supplier Modal / Form
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupName, setNewSupName] = useState('');
  const [newSupContact, setNewSupContact] = useState('');
  const [newSupPhone, setNewSupPhone] = useState('');
  const [newSupEmail, setNewSupEmail] = useState('');

  const unitLabels: Record<string, string> = {
    liter: 'Litros (L)',
    piece: 'Piezas',
    kg: 'Kilogramos (Kg)',
    unit: 'Unidades'
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('reustafy_token');
      const storedApiUrl = localStorage.getItem('reustafy_api_url') || 'http://localhost:3001';
      if (!storedToken) {
        router.push('/');
        return;
      }
      setToken(storedToken);
      setApiUrl(storedApiUrl);
    }
  }, [router]);

  const fetchData = async (activeToken: string) => {
    setLoading(true);
    try {
      // Fetch Suppliers
      const supRes = await fetch(`${apiUrl}/api/suppliers`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (supRes.ok) setSuppliersList(await supRes.json());

      // Fetch Inventory
      const invRes = await fetch(`${apiUrl}/api/inventory`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (invRes.ok) setInventoryList(await invRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchData(token);
  }, [token, apiUrl]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newSupName) return;

    try {
      const res = await fetch(`${apiUrl}/api/suppliers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newSupName,
          contactName: newSupContact,
          phone: newSupPhone,
          email: newSupEmail
        })
      });

      if (!res.ok) throw new Error('Error al crear proveedor');

      setShowSupplierModal(false);
      setNewSupName('');
      setNewSupContact('');
      setNewSupPhone('');
      setNewSupEmail('');
      fetchData(token);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newItemName) return;

    try {
      const res = await fetch(`${apiUrl}/api/inventory`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newItemName,
          supplierId: newItemSupplier || undefined,
          quantity: parseFloat(newItemQty),
          minStock: parseFloat(newItemMinStock),
          unitType: newItemUnit,
          costPrice: parseFloat(newItemCost)
        })
      });

      if (!res.ok) throw new Error('Error al crear producto en almacén');

      setShowItemModal(false);
      setNewItemName('');
      setNewItemQty('0');
      fetchData(token);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!token || !confirm('¿Eliminar este producto del almacén?')) return;
    try {
      await fetch(`${apiUrl}/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData(token);
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!token || !confirm('¿Eliminar este proveedor?')) return;
    try {
      await fetch(`${apiUrl}/api/suppliers/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData(token);
    } catch (err) {
      alert('Error al eliminar proveedor');
    }
  };

  const handleUpdateStock = async (item: InventoryItem, newQty: number) => {
    if (!token) return;
    try {
      await fetch(`${apiUrl}/api/inventory/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ quantity: newQty })
      });
      setInventoryList(prev => prev.map(i => i.id === item.id ? { ...i, quantity: String(newQty) } : i));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-12 transition-colors duration-300">
      
      {/* Header */}
      <header className="border-b border-border bg-header backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="p-2 rounded-xl bg-btn-secondary hover:bg-btn-secondary-hover border border-border text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              <Package className="h-5 w-5 text-accent" /> Control de Almacén e Inventario
            </h1>
            <p className="text-xs text-foreground-muted">Gestiona productos, stock mínimo y proveedores del restaurante.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'items' ? (
            <button
              onClick={() => setShowItemModal(true)}
              className="bg-accent hover:bg-accent-hover text-accent-foreground font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Nuevo Producto
            </button>
          ) : (
            <button
              onClick={() => setShowSupplierModal(true)}
              className="bg-accent hover:bg-accent-hover text-accent-foreground font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition"
            >
              <Plus className="h-4 w-4" /> Nuevo Proveedor
            </button>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        
        {/* Tabs */}
        <div className="flex gap-3 border-b border-border pb-3">
          <button
            onClick={() => setActiveTab('items')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${activeTab === 'items' ? 'bg-accent text-white shadow-sm' : 'bg-btn-secondary border border-border text-foreground-muted hover:text-foreground'}`}
          >
            <Package className="h-4 w-4" /> Productos ({inventoryList.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition ${activeTab === 'suppliers' ? 'bg-accent text-white shadow-sm' : 'bg-btn-secondary border border-border text-foreground-muted hover:text-foreground'}`}
          >
            <Truck className="h-4 w-4" /> Proveedores ({suppliersList.length})
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><RefreshCw className="h-8 w-8 animate-spin text-accent" /></div>
        ) : activeTab === 'items' ? (
          
          /* ITEMS LIST */
          <div className="space-y-4">
            {inventoryList.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
                <Package className="h-10 w-10 mx-auto text-foreground-muted mb-2" />
                <h3 className="font-bold text-sm">No hay productos en el almacén</h3>
                <p className="text-xs text-foreground-muted mt-1">Haz clic en "Nuevo Producto" para registrar inventario.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryList.map(item => {
                  const qty = parseFloat(item.quantity);
                  const min = parseFloat(item.minStock);
                  const isLow = qty <= min;
                  const supplier = suppliersList.find(s => s.id === item.supplierId);

                  return (
                    <div key={item.id} className={`p-4 rounded-2xl border bg-card space-y-3 shadow-xs relative ${isLow ? 'border-amber-500/50 bg-amber-500/5' : 'border-border'}`}>
                      {isLow && (
                        <span className="absolute top-3 right-3 text-[10px] bg-amber-500 text-white font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> STOCK BAJO
                        </span>
                      )}

                      <div>
                        <h4 className="font-bold text-sm text-foreground">{item.name}</h4>
                        <span className="text-[11px] text-foreground-muted block mt-0.5">
                          Proveedor: {supplier ? supplier.name : 'Sin asignar'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center bg-card-subtle p-3 rounded-xl border border-border">
                        <div>
                          <span className="text-[10px] uppercase font-bold text-foreground-muted block">Cantidad Actual</span>
                          <span className="text-base font-black text-foreground">{qty} <span className="text-xs font-semibold text-foreground-muted">{unitLabels[item.unitType] || item.unitType}</span></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleUpdateStock(item, Math.max(0, qty - 1))}
                            className="w-7 h-7 rounded-lg bg-btn-secondary hover:bg-btn-secondary-hover border border-border font-bold text-sm flex items-center justify-center"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleUpdateStock(item, qty + 1)}
                            className="w-7 h-7 rounded-lg bg-btn-secondary hover:bg-btn-secondary-hover border border-border font-bold text-sm flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-foreground-muted pt-1">
                        <span>Stock Mínimo: <strong>{min}</strong></span>
                        <span>Coste: <strong>{parseFloat(item.costPrice || '0').toFixed(2)} €</strong></span>
                        <button onClick={() => handleDeleteItem(item.id)} className="text-danger-text hover:text-danger font-bold text-xs">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        ) : (

          /* SUPPLIERS LIST */
          <div className="space-y-4">
            {suppliersList.length === 0 ? (
              <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card">
                <Truck className="h-10 w-10 mx-auto text-foreground-muted mb-2" />
                <h3 className="font-bold text-sm">No hay proveedores registrados</h3>
                <p className="text-xs text-foreground-muted mt-1">Registra tus proveedores de bebidas, verduras, carnes, etc.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suppliersList.map(sup => (
                  <div key={sup.id} className="p-4 rounded-2xl border border-border bg-card space-y-2 shadow-xs flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-foreground">{sup.name}</h4>
                      {sup.contactName && <p className="text-xs text-foreground-muted">Contacto: {sup.contactName}</p>}
                      {sup.phone && <p className="text-xs text-foreground-muted">Tel: {sup.phone}</p>}
                      {sup.email && <p className="text-xs text-foreground-muted">Email: {sup.email}</p>}
                    </div>
                    <button onClick={() => handleDeleteSupplier(sup.id)} className="text-danger-text hover:text-danger p-1">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

        )}

        {/* MODAL NUEVO PRODUCTO */}
        {showItemModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <form onSubmit={handleCreateItem} className="bg-card border border-border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <Package className="h-5 w-5 text-accent" /> Añadir Producto al Almacén
                </h3>
                <button type="button" onClick={() => setShowItemModal(false)} className="text-foreground-muted">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Aceite de Oliva 5L"
                    value={newItemName}
                    onChange={e => setNewItemName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Unidad de Medida</label>
                    <select
                      value={newItemUnit}
                      onChange={e => setNewItemUnit(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    >
                      <option value="unit">Unidades</option>
                      <option value="liter">Litros (L)</option>
                      <option value="kg">Kilogramos (Kg)</option>
                      <option value="piece">Piezas</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Proveedor</label>
                    <select
                      value={newItemSupplier}
                      onChange={e => setNewItemSupplier(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    >
                      <option value="">Sin proveedor</option>
                      {suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Cantidad Inicial</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemQty}
                      onChange={e => setNewItemQty(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Stock Mínimo</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemMinStock}
                      onChange={e => setNewItemMinStock(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Precio Coste (€)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={newItemCost}
                      onChange={e => setNewItemCost(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-accent-foreground font-bold py-3 rounded-xl text-xs shadow-md transition">
                Guardar Producto en Almacén
              </button>
            </form>
          </div>
        )}

        {/* MODAL NUEVO PROVEEDOR */}
        {showSupplierModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <form onSubmit={handleCreateSupplier} className="bg-card border border-border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <Truck className="h-5 w-5 text-accent" /> Registrar Nuevo Proveedor
                </h3>
                <button type="button" onClick={() => setShowSupplierModal(false)} className="text-foreground-muted">✕</button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">Nombre Comercial / Empresa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Distribuciones Mahou / Frutas Sevilla"
                    value={newSupName}
                    onChange={e => setNewSupName(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="font-bold block mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    placeholder="Ej. Juan Pérez"
                    value={newSupContact}
                    onChange={e => setNewSupContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Teléfono</label>
                    <input
                      type="text"
                      placeholder="+34 600 000 000"
                      value={newSupPhone}
                      onChange={e => setNewSupPhone(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Email</label>
                    <input
                      type="email"
                      placeholder="proveedor@empresa.com"
                      value={newSupEmail}
                      onChange={e => setNewSupEmail(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-background border border-border font-medium outline-none focus:border-accent"
                    />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-accent hover:bg-accent-hover text-accent-foreground font-bold py-3 rounded-xl text-xs shadow-md transition">
                Guardar Proveedor
              </button>
            </form>
          </div>
        )}

      </main>

    </div>
  );
}
