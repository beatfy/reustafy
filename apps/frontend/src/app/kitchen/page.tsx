'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChefHat, ArrowLeft, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';

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
  
  const [ordersList, setOrdersList] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

  const fetchKDSOrders = async (activeToken: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/orders/kds`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!res.ok) throw new Error('Error fetching KDS orders');
      const data = await res.json();
      setOrdersList(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchKDSOrders(token);
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
    <div className="min-h-screen bg-[#090d16] text-slate-100 pb-8 flex flex-col">
      
      {/* Navbar KDS */}
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md px-6 py-4 sticky top-0 z-20 flex justify-between items-center">
        <button onClick={() => router.push('/dashboard')} className="flex items-center gap-1 text-slate-400 hover:text-white text-xs font-semibold">
          <ArrowLeft className="h-4 w-4" /> Volver
        </button>
        <span className="font-bold text-sm tracking-wider flex items-center gap-1.5 uppercase">
          <ChefHat className="h-5 w-5 text-indigo-400" /> Pantalla Cocina KDS
        </span>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => token && fetchKDSOrders(token)}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1 rounded border border-indigo-500/30">
            Cocina: {user?.tenantName}
          </span>
        </div>
      </header>

      {/* Main KDS Board */}
      <main className="flex-1 p-6 overflow-x-auto flex gap-6 items-stretch">
        
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : ordersList.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <CheckCircle2 className="h-12 w-12 mb-3 text-emerald-500/60" />
            <h3 className="font-bold text-lg text-white">¡Cocina al Día!</h3>
            <p className="text-sm">No hay comandas pendientes o en preparación.</p>
          </div>
        ) : (
          <div className="flex gap-6 items-start">
            {ordersList.map(order => {
              const minutes = Math.floor((new Date().getTime() - new Date(order.createdAt).getTime()) / 60000);
              return (
                <div 
                  key={order.id} 
                  className={`w-80 rounded-2xl glass-panel p-5 flex flex-col justify-between shrink-0 border-t-4 border-l ${
                    order.status === 'pending' ? 'border-t-amber-500 border-white/5' : 'border-t-indigo-500 border-white/5'
                  }`}
                >
                  
                  {/* Card Header */}
                  <div>
                    <div className="flex justify-between items-start pb-3 border-b border-white/5">
                      <div>
                        <span className="text-2xl font-black text-white">Mesa {order.tableNumber || '?'}</span>
                        <span className="text-[10px] text-slate-400 block font-bold mt-0.5 uppercase tracking-wider">Zona: {order.zone || 'Sala'}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold">
                          <Clock className="h-3 w-3 text-slate-400" /> {minutes} min
                        </span>
                        <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded mt-1.5 ${
                          order.status === 'pending' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
                        }`}>
                          {order.status === 'pending' ? 'Por Empezar' : 'Preparando'}
                        </span>
                      </div>
                    </div>

                    {/* Order Items list */}
                    <div className="py-4 space-y-3">
                      {order.items.map(item => (
                        <div key={item.id} className="flex justify-between items-center text-xs">
                          <div>
                            <span className="text-white font-bold">{item.quantity}x</span>
                            <span className="text-slate-200 ml-2 font-medium">{item.itemName}</span>
                          </div>

                          <div className="flex items-center gap-1">
                            {item.status === 'pending' && (
                              <button 
                                onClick={() => handleUpdateItemStatus(item.id, 'cooking')}
                                className="text-[10px] bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 px-2 py-1 rounded"
                              >
                                Cocinar
                              </button>
                            )}
                            {item.status === 'cooking' && (
                              <button 
                                onClick={() => handleUpdateItemStatus(item.id, 'served')}
                                className="text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 px-2 py-1 rounded"
                              >
                                Listo
                              </button>
                            )}
                            {item.status === 'served' && (
                              <span className="text-[10px] text-emerald-400 font-bold">✓ Listo</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="pt-3 border-t border-white/5 space-y-2">
                    {order.status === 'pending' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'cooking')}
                        disabled={updatingId === order.id}
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-2 rounded-lg transition"
                      >
                        Preparar Comanda Completa
                      </button>
                    )}
                    {order.status === 'cooking' && (
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'served')}
                        disabled={updatingId === order.id}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 rounded-lg transition"
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
