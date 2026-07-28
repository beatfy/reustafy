'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowLeft, RefreshCw, Clock, CheckCircle2, Sun, Moon } from 'lucide-react';

interface OrderItem {
  id: string;
  itemName: string;
  quantity: number;
  status: 'pending' | 'cooking' | 'served';
}

interface Order {
  id: string;
  status: 'pending' | 'cooking' | 'served' | 'paid';
  createdAt: string;
  tableNumber: string | null;
  zone: string | null;
  items: OrderItem[];
}

export default function KitchenKDS() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [tablesList, setTablesList] = useState<any[]>([]);
  const [reservationsList, setReservationsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const fetchKDSOrders = async (activeToken: string) => {
    setLoading(true);
    try {
      // 1. Fetch KDS orders
      const res = await fetch(`${apiUrl}/api/orders/kds`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) throw new Error('Error fetching KDS orders');
      const data = await res.json();
      setOrdersList(data);

      // 2. Fetch Tables to match table IDs
      const tablesRes = await fetch(`${apiUrl}/api/tables`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (tablesRes.ok) {
        const tablesData = await tablesRes.json();
        setTablesList(tablesData);
      }

      // 3. Fetch Reservations to read allergies
      const resRes = await fetch(`${apiUrl}/api/reservations`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (resRes.ok) {
        const resData = await resRes.json();
        setReservationsList(resData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchKDSOrders(token);

      const eventSource = new EventSource(`${apiUrl}/api/events?token=${token}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (['ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ITEM_STATUS_UPDATED'].includes(data.type)) {
            fetchKDSOrders(token);
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

  // Update order status (pending -> cooking -> served)
  const handleUpdateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!token) return;
    setUpdatingId(orderId);

    try {
      const res = await fetch(`${apiUrl}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Error updating order status');

      await fetchKDSOrders(token);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  // Update individual item status (KDS interactive)
  const handleUpdateItemStatus = async (itemId: string, newStatus: OrderItem['status']) => {
    if (!token) return;

    try {
      const res = await fetch(`${apiUrl}/api/order-items/${itemId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Error updating item status');

      await fetchKDSOrders(token);
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-8 flex flex-col transition-colors duration-300">
      
      {/* Navbar KDS */}
      <header className="border-b border-border bg-header backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex justify-between items-center shadow-xs">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-foreground-secondary hover:text-foreground text-xs font-semibold">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <span className="font-bold text-sm tracking-wider flex items-center gap-1.5 uppercase text-foreground">
          <ChefHat className="h-5 w-5 text-accent-text" /> Pantalla Cocina KDS
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            title={darkMode ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            className="p-2 rounded-lg border border-border bg-btn-secondary text-foreground-secondary hover:bg-btn-secondary-hover transition"
          >
            {darkMode ? <Sun className="h-4 w-4 text-amber-400 fill-amber-400/20" /> : <Moon className="h-4 w-4 text-accent fill-accent" />}
          </button>
          <button 
            onClick={() => token && fetchKDSOrders(token)}
            className="p-2 bg-btn-secondary hover:bg-btn-secondary-hover rounded-lg text-foreground-secondary transition border border-border"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <span className="text-xs bg-accent-light text-accent-text font-bold px-3 py-1 rounded border border-accent-border">
            Cocina: {user?.tenantName}
          </span>
        </div>
      </header>

      {/* Main KDS Board */}
      <main className="flex-1 p-6 overflow-x-auto flex gap-6 items-stretch">
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : ordersList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-foreground-muted">
            <CheckCircle2 className="h-12 w-12 mb-3 text-success-icon" />
            <h3 className="font-bold text-lg text-foreground">¡Cocina al Día!</h3>
            <p className="text-sm">No hay comandas pendientes o en preparación.</p>
          </div>
        ) : (
          <div className="flex gap-6 items-start">
            {ordersList.map(order => {
              const minutes = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
              return (
                <div 
                  key={order.id} 
                  className={`w-80 rounded-2xl bg-card border border-border shadow-md p-5 flex flex-col justify-between shrink-0 border-t-4 ${
                    order.status === 'pending' ? 'border-t-warning' : 'border-t-accent'
                  }`}
                >
                  
                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start pb-3 border-b border-border">
                      <div>
                        <span className="text-2xl font-black text-foreground">Mesa {order.tableNumber || '?'}</span>
                        <span className="text-[11px] text-foreground-muted block font-bold mt-0.5 uppercase tracking-wider">Zona: {order.zone || 'Sala'}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] bg-btn-secondary text-foreground-secondary border border-border px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                          <Clock className="h-3 w-3 text-foreground-muted" /> {minutes} min
                        </span>
                        <span className={`text-[9px] uppercase font-extrabold px-2 py-0.5 rounded-full mt-1.5 ${
                          order.status === 'pending' ? 'bg-warning-light text-warning-text border border-warning-border' : 'bg-accent-light text-accent-text border border-accent-border'
                        }`}>
                          {order.status === 'pending' ? 'Por Empezar' : 'Preparando'}
                        </span>
                      </div>
                    </div>

                    {/* Display allergies warnings for Kitchen staff */}
                    {(() => {
                      const table = tablesList.find(t => t.tableNumber === order.tableNumber);
                      const tableRes = table ? reservationsList.find(r => r.tableId === table.id && r.status !== 'cancelled') : null;
                      if (tableRes?.allergies) {
                        return (
                          <div className="mt-3 p-2.5 bg-danger-light border border-danger-border rounded-xl text-danger-text text-xs font-bold flex items-center gap-1.5 animate-pulse">
                            <span>⚠️ ALERGIA: {tableRes.allergies}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Order Items list */}
                    <div className="py-4 space-y-3">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs border-b border-border-subtle pb-2.5 last:border-b-0 last:pb-0">
                          <div>
                            <span className="text-accent-text font-black">{item.quantity}x</span>
                            <span className="text-foreground ml-2 font-bold">{item.itemName}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateItemStatus(item.id, 'cooking')}
                                className="text-[11px] font-bold bg-warning hover:bg-warning-hover text-accent-foreground px-2.5 py-1 rounded-lg transition shadow-xs"
                              >
                                Cocinar
                              </button>
                            )}
                            {item.status === 'cooking' && (
                              <button 
                                onClick={() => handleUpdateItemStatus(item.id, 'served')}
                                className="text-[11px] font-bold bg-success hover:bg-success-hover text-accent-foreground px-2.5 py-1 rounded-lg transition shadow-xs"
                              >
                                Listo
                              </button>
                            )}
                            {item.status === 'served' && (
                              <span className="text-xs text-success-text font-extrabold">✓ Listo</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-border space-y-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'cooking')}
                        disabled={updatingId === order.id}
                        className="w-full bg-warning hover:bg-warning-hover text-accent-foreground text-xs font-black py-2.5 rounded-xl transition shadow-xs"
                      >
                        Preparar Comanda Completa
                      </button>
                    )}
                    {order.status === 'cooking' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                        disabled={updatingId === order.id}
                        className="w-full bg-success hover:bg-success-hover text-accent-foreground text-xs font-black py-2.5 rounded-xl transition shadow-xs"
                      >
                        Comanda Servida (Completar)
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>

    </div>
  );
}
