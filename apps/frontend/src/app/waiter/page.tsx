'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Utensils, Tablet, ShoppingCart, Send, ArrowLeft, RefreshCw, Check, Sun, Moon, CreditCard, DollarSign, Split, AlertTriangle, Printer, FileText } from 'lucide-react';

interface Table {
  id: string;
  tableNumber: string;
  zone: 'salon' | 'terrace' | 'bar';
  status: 'free' | 'ordered' | 'eating' | 'bill' | 'reserved';
  capacity: number;
}

interface MenuItem {
  id?: string;
  itemName: string;
  price: number;
  course: 'starter' | 'first' | 'second' | 'dessert' | 'coffee' | 'drink';
  isDrink: boolean;
}

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  price: string;
  course: string;
  isPaid: boolean;
  status: string;
}

interface Order {
  id: string;
  tableId: string;
  totalAmount: string;
  status: string;
  isInternal: boolean;
  items?: OrderItem[];
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
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);

  const [cart, setCart] = useState<Array<MenuItem & { quantity: number }>>([]);
  const [isInternal, setIsInternal] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [reclaimSuccess, setReclaimSuccess] = useState<string | null>(null);

  // Payment Modal States
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'full' | 'equal' | 'items'>('full');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mixed'>('cash');
  const [splitCount, setSplitCount] = useState(2);
  const [customCashAmount, setCustomCashAmount] = useState('');
  const [customCardAmount, setCustomCardAmount] = useState('');
  const [selectedItemIdsToPay, setSelectedItemIdsToPay] = useState<string[]>([]);
  const [lastReceipt, setLastReceipt] = useState<any | null>(null);

  // Menu items list with default courses
  const [menuItemsList, setMenuItemsList] = useState<MenuItem[]>([
    { itemName: 'Patatas Bravas', price: 6.50, course: 'starter', isDrink: false },
    { itemName: 'Tabla de Quesos', price: 12.00, course: 'starter', isDrink: false },
    { itemName: 'Solomillo al Whisky', price: 14.50, course: 'first', isDrink: false },
    { itemName: 'Paella Mixta', price: 15.00, course: 'second', isDrink: false },
    { itemName: 'Tarta de Queso', price: 5.50, course: 'dessert', isDrink: false },
    { itemName: 'Café Solo', price: 1.50, course: 'coffee', isDrink: false },
    { itemName: 'Caña Cruzcampo', price: 2.30, course: 'drink', isDrink: true },
    { itemName: 'Refresco Cola', price: 2.50, course: 'drink', isDrink: true }
  ]);

  const courseLabels: Record<string, string> = {
    starter: '🥗 Entrantes',
    first: '🍝 1º Plato',
    second: '🥩 2º Plato',
    dessert: '🍰 Postres',
    coffee: '☕ Cafés',
    drink: '🥤 Bebidas (Sin cocina)'
  };

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

  const fetchTablesAndOrders = async (activeToken: string) => {
    setLoading(true);
    try {
      // Fetch Tables
      const res = await fetch(`${apiUrl}/api/tables`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTablesList(data);
      }

      // Fetch Reservations
      const resRes = await fetch(`${apiUrl}/api/reservations`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (resRes.ok) {
        const resData = await resRes.json();
        setReservationsList(resData);
      }

      // Fetch Menu
      const menuRes = await fetch(`${apiUrl}/api/menu`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        if (menuData.items && menuData.items.length > 0) {
          const formatted = menuData.items
            .filter((i: any) => i.available)
            .map((i: any) => ({
              id: i.id,
              itemName: i.itemName,
              price: parseFloat(i.price),
              course: i.course || (i.isDrink ? 'drink' : 'first'),
              isDrink: Boolean(i.isDrink)
            }));
          setMenuItemsList(formatted);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrder = async (tableId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/orders?tableId=${tableId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const ordersData = await res.json();
        const pendingOrder = ordersData.find((o: any) => o.status !== 'paid');
        setActiveOrder(pendingOrder || null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTablesAndOrders(token);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    if (selectedTable) {
      fetchActiveOrder(selectedTable.id);
    } else {
      setActiveOrder(null);
    }
  }, [selectedTable]);

  const addToCart = (item: MenuItem) => {
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
          isInternal,
          items: cart.map(i => ({
            itemName: i.itemName,
            quantity: i.quantity,
            price: i.price,
            course: i.course,
            isDrink: i.isDrink
          }))
        })
      });

      if (!res.ok) throw new Error('Error al enviar la comanda');

      setSuccess(true);
      setCart([]);
      setIsInternal(false);
      fetchTablesAndOrders(token);
      fetchActiveOrder(selectedTable.id);
    } catch (err: any) {
      alert(err.message || 'Error al conectar con la API');
    } finally {
      setSending(false);
    }
  };

  const handleReclaimItem = async (itemId: string, itemName: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${apiUrl}/api/order-items/${itemId}/reclaim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setReclaimSuccess(`Reclamación enviada a cocina para: "${itemName}"`);
        setTimeout(() => setReclaimSuccess(null), 4000);
      }
    } catch (err) {
      alert('Error al reclamar plato');
    }
  };

  const handleProcessPayment = async () => {
    if (!token || !activeOrder || !selectedTable) return;

    const currentPending = parseFloat((activeOrder as any).pendingAmount || activeOrder.totalAmount);
    let amountToPay = currentPending;
    let itemIds: string[] = [];

    if (paymentMode === 'equal') {
      amountToPay = currentPending / splitCount;
    } else if (paymentMode === 'items') {
      if (selectedItemIdsToPay.length === 0) {
        alert('Selecciona al menos un plato a cobrar');
        return;
      }
      itemIds = selectedItemIdsToPay;
      amountToPay = (activeOrder.items || [])
        .filter(i => itemIds.includes(i.id))
        .reduce((sum, i) => sum + parseFloat(i.price) * i.quantity, 0);
    }

    try {
      const res = await fetch(`${apiUrl}/api/orders/${activeOrder.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: amountToPay,
          paymentMethod,
          itemIds,
          notes: paymentMode === 'equal' ? `Pago dividido (1/${splitCount})` : 'Pago parcial'
        })
      });

      if (!res.ok) throw new Error('Error al procesar el pago');

      const data = await res.json();
      
      // Receipt details for printing
      setLastReceipt({
        tableNumber: selectedTable?.tableNumber,
        amountPaid: amountToPay.toFixed(2),
        paymentMethod,
        date: new Date().toLocaleString('es-ES'),
        isFullyPaid: data.isFullyPaid
      });

      setShowPaymentModal(false);
      setSelectedItemIdsToPay([]);

      if (data.isFullyPaid) {
        setSelectedTable(null);
        setActiveOrder(null);
      } else {
        await fetchActiveOrder(selectedTable.id);
      }
      fetchTablesAndOrders(token);
    } catch (err: any) {
      alert(err.message || 'Error en el pago');
    }
  };

  const getTableCardStyle = (status: Table['status']) => {
    switch (status) {
      case 'free':
        return 'bg-success-light text-success-text border-success-border shadow-sm';
      case 'ordered':
        return 'bg-warning-light text-warning-text border-warning-border shadow-sm';
      case 'eating':
        return 'bg-info-light text-info-text border-info-border shadow-sm';
      case 'bill':
        return 'bg-danger-light text-danger-text border-danger-border shadow-sm';
      case 'reserved':
        return 'bg-premium-light text-premium-text border-premium-border shadow-sm';
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-8 flex flex-col transition-colors duration-300">
      
      {/* Navbar PWA */}
      <header className="border-b border-border bg-header backdrop-blur-md px-4 py-3 sticky top-0 z-20 flex justify-between items-center shadow-xs">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-foreground-secondary hover:text-foreground text-xs font-semibold">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <span className="font-bold text-sm tracking-wider flex items-center gap-1 text-foreground">
          <Tablet className="h-4 w-4 text-accent-text" /> Camarero TPV
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg border border-border bg-btn-secondary text-foreground-secondary hover:bg-btn-secondary-hover transition"
          >
            {darkMode ? <Sun className="h-4 w-4 text-warning fill-warning" /> : <Moon className="h-4 w-4 text-accent fill-accent" />}
          </button>
          <span className="text-[10px] bg-accent-light text-accent-text font-bold px-2 py-0.5 rounded border border-accent-border capitalize">
            {user?.name}
          </span>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-xl w-full mx-auto space-y-4">
        
        {success && (
          <div className="p-3 rounded-lg bg-success-light border border-success-border text-xs text-success-text flex items-center gap-2 font-semibold">
            <Check className="h-4 w-4 text-success-text" /> ¡Comanda enviada a cocina!
          </div>
        )}

        {reclaimSuccess && (
          <div className="p-3 rounded-lg bg-warning-light border border-warning-border text-xs text-warning-text flex items-center gap-2 font-bold animate-bounce">
            <AlertTriangle className="h-4 w-4" /> {reclaimSuccess}
          </div>
        )}

        {lastReceipt && (
          <div className="p-4 rounded-xl bg-card border border-accent shadow-md text-xs space-y-2">
            <div className="flex justify-between items-center font-bold">
              <span className="flex items-center gap-1"><Printer className="h-4 w-4 text-accent" /> Ticket Generado (Mesa {lastReceipt.tableNumber})</span>
              <button onClick={() => setLastReceipt(null)} className="text-foreground-muted hover:text-foreground">✕</button>
            </div>
            <p className="text-foreground-muted">Importe pagado: <strong className="text-foreground">{lastReceipt.amountPaid} €</strong> ({lastReceipt.paymentMethod})</p>
            <p className="text-[10px] text-foreground-muted">{lastReceipt.date} - {lastReceipt.isFullyPaid ? '✅ CUENTA CERRADA' : '⏳ PAGO PARCIAL'}</p>
            <button onClick={() => window.print()} className="w-full mt-1 bg-btn-secondary hover:bg-btn-secondary-hover text-foreground font-bold py-1.5 rounded text-xs border border-border">
              🖨️ Imprimir Ticket Cliente
            </button>
          </div>
        )}

        {!selectedTable ? (
          
          /* Zone 1: Select Table */
          <div className="space-y-3">
            <div>
              <h2 className="text-md font-bold text-foreground uppercase tracking-wider">Plano de Mesas</h2>
              <p className="text-[11px] text-foreground-muted">Selecciona la mesa para tomar comanda o cobrar.</p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><RefreshCw className="h-6 w-6 animate-spin text-accent-text" /></div>
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
                       {tableAllergies && tableAllergies !== 'Ninguna' && (
                         <span className="absolute -top-1.5 -right-1 text-[8px] bg-danger text-accent-foreground font-extrabold px-1.5 py-0.5 rounded-full animate-pulse border border-card">
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

          /* Zone 2: Table Order & Payment */
          <div className="space-y-4">
             {/* Table Header */}
             <div className="flex flex-col gap-2 bg-card border border-border p-4 rounded-2xl shadow-sm">
               <div className="flex justify-between items-center">
                 <div>
                   <span className="text-xl font-black text-foreground">Mesa {selectedTable.tableNumber}</span>
                   <span className="text-xs text-foreground-muted block uppercase font-bold mt-0.5">Zona: {selectedTable.zone}</span>
                 </div>
                 <div className="flex gap-2">
                   {activeOrder && (
                     <button
                       onClick={() => setShowPaymentModal(true)}
                       className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-xl transition flex items-center gap-1 shadow-sm"
                     >
                       <CreditCard className="h-3.5 w-3.5" /> Cobrar ({parseFloat(activeOrder.totalAmount).toFixed(2)}€)
                     </button>
                   )}
                   <button 
                     onClick={() => setSelectedTable(null)}
                     className="text-xs bg-btn-secondary hover:bg-btn-secondary-hover text-foreground-secondary font-bold px-3 py-1.5 rounded-xl border border-border transition"
                   >
                     Cambiar Mesa
                   </button>
                 </div>
               </div>
               
               {/* Display allergies warnings */}
               {(() => {
                 const tableRes = reservationsList.find(r => r.tableId === selectedTable.id && r.status !== 'cancelled');
                 if (tableRes?.allergies && tableRes.allergies !== 'Ninguna') {
                   return (
                     <div className="p-2.5 bg-danger-light border border-danger-border rounded-xl text-danger-text text-xs font-bold flex items-center gap-1.5 animate-pulse">
                       <span>⚠️ ATENCIÓN: Intolerancias / Alergias: <strong className="text-foreground">{tableRes.allergies}</strong></span>
                     </div>
                   );
                 }
                 return null;
               })()}
             </div>

             {/* Existing Order Status (If any) */}
             {activeOrder && activeOrder.items && activeOrder.items.length > 0 && (
               <div className="p-4 rounded-2xl bg-card border border-border space-y-2">
                 <div className="flex justify-between items-center">
                   <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Comanda en Curso</h3>
                   <span className="text-[10px] bg-accent-light text-accent-text font-bold px-2 py-0.5 rounded">
                     Total: {parseFloat(activeOrder.totalAmount).toFixed(2)}€
                   </span>
                 </div>

                 <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                   {activeOrder.items.map(item => (
                     <div key={item.id} className="flex justify-between items-center text-xs py-1 border-b border-border-subtle last:border-b-0">
                       <div>
                         <span className="font-semibold text-foreground">{item.quantity}x {item.itemName}</span>
                         <span className="text-[10px] text-foreground-muted ml-2">({parseFloat(item.price).toFixed(2)}€)</span>
                         {item.isPaid && <span className="ml-2 text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1 rounded">Pagado</span>}
                       </div>
                       <button
                         onClick={() => handleReclaimItem(item.id, item.itemName)}
                         className="text-[10px] bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 font-bold px-2 py-0.5 rounded flex items-center gap-0.5"
                       >
                         <AlertTriangle className="h-3 w-3" /> Reclamar
                       </button>
                     </div>
                   ))}
                 </div>
               </div>
             )}

             {/* Menu categories tabs */}
             <div className="space-y-3">
               <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-widest">Añadir Platos a la Comanda</h3>
               
               {['starter', 'first', 'second', 'dessert', 'coffee', 'drink'].map(courseKey => {
                 const courseItems = menuItemsList.filter(i => i.course === courseKey);
                 if (courseItems.length === 0) return null;

                 return (
                   <div key={courseKey} className="space-y-1.5">
                     <span className="text-[11px] font-bold text-accent-text block">{courseLabels[courseKey]}</span>
                     <div className="grid grid-cols-2 gap-2">
                       {courseItems.map(item => (
                         <button
                           key={item.itemName}
                           onClick={() => addToCart(item)}
                           className="p-3 rounded-xl border border-border bg-card text-left hover:border-accent hover:shadow-xs transition flex justify-between items-center"
                         >
                           <div>
                             <span className="font-bold text-xs text-foreground block truncate">{item.itemName}</span>
                             <span className="text-[11px] font-extrabold text-accent-text block">{item.price.toFixed(2)} €</span>
                           </div>
                           <span className="text-xs font-bold text-accent">+</span>
                         </button>
                       ))}
                     </div>
                   </div>
                 );
               })}
             </div>

             {/* Active Cart Box */}
             <div className="space-y-2">
               <h3 className="text-xs font-bold text-foreground-muted uppercase tracking-widest flex items-center gap-1">
                 <ShoppingCart className="h-3.5 w-3.5 text-accent-text" /> Nueva Comanda A Enviar
               </h3>

               <div className="p-4 rounded-2xl bg-card border border-border shadow-sm space-y-3">
                 {cart.length === 0 ? (
                   <p className="text-xs text-foreground-muted text-center py-4 font-medium">No hay platos seleccionados.</p>
                 ) : (
                   <>
                     <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                       {cart.map(item => (
                         <div key={item.itemName} className="flex justify-between items-center text-xs border-b border-border-subtle pb-2 last:border-b-0">
                           <div>
                             <span className="font-bold text-foreground">{item.itemName}</span>
                             <span className="text-[10px] text-foreground-muted block">Cant: {item.quantity} x {item.price.toFixed(2)}€</span>
                           </div>
                           <button 
                             onClick={() => removeFromCart(item.itemName)}
                             className="text-xs text-danger-text hover:text-danger font-extrabold"
                           >
                             Quitar
                           </button>
                         </div>
                       ))}
                     </div>

                     <div className="pt-2 border-t border-border flex justify-between items-center text-xs font-bold">
                       <label className="flex items-center gap-2 cursor-pointer">
                         <input
                           type="checkbox"
                           checked={isInternal}
                           onChange={e => setIsInternal(e.target.checked)}
                           className="rounded border-border text-accent focus:ring-accent"
                         />
                         <span>Ticket Interno (Gasto Empleado)</span>
                       </label>
                     </div>

                     <div className="pt-2 border-t border-border flex justify-between items-center text-sm font-black text-foreground">
                       <span>Total Nueva Comanda</span>
                       <span className="text-accent-text">{cart.reduce((acc, i) => acc + (i.price * i.quantity), 0).toFixed(2)} €</span>
                     </div>

                     <button
                       onClick={handleSendOrder}
                       disabled={sending}
                       className="w-full mt-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-accent-foreground font-black py-3 px-4 rounded-xl text-xs shadow-md transition flex justify-center items-center gap-1.5"
                     >
                       {sending ? 'Enviando...' : 'Enviar a Cocina'}
                       <Send className="h-3.5 w-3.5" />
                     </button>
                   </>
                 )}
               </div>
             </div>

          </div>

        )}

        {/* PAYMENT MODAL */}
        {showPaymentModal && activeOrder && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl p-5 max-w-md w-full space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <h3 className="font-black text-base flex items-center gap-1.5">
                  <CreditCard className="h-5 w-5 text-emerald-500" /> Cobrar Mesa {selectedTable?.tableNumber}
                </h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-foreground-muted hover:text-foreground">✕</button>
              </div>

              {/* Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground-muted block uppercase">Tipo de Pago</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMode('full')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${paymentMode === 'full' ? 'bg-accent text-white border-accent' : 'bg-btn-secondary border-border text-foreground'}`}
                  >
                    Cuenta Total
                  </button>
                  <button
                    onClick={() => setPaymentMode('equal')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${paymentMode === 'equal' ? 'bg-accent text-white border-accent' : 'bg-btn-secondary border-border text-foreground'}`}
                  >
                    A Partes Iguales
                  </button>
                  <button
                    onClick={() => setPaymentMode('items')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${paymentMode === 'items' ? 'bg-accent text-white border-accent' : 'bg-btn-secondary border-border text-foreground'}`}
                  >
                    Por Platos
                  </button>
                </div>
              </div>

              {/* Equal Split Input */}
              {paymentMode === 'equal' && (
                <div className="p-3 bg-card-subtle rounded-xl border border-border space-y-2">
                  <label className="text-xs font-bold text-foreground block">Dividir entre cuántas personas:</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="2"
                      max="20"
                      value={splitCount}
                      onChange={e => setSplitCount(Math.max(2, parseInt(e.target.value) || 2))}
                      className="w-20 p-2 rounded-lg bg-background border border-border text-center font-bold text-sm"
                    />
                    <span className="text-xs font-semibold text-foreground-muted">
                      Total por persona: <strong className="text-emerald-500 font-bold">{(parseFloat(activeOrder.totalAmount) / splitCount).toFixed(2)} €</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* Item Split Selection */}
              {paymentMode === 'items' && activeOrder.items && (
                <div className="p-3 bg-card-subtle rounded-xl border border-border space-y-2 max-h-[160px] overflow-y-auto">
                  <label className="text-xs font-bold text-foreground block">Selecciona platos a cobrar:</label>
                  {activeOrder.items.map(item => (
                    <label key={item.id} className="flex items-center justify-between text-xs p-1.5 hover:bg-background rounded cursor-pointer">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={item.isPaid}
                          checked={selectedItemIdsToPay.includes(item.id)}
                          onChange={e => {
                            if (e.target.checked) setSelectedItemIdsToPay(prev => [...prev, item.id]);
                            else setSelectedItemIdsToPay(prev => prev.filter(id => id !== item.id));
                          }}
                        />
                        <span className={item.isPaid ? 'line-through text-foreground-muted' : 'font-semibold'}>
                          {item.quantity}x {item.itemName}
                        </span>
                      </div>
                      <span className="font-bold">{(parseFloat(item.price) * item.quantity).toFixed(2)} €</span>
                    </label>
                  ))}
                </div>
              )}

              {/* Payment Method Selection */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-foreground-muted block uppercase">Método de Pago (Obligatorio)</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${paymentMethod === 'cash' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-btn-secondary border-border'}`}
                  >
                    💵 Efectivo
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${paymentMethod === 'card' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-btn-secondary border-border'}`}
                  >
                    💳 Tarjeta
                  </button>
                  <button
                    onClick={() => setPaymentMethod('mixed')}
                    className={`py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1 ${paymentMethod === 'mixed' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-btn-secondary border-border'}`}
                  >
                    🔀 Mixto
                  </button>
                </div>
              </div>

              {/* Total Summary */}
              <div className="pt-3 border-t border-border flex justify-between items-center">
                <span className="text-xs font-bold text-foreground-muted">Importe a Cobrar Ahora:</span>
                <span className="text-lg font-black text-emerald-500">
                  {paymentMode === 'full' && `${parseFloat((activeOrder as any).pendingAmount || activeOrder.totalAmount).toFixed(2)} €`}
                  {paymentMode === 'equal' && `${(parseFloat((activeOrder as any).pendingAmount || activeOrder.totalAmount) / splitCount).toFixed(2)} €`}
                  {paymentMode === 'items' && `${(activeOrder.items || []).filter(i => selectedItemIdsToPay.includes(i.id)).reduce((acc, i) => acc + parseFloat(i.price) * i.quantity, 0).toFixed(2)} €`}
                </span>
              </div>

              <button
                onClick={handleProcessPayment}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Check className="h-4 w-4" /> Confirmar Cobro e Imprimir Ticket
              </button>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
