'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Tablet, ShoppingCart, Send, ArrowLeft, RefreshCw, Check, Sun, Moon } from 'lucide-react';

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
  const [darkMode, setDarkMode] = useState(false);
  
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [reservationsList, setReservationsList] = useState<any[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [cart, setCart] = useState<Array<{ itemName: string; quantity: number; price: number }>>([]);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Available Menu items (dynamic from DB with default fallback)
  const [menuItemsList, setMenuItemsList] = useState<Array<{ itemName: string; price: number }>>([
    { itemName: 'Patatas Bravas', price: 6.50 },
    { itemName: 'Solomillo al Whisky', price: 14.50 },
    { itemName: 'Hamburguesa Gourmet', price: 14.00 },
    { itemName: 'Caña Cruzcampo', price: 2.30 },
    { itemName: 'Refresco Cola', price: 2.50 },
    { itemName: 'Tarta de Queso', price: 5.50 }
  ]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('reustafy_token');
      const storedUser = localStorage.getItem('reustafy_user');
      const storedApiUrl = localStorage.getItem('reustafy_api_url') || 'http://localhost:3001';
      const savedTheme = localStorage.getItem('reustafy_theme');

      if (savedTheme === 'dark') {
        setDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setDarkMode(false);
        document.documentElement.classList.remove('dark');
      }

      if (!storedToken || !storedUser) {
        router.push('/');
        return;
      }

      setToken(storedToken);
      setUser(JSON.parse(storedUser));
      setApiUrl(storedApiUrl);
    }
  }, [router]);

  const toggleTheme = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('reustafy_theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('reustafy_theme', 'light');
      }
      return next;
    });
  };

  const fetchTables = async (activeToken: string) => {
    setLoading(true);
    try {
      // Fetch Tables
      const res = await fetch(`${apiUrl}/api/tables`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) throw new Error('Error fetching tables');
      const data = await res.json();
      setTablesList(data);

      // Fetch Reservations to map allergies
      const resRes = await fetch(`${apiUrl}/api/reservations`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (resRes.ok) {
        const resData = await resRes.json();
        setReservationsList(resData);
      }

      // Fetch Dynamic Menu Items
      const menuRes = await fetch(`${apiUrl}/api/menu`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (menuData.items && menuData.items.length > 0) {
          const formattedItems = menuData.items
            .filter((i: any) => i.available)
            .map((i: any) => ({
              itemName: i.itemName,
              price: parseFloat(i.price)
            }));
          setMenuItemsList(formattedItems);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTables(token);

      const eventSource = new EventSource(`${apiUrl}/api/events?token=${token}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (['TABLE_STATUS_UPDATED', 'ORDER_CREATED', 'ORDER_STATUS_UPDATED'].includes(data.type)) {
            fetchTables(token);
          }
        } catch (err) {
          console.error('SSE parse error:', err);
        }
      };

      return () => {
        eventSource.close();
      };
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

  const getTableCardStyle = (status: Table['status']) => {
    switch (status) {
      case 'free':
        return 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-700/60 hover:bg-emerald-100/80 shadow-sm';
      case 'ordered':
        return 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-700/60 hover:bg-amber-100/80 shadow-sm';
      case 'eating':
        return 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-700/60 hover:bg-blue-100/80 shadow-sm';
      case 'bill':
        return 'bg-rose-50 text-rose-900 border-rose-300 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-700/60 hover:bg-rose-100/80 shadow-sm';
      case 'reserved':
        return 'bg-purple-50 text-purple-900 border-purple-300 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-700/60 hover:bg-purple-100/80 shadow-sm';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 pb-8 flex flex-col transition-colors duration-300">
      
      {/* Navbar PWA */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-20 flex justify-between items-center shadow-xs">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white text-xs font-semibold">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <span className="font-bold text-sm tracking-wider flex items-center gap-1 text-slate-900 dark:text-white">
          <Tablet className="h-4 w-4 text-indigo-600 dark:text-indigo-400" /> Camarero PWA
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400 fill-amber-400/20" /> : <Moon className="h-4 w-4 text-indigo-600 fill-indigo-600/20" />}
          </button>
          <span className="text-[10px] bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-500/30 capitalize">
            {user?.name}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg w-full mx-auto space-y-4">
        
        {success && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> ¡Comanda enviada a cocina correctamente!
          </div>
        )}

        {!selectedTable ? (
          
          /* Zone 1: Select Table */
          <div className="space-y-3">
            <div>
              <h2 className="text-md font-bold text-slate-900 dark:text-white uppercase tracking-wider">Selecciona Mesa</h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Selecciona la mesa para abrir comandas.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-indigo-600 dark:text-indigo-400" /></div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                 {tablesList.map(t => {
                   const tableRes = reservationsList.find(r => r.tableId === t.id && r.status !== 'cancelled');
                   const tableAllergies = tableRes?.allergies;
                   
                   return (
                     <button
                       key={t.id}
                       onClick={() => { setSelectedTable(t); setSuccess(false); }}
                       className={`p-3 rounded-xl border flex flex-col justify-between items-center h-20 transition relative ${getTableCardStyle(t.status)}`}
                     >
                       {tableAllergies && (
                         <span className="absolute -top-1.5 -right-1 text-[8px] bg-rose-600 text-white font-extrabold px-1.5 py-0.5 rounded-full animate-pulse border border-white dark:border-slate-900">
                           ⚠️ ALERGIA
                         </span>
                       )}
                       <span className="text-xl font-black tracking-tight">{t.tableNumber}</span>
                       <span className="text-[9px] uppercase font-bold tracking-wider truncate max-w-full">
                         {t.status}
                       </span>
                     </button>
                   );
                 })}
              </div>
            )}
          </div>

        ) : (

          /* Zone 2: Take Order items */
          <div className="space-y-4">
             {/* Table Header */}
             <div className="flex flex-col gap-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 p-4 rounded-2xl shadow-sm">
               <div className="flex justify-between items-center">
                 <div>
                   <span className="text-xl font-black text-slate-900 dark:text-white">Mesa {selectedTable.tableNumber}</span>
                   <span className="text-xs text-slate-500 dark:text-slate-400 block uppercase font-bold mt-0.5">Zona: {selectedTable.zone}</span>
                 </div>
                 <button 
                   onClick={() => setSelectedTable(null)}
                   className="text-xs bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-600 transition"
                 >
                   Cambiar Mesa
                 </button>
               </div>
               
               {/* Display allergies warnings inside order details if reservation exists */}
               {(() => {
                 const tableRes = reservationsList.find(r => r.tableId === selectedTable.id && r.status !== 'cancelled');
                 if (tableRes?.allergies) {
                   return (
                     <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-xl text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-1.5 animate-pulse">
                       <span>⚠️ ATENCIÓN: Comensal con intolerancias / alergias: <strong className="text-rose-950 dark:text-white">{tableRes.allergies}</strong></span>
                     </div>
                   );
                 }
                 return null;
               })()}
             </div>

            {/* Menu options */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Platos y Bebidas</h3>
              <div className="grid grid-cols-2 gap-2">
                {menuItemsList.map(item => (
                  <button
                    key={item.itemName}
                    onClick={() => addToCart(item)}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 text-left hover:border-indigo-500 dark:hover:border-indigo-400 hover:shadow-md transition"
                  >
                    <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">{item.itemName}</span>
                    <span className="text-xs font-extrabold text-indigo-600 dark:text-indigo-400 mt-1 block">{item.price.toFixed(2)} €</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Cart Box */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1">
                <ShoppingCart className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" /> Comanda Activa
              </h3>

              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-sm space-y-3">
                {cart.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center py-6 font-medium">La comanda está vacía.</p>
                ) : (
                  <>
                    <div className="space-y-2.5 max-h-[180px] overflow-y-auto pr-1">
                      {cart.map(item => (
                        <div key={item.itemName} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-700/60 pb-2.5 last:border-b-0 last:pb-0">
                          <div>
                            <span className="font-bold text-slate-900 dark:text-white">{item.itemName}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-semibold mt-0.5">Cant: {item.quantity} x {item.price.toFixed(2)}€</span>
                          </div>
                          <button 
                            onClick={() => removeFromCart(item.itemName)}
                            className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-extrabold"
                          >
                            Quitar
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center text-sm font-black text-slate-900 dark:text-white">
                      <span>Total Comanda</span>
                      <span className="text-indigo-600 dark:text-indigo-400">{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)} €</span>
                    </div>

                    <button
                      onClick={handleSendOrder}
                      disabled={sending}
                      className="w-full mt-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-black py-3 px-4 rounded-xl text-xs shadow-md transition flex justify-center items-center gap-1.5"
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
