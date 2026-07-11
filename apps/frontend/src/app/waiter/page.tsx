'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Tablet, ShoppingCart, Send, ArrowLeft, RefreshCw, Check } from 'lucide-react';

interface Table {
  id: string;
  tableNumber: string;
  zone: 'salon' | 'terrace' | 'bar';
  status: 'free' | 'ordered' | 'eating' | 'bill' | 'reserved';
  capacity: number;
}

export default function WaiterPWA() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState('');
  
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<Array<{ itemName: string; quantity: number; price: number }>>([]);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Available Menu items for mock order taking
  const menuItems = [
    { itemName: 'Patatas Bravas', price: 6.50 },
    { itemName: 'Solomillo al Whisky', price: 14.50 },
    { itemName: 'Hamburguesa Gourmet', price: 14.00 },
    { itemName: 'Caña Cruzcampo', price: 2.30 },
    { itemName: 'Refresco Cola', price: 2.50 },
    { itemName: 'Tarta de Queso', price: 5.50 }
  ];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('reustafy_token');
      const storedUser = localStorage.getItem('reustafy_user');
      const storedApiUrl = localStorage.getItem('reustafy_api_url') || 'http://localhost:3001';

      if (!storedToken || !storedUser) {
        router.push('/');
        return;
      }

      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setApiUrl(storedApiUrl);
    }
  }, [router]);

  const fetchTables = async (activeToken: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/tables`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) throw new Error('Error fetching tables');
      const data = await res.json();
      setTablesList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTables(token);
    }
  }, [token, apiUrl]);

  const addToCart = (item: { itemName: string; price: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.itemName === item.itemName);
      if (existing) {
        return prev.map(i => i.itemName === item.itemName ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemName: string) => {
    setCart(prev => prev.filter(i => i.itemName !== itemName));
  };

  const handleSendOrder = async () => {
    if (!token || !selectedTable || cart.length === 0) return;
    setSending(true);
    setSuccess(false);

    try {
      const res = await fetch(`${apiUrl}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          tableId: selectedTable.id,
          items: cart
        })
      });

      if (!res.ok) throw new Error('Error al enviar la comanda');

      setSuccess(true);
      setCart([]);
      setSelectedTable(null);
      // Refresh table list
      fetchTables(token);
    } catch (err: any) {
      alert(err.message || 'Error al conectar con la API');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-8 flex flex-col">
      
      {/* Navbar PWA */}
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-4 py-3 sticky top-0 z-20 flex justify-between items-center">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-semibold">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <span className="font-bold text-sm tracking-wider flex items-center gap-1">
          <Tablet className="h-4 w-4 text-indigo-400" /> Camarero PWA
        </span>
        <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/30 capitalize">
          {user?.name}
        </span>
      </header>

      <main className="flex-1 p-4 max-w-lg w-full mx-auto space-y-4">
        
        {success && (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <Check className="h-4 w-4" /> ¡Comanda enviada a cocina correctamente!
          </div>
        )}

        {!selectedTable ? (
          
          /* Zone 1: Select Table */
          <div className="space-y-3">
            <div>
              <h2 className="text-md font-bold text-white uppercase tracking-wider">Selecciona Mesa</h2>
              <p className="text-[10px] text-slate-400">Selecciona la mesa para abrir comandas.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-indigo-400" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {tablesList.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTable(t); setSuccess(false); }}
                    className={`p-3 rounded-xl border flex flex-col justify-between items-center h-20 transition ${
                      t.status === 'free' ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300 hover:bg-emerald-500/10' : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-xl font-bold">{t.tableNumber}</span>
                    <span className="text-[9px] uppercase tracking-wider">{t.status}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        ) : (

          /* Zone 2: Take Order items */
          <div className="space-y-4">
            
            {/* Table Header */}
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5">
              <div>
                <span className="text-lg font-bold text-white">Mesa {selectedTable.tableNumber}</span>
                <span className="text-xs text-slate-400 block uppercase font-semibold">Zona: {selectedTable.zone}</span>
              </div>
              <button 
                onClick={() => setSelectedTable(null)}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 px-3 py-1.5 rounded-lg"
              >
                Cambiar Mesa
              </button>
            </div>

            {/* Menu options */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Platos y Bebidas</h3>
              <div className="grid grid-cols-2 gap-2">
                {menuItems.map(item => (
                  <button
                    key={item.itemName}
                    onClick={() => addToCart(item)}
                    className="p-2.5 rounded-lg border border-white/5 bg-slate-900/40 text-left hover:bg-slate-800 transition"
                  >
                    <span className="font-semibold text-xs text-white block truncate">{item.itemName}</span>
                    <span className="text-[10px] text-indigo-400 mt-1 block">{item.price.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Box */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5" /> Comanda Activa
              </h3>

              <div className="p-4 rounded-xl border border-white/5 bg-slate-950/40 space-y-2.5">
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">La comanda está vacía.</p>
                ) : (
                  <>
                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.itemName} className="flex justify-between items-center text-xs border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                          <div>
                            <span className="font-semibold text-white">{item.itemName}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Cant: {item.quantity} x {item.price.toFixed(2)}€</span>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.itemName)}
                            className="text-[10px] text-red-400 hover:text-red-300 font-semibold"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-white/10 flex justify-between items-center text-xs font-bold text-white">
                      <span>Total Comanda</span>
                      <span>{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)} €</span>
                    </div>

                    <button
                      onClick={handleSendOrder}
                      disabled={sending}
                      className="w-full mt-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-900 text-white font-bold py-2 px-4 rounded-lg text-xs transition flex justify-center items-center gap-1.5"
                    >
                      {sending ? 'Enviando...' : 'Enviar Comanda a Cocina'}
                      <Send className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>

        )}

      </main>

    </div>
  );
}
