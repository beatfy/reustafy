'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LogOut, 
  MapPin, 
  Plus, 
  Calendar, 
  History, 
  Coins, 
  TrendingUp, 
  UserCheck, 
  MessageSquare,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  Tablet,
  ChefHat,
  Utensils,
  Star
} from 'lucide-react';

interface Table {
  id: string;
  tableNumber: string;
  zone: 'salon' | 'terrace' | 'bar';
  status: 'free' | 'ordered' | 'eating' | 'bill' | 'reserved';
  capacity: number;
}

interface Reservation {
  id: string;
  customerName: string;
  customerPhone?: string;
  partySize: number;
  reservationTime: string;
  tableId: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'seated';
  allergies?: string | null;
}

interface ActivityLog {
  id: string;
  actionDescription: string;
  timestamp: string;
  userName: string | null;
  userRole: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [apiUrl, setApiUrl] = useState('');

  // Domain data
  const [tablesList, setTablesList] = useState<Table[]>([]);
  const [reservationsList, setReservationsList] = useState<Reservation[]>([]);
  const [logsList, setLogsList] = useState<ActivityLog[]>([]);
  const [ordersList, setOrdersList] = useState<any[]>([]);
  
  // UI states
  const [activeTab, setActiveTab] = useState<'operations' | 'marketing' | 'finance'>('operations');
  const [selectedZone, setSelectedZone] = useState<'all' | 'salon' | 'terrace' | 'bar'>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null);
  
  // Loyalty & Marketing states
  const [loyaltyCustomers, setLoyaltyCustomers] = useState<any[]>([]);
  const [campaignLogs, setCampaignLogs] = useState<any[]>([]);
  const [isCampaignSimulating, setIsCampaignSimulating] = useState(false);
  const [newCustName, setNewCustName] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustAllergies, setNewCustAllergies] = useState('');
  const [newCustPref, setNewCustPref] = useState('');

  // Finance states
  const [pnlData, setPnlData] = useState<any>(null);
  const [closingsList, setClosingsList] = useState<any[]>([]);
  const [escandallosList, setEscandallosList] = useState<any[]>([]);
  const [actualAmountInput, setActualAmountInput] = useState('');
  const [orderType, setOrderType] = useState<'dine_in' | 'takeaway'>('dine_in');
  const [billingMode, setBillingMode] = useState<'full' | 'equal' | 'itemized'>('full');
  const [splitCountInput, setSplitCountInput] = useState('2');
  const [paidItemIds, setPaidItemIds] = useState<string[]>([]);

  // Loading & Error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);

  // Load configuration from local storage
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

  // Fetch data
  const fetchData = async (overrideToken?: string) => {
    const activeToken = overrideToken || token;
    if (!activeToken) return;

    setLoading(true);
    setError('');

    try {
      // 1. Fetch tables
      const tablesRes = await fetch(`${apiUrl}/api/tables`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!tablesRes.ok) throw new Error('Error al cargar mesas');
      const tablesData = await tablesRes.json();
      setTablesList(tablesData);

       // 2. Fetch reservations
       const resRes = await fetch(`${apiUrl}/api/reservations`, {
         headers: { Authorization: `Bearer ${activeToken}` }
       });
       if (!resRes.ok) throw new Error('Error al cargar reservas');
       const resData = await resRes.json();
       setReservationsList(resData);
 
       // Fetch orders
       const ordersRes = await fetch(`${apiUrl}/api/orders`, {
         headers: { Authorization: `Bearer ${activeToken}` }
       });
       if (ordersRes.ok) {
         const ordersData = await ordersRes.json();
         setOrdersList(ordersData);
       }

      // 3. Fetch activity logs
      const logsRes = await fetch(`${apiUrl}/api/logs`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!logsRes.ok) throw new Error('Error al cargar logs');
      const logsData = await logsRes.json();
      setLogsList(logsData);

      const activeUser = user || (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('reustafy_user') || 'null') : null);
      
      // 4. Fetch loyalty customers if medium or premium
      if (activeUser && (activeUser.subscriptionTier === 'medium' || activeUser.subscriptionTier === 'premium')) {
        const loyaltyRes = await fetch(`${apiUrl}/api/loyalty/customers`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (loyaltyRes.ok) {
          const loyaltyData = await loyaltyRes.json();
          setLoyaltyCustomers(loyaltyData);
        }
      }

      // 5. Fetch finance reports & costing if premium
      if (activeUser && activeUser.subscriptionTier === 'premium') {
        const pnlRes = await fetch(`${apiUrl}/api/finance/pnl`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (pnlRes.ok) {
          const pnlResult = await pnlRes.json();
          setPnlData(pnlResult.data);
        }

        const costingRes = await fetch(`${apiUrl}/api/finance/costing`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (costingRes.ok) {
          const costingResult = await costingRes.json();
          setEscandallosList(costingResult.items);
        }

        const closingsRes = await fetch(`${apiUrl}/api/finance/closings`, {
          headers: { Authorization: `Bearer ${activeToken}` }
        });
        if (closingsRes.ok) {
          const closingsData = await closingsRes.json();
          setClosingsList(closingsData);
        }
      }

    } catch (err: any) {
      setError(err.message || 'Error de sincronización de datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token && apiUrl) {
      fetchData();
    }
  }, [token, apiUrl]);

  const handleLogout = () => {
    localStorage.removeItem('reustafy_token');
    localStorage.removeItem('reustafy_user');
    router.push('/');
  };

  // Change Table Status
  const handleUpdateTableStatus = async (tableId: string, newStatus: Table['status']) => {
    if (!token) return;
    setUpdating(true);

    try {
      const res = await fetch(`${apiUrl}/api/tables/${tableId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('No se pudo actualizar el estado de la mesa');
      
      // Update local state to reflect instantly
      setTablesList(prev => prev.map(t => t.id === tableId ? { ...t, status: newStatus } : t));
      
      // Re-fetch logs since updating table status posts a new log
      const logsRes = await fetch(`${apiUrl}/api/logs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setLogsList(logsData);
      }

      setSelectedTable(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Add Loyalty Customer
  const handleAddLoyaltyCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName || !newCustEmail) return;

    setUpdating(true);
    try {
      const res = await fetch(`${apiUrl}/api/loyalty/customers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newCustName,
          email: newCustEmail,
          phone: newCustPhone || null,
          allergies: newCustAllergies || null,
          preferences: newCustPref || null,
          points: 10 // Welcome points
        })
      });

      if (!res.ok) throw new Error('Error al registrar cliente');
      
      setNewCustName('');
      setNewCustEmail('');
      setNewCustPhone('');
      setNewCustAllergies('');
      setNewCustPref('');
      
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Run campaign automation simulation
  const handleRunCampaignSimulation = async () => {
    setIsCampaignSimulating(true);
    try {
      const res = await fetch(`${apiUrl}/api/loyalty/triggers`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Error al simular campaña');
      const data = await res.json();
      setCampaignLogs(data.logs || []);
      
      await fetchData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsCampaignSimulating(false);
    }
  };

  // Submit Blind Register Closing (Arqueo)
  const handleRegisterClosingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(actualAmountInput);
    if (isNaN(amount) || amount < 0) {
      alert('Por favor introduce un monto válido.');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`${apiUrl}/api/finance/closings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ actualAmount: amount })
      });

      if (!res.ok) throw new Error('Error al registrar arqueo');
      setActualAmountInput('');
      
      await fetchData();
      alert('Arqueo registrado y descuadre guardado en el historial.');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Checkout table / Settle bill
  const handleCheckoutTable = async (tableId: string, orderType: 'dine_in' | 'takeaway') => {
    setUpdating(true);
    try {
      const res = await fetch(`${apiUrl}/api/tables/${tableId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ orderType })
      });

      if (!res.ok) throw new Error('Error al cobrar mesa');
      const result = await res.json();
      
      setSelectedTable(null);
      await fetchData();
      alert(`Mesa cobrada con éxito. Total cobrado: ${result.totalSettled}€`);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Assign Table to Reservation
  const handleAssignTableToReservation = async (reservationId: string, tableId: string | null) => {
    if (!token) return;
    setUpdating(true);

    try {
      const res = await fetch(`${apiUrl}/api/reservations/${reservationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ 
          tableId,
          status: tableId ? 'confirmed' : 'pending'
        })
      });

      if (!res.ok) throw new Error('No se pudo asignar la mesa a la reserva');
      
      await fetchData();
      setAssigningReservation(null);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdating(false);
    }
  };

  // Render Table status badge / styles
  const getTableStatusStyle = (status: Table['status']) => {
    switch (status) {
      case 'free':
        return 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20';
      case 'ordered':
        return 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20';
      case 'eating':
        return 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400 hover:bg-indigo-500/20';
      case 'bill':
        return 'bg-red-500/10 border-red-500/40 text-red-400 hover:bg-red-500/20';
      case 'reserved':
        return 'bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20';
    }
  };

  const filteredTables = selectedZone === 'all' 
    ? tablesList 
    : tablesList.filter(t => t.zone === selectedZone);

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#090d16] text-white">
        <RefreshCw className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  const isTierEnough = (required: 'basic' | 'medium' | 'premium') => {
    const hierarchy = { basic: 1, medium: 2, premium: 3 };
    const userTierVal = hierarchy[user.subscriptionTier as 'basic' | 'medium' | 'premium'] || 1;
    const requiredVal = hierarchy[required];
    return userTierVal >= requiredVal;
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex flex-col text-slate-100 pb-12">
      
      {/* 1. TOP HEADER NAVIGATION */}
      <header className="border-b border-white/5 bg-slate-950/40 backdrop-blur-md sticky top-0 z-30 px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
        
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <Utensils className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg leading-none">Reustafy</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300">
                Tenant: {user.tenantName}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Conectado como {user.name} ({user.role})</p>
          </div>
        </div>

        {/* Dynamic Navigation Tabs */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 gap-1 text-sm">
          <button 
            onClick={() => setActiveTab('operations')}
            className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${activeTab === 'operations' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            <MapPin className="h-4 w-4" /> Operaciones
          </button>
          
          <button 
            onClick={() => setActiveTab('marketing')}
            className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${activeTab === 'marketing' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {!isTierEnough('medium') && <Lock className="h-3 w-3 text-slate-500" />}
            <UserCheck className="h-4 w-4" /> Fidelización
          </button>
          
          <button 
            onClick={() => setActiveTab('finance')}
            className={`px-4 py-1.5 rounded-lg font-medium transition flex items-center gap-1.5 ${activeTab === 'finance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
            {!isTierEnough('premium') && <Lock className="h-3 w-3 text-slate-500" />}
            <Coins className="h-4 w-4" /> Finanzas & BI
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          
          {/* Quick link to Waiter and Kitchen interfaces */}
          <button 
            onClick={() => router.push('/waiter')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
          >
            <Tablet className="h-3.5 w-3.5" /> Camarero PWA
          </button>
          <button 
            onClick={() => router.push('/kitchen')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition"
          >
            <ChefHat className="h-3.5 w-3.5" /> Cocina KDS
          </button>
          
          <button 
            onClick={() => fetchData()}
            className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white transition"
            title="Refrescar datos"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-500/20 px-3 py-1.5 text-xs font-semibold rounded-lg transition"
          >
            <LogOut className="h-3.5 w-3.5" /> Salir
          </button>
        </div>

      </header>

      {/* 2. DYNAMIC WORKSPACE BODY */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col gap-6">

        {/* System Error notification if any */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* -------------------- TAB 1: OPERATIONS (BASIC PLAN) -------------------- */}
        {activeTab === 'operations' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT PANEL: TABLE MAP (col-span-8) */}
            <section className="lg:col-span-8 glass-panel rounded-2xl p-6 flex flex-col gap-6 min-h-[500px]">
              
              {/* Header inside Map */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/5">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-indigo-400" /> Map de Mesas
                  </h2>
                  <p className="text-xs text-slate-400">Control interactivo de estados en tiempo real.</p>
                </div>

                {/* Zone Filter */}
                <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 text-xs">
                  {['all', 'salon', 'terrace', 'bar'].map((zone) => (
                    <button
                      key={zone}
                      onClick={() => setSelectedZone(zone as any)}
                      className={`px-3 py-1 rounded-md font-medium capitalize transition ${selectedZone === zone ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                      {zone === 'all' ? 'Ver Todas' : zone}
                    </button>
                  ))}
                </div>
              </div>

              {/* Grid Layout of Tables */}
              {loading ? (
                <div className="flex-1 flex items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-indigo-400" />
                </div>
              ) : filteredTables.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-500 py-12">
                  <AlertTriangle className="h-8 w-8 mb-2" />
                  <p className="text-sm font-semibold">No se encontraron mesas en esta zona.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 flex-1">
                  
                  {filteredTables.map((table) => {
                    const isSelected = selectedTable?.id === table.id;
                    return (
                      <div
                        key={table.id}
                        onClick={() => setSelectedTable(table)}
                        className={`p-4 rounded-xl border cursor-pointer glass-panel-hover flex flex-col justify-between h-36 transition-all ${getTableStatusStyle(table.status)} ${isSelected ? 'ring-2 ring-indigo-500 border-indigo-500' : ''}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-2xl font-bold block">{table.tableNumber}</span>
                            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mt-0.5">{table.zone}</span>
                          </div>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full border bg-white/5 border-white/10 capitalize">
                            Pax: {table.capacity}
                          </span>
                        </div>

                        <div>
                          <div className="text-[9px] uppercase tracking-widest font-bold text-slate-400">Estado</div>
                          <span className="text-xs font-bold capitalize">{table.status}</span>
                        </div>
                      </div>
                    );
                  })}

                </div>
              )}

              {/* Status Update Modal / Inline Panel if a Table is Selected */}
              {selectedTable && (
                <div className="mt-4 p-4 rounded-xl bg-white/5 border border-indigo-500/20 backdrop-blur-md flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fadeIn">
                  <div>
                    <h3 className="font-bold text-white">Modificar Mesa {selectedTable.tableNumber}</h3>
                    <p className="text-xs text-slate-400">Selecciona un nuevo estado para guardar en la base de datos.</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(['free', 'ordered', 'eating', 'bill', 'reserved'] as const).map((status) => (
                      <button
                        key={status}
                        disabled={updating}
                        onClick={() => handleUpdateTableStatus(selectedTable.id, status)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition ${selectedTable.status === status ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'}`}
                      >
                        {status.toUpperCase()}
                      </button>
                    ))}
                    <button 
                      onClick={() => setSelectedTable(null)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Settle Bill & Split Payment Section if a Table is Selected */}
              {selectedTable && (
                <div className="mt-4 p-6 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md space-y-6">
                  <div>
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Coins className="h-4.5 w-4.5 text-indigo-400" /> Cuenta y Facturación - Mesa {selectedTable.tableNumber}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">Saca la cuenta completa, divídela por clientes o cobra por plato con impuestos españoles calculados.</p>
                  </div>

                  {(() => {
                    const tableOrders = ordersList.filter(o => o.tableId === selectedTable.id && o.status !== 'paid');
                    if (tableOrders.length === 0) {
                      return (
                        <div className="text-xs text-slate-500 text-center py-4">
                          No hay consumiciones activas registradas en esta mesa.
                        </div>
                      );
                    }

                    const allItems = tableOrders.flatMap(o => (o.items || []).map((item: any) => ({
                      ...item,
                      orderId: o.id
                    })));

                    if (allItems.length === 0) {
                      return (
                        <div className="text-xs text-slate-500 text-center py-4">
                          Comanda vacía (sin platos registrados).
                        </div>
                      );
                    }

                    // Alcohol Classifier
                    const isAlcohol = (name: string) => /vino|cerveza|copa|whisky|caña|sangria|tinto|ron|ginebra|vodka|sidra|alcohol/i.test(name);

                    // Calculations
                    const totalInclTax = allItems.reduce((acc, item) => acc + (parseFloat(item.price) * item.quantity), 0);
                    
                    let base10Total = 0;
                    let base21Total = 0;
                    let iva10Amount = 0;
                    let iva21Amount = 0;

                    allItems.forEach(item => {
                      const itemPrice = parseFloat(item.price) * item.quantity;
                      if (orderType === 'takeaway' && isAlcohol(item.itemName)) {
                        base21Total += itemPrice / 1.21;
                        iva21Amount += (itemPrice / 1.21) * 0.21;
                      } else {
                        base10Total += itemPrice / 1.10;
                        iva10Amount += (itemPrice / 1.10) * 0.10;
                      }
                    });

                    const netSubtotal = base10Total + base21Total;
                    const totalIVA = iva10Amount + iva21Amount;

                    // Equal split
                    const splitCount = parseInt(splitCountInput) || 2;
                    const splitAmount = totalInclTax / splitCount;

                    // Itemized split calculation
                    const selectedItemsTotal = paidItemIds.reduce((acc, itemId) => {
                      const item = allItems.find(i => i.id === itemId);
                      if (item) return acc + (parseFloat(item.price) * item.quantity);
                      return acc;
                    }, 0);
                    const remainingTotal = totalInclTax - selectedItemsTotal;

                    return (
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Column 1: Order Details */}
                        <div className="space-y-4">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Consumición Actual</span>
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {allItems.map((item: any) => {
                              const isAlc = isAlcohol(item.itemName);
                              const isChecked = paidItemIds.includes(item.id);
                              return (
                                <div 
                                  key={item.id} 
                                  onClick={() => {
                                    if (billingMode === 'itemized') {
                                      setPaidItemIds(prev => 
                                        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                                      );
                                    }
                                  }}
                                  className={`p-2.5 rounded-lg border text-xs flex justify-between items-center transition cursor-pointer ${
                                    billingMode === 'itemized' 
                                      ? isChecked 
                                        ? 'bg-indigo-600/20 border-indigo-500' 
                                        : 'bg-slate-950/60 border-white/5 hover:bg-slate-900/60'
                                      : 'bg-slate-950/40 border-white/5 cursor-default'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-1.5 font-bold text-white">
                                      {billingMode === 'itemized' && (
                                        <input 
                                          type="checkbox" 
                                          checked={isChecked} 
                                          onChange={() => {}} // handled by div onClick
                                          className="rounded border-white/10 text-indigo-600 focus:ring-0 mr-1" 
                                        />
                                      )}
                                      <span>{item.itemName}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                                      Cant: {item.quantity} • Unit: {parseFloat(item.price).toFixed(2)}€
                                      {isAlc && (
                                        <span className="ml-1 bg-amber-500/10 text-amber-400 px-1 rounded text-[8px] font-bold">
                                          Alcohol
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                  <span className="font-mono text-white">{(parseFloat(item.price) * item.quantity).toFixed(2)}€</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Column 2: Billing mode and Calculator */}
                        <div className="space-y-4">
                          <span className="text-[10px] text-slate-400 uppercase font-bold block">Método de Pago</span>
                          
                          <div className="grid grid-cols-3 gap-2">
                            {(['full', 'equal', 'itemized'] as const).map((mode) => (
                              <button
                                key={mode}
                                onClick={() => {
                                  setBillingMode(mode);
                                  setPaidItemIds([]);
                                }}
                                className={`text-[10px] font-bold py-2 rounded-lg border transition ${
                                  billingMode === mode 
                                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                                    : 'bg-slate-950/80 text-slate-400 border-white/5 hover:bg-slate-900'
                                }`}
                              >
                                {mode === 'full' ? '100% Caja' : mode === 'equal' ? 'Dividir' : 'Por Cliente'}
                              </button>
                            ))}
                          </div>

                          {billingMode === 'equal' && (
                            <div className="p-3 bg-slate-950 rounded-xl space-y-3">
                              <div>
                                <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Número de Comensales</label>
                                <input 
                                  type="number"
                                  min="2"
                                  max="30"
                                  value={splitCountInput}
                                  onChange={(e) => setSplitCountInput(e.target.value)}
                                  className="w-full text-xs bg-slate-900 border border-white/10 text-white rounded px-2 py-1.5 focus:outline-none focus:border-indigo-500"
                                />
                              </div>
                              <div className="text-center py-2 border-t border-white/5">
                                <span className="text-xs text-slate-400 block">Toca pagar a cada cliente:</span>
                                <span className="text-xl font-bold text-indigo-400 block mt-1 font-mono">
                                  {splitAmount.toFixed(2)} €
                                </span>
                              </div>
                            </div>
                          )}

                          {billingMode === 'itemized' && (
                            <div className="p-3 bg-slate-950 rounded-xl space-y-2.5 text-xs text-slate-300">
                              <span className="text-[10px] text-slate-500 block leading-normal">
                                Selecciona los platos del panel de la izquierda que corresponden al cliente que va a pagar ahora.
                              </span>
                              <div className="flex justify-between border-b border-white/5 pb-1.5 mt-2">
                                <span>Total Cliente Actual:</span>
                                <span className="font-mono text-emerald-400 font-bold">{selectedItemsTotal.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between text-slate-400">
                                <span>Restante en Mesa:</span>
                                <span className="font-mono">{remainingTotal.toFixed(2)} €</span>
                              </div>
                            </div>
                          )}

                          {billingMode === 'full' && (
                            <div className="p-3 bg-slate-950 rounded-xl text-center py-6 text-xs text-slate-400">
                              Se emitirá la factura simplificada por el 100% de la consumición de la mesa.
                            </div>
                          )}

                          <div className="p-3 bg-slate-950 rounded-xl space-y-2">
                            <label className="text-[10px] text-slate-400 block font-semibold uppercase">Tipo de Servicio (Impuestos)</label>
                            <div className="grid grid-cols-2 gap-2 mt-1">
                              <button
                                onClick={() => setOrderType('dine_in')}
                                className={`text-[10px] py-1.5 rounded font-bold border transition ${
                                  orderType === 'dine_in' 
                                    ? 'bg-slate-800 border-indigo-400 text-white' 
                                    : 'bg-transparent text-slate-500 border-white/5'
                                }`}
                              >
                                Consumo en Mesa (10% IVA)
                              </button>
                              <button
                                onClick={() => setOrderType('takeaway')}
                                className={`text-[10px] py-1.5 rounded font-bold border transition ${
                                  orderType === 'takeaway' 
                                    ? 'bg-slate-800 border-indigo-400 text-white' 
                                    : 'bg-transparent text-slate-500 border-white/5'
                                }`}
                              >
                                Para Llevar (21% IVA Alcohol)
                              </button>
                            </div>
                          </div>

                        </div>

                        {/* Column 3: Spanish VAT Breakdown & Submit */}
                        <div className="space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">Resumen Impositivo (IVA España)</span>
                            
                            <div className="p-3 bg-slate-950 rounded-xl space-y-2 text-xs text-slate-400 font-mono">
                              <div className="flex justify-between">
                                <span>Base Imponible:</span>
                                <span>{netSubtotal.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between text-slate-500">
                                <span>Cuota IVA 10%:</span>
                                <span>{iva10Amount.toFixed(2)} €</span>
                              </div>
                              {iva21Amount > 0 && (
                                <div className="flex justify-between text-slate-500">
                                  <span>Cuota IVA 21%:</span>
                                  <span>{iva21Amount.toFixed(2)} €</span>
                                </div>
                              )}
                              <div className="flex justify-between border-t border-white/5 pt-2 text-slate-300">
                                <span>Suma Impuestos (IVA):</span>
                                <span>{totalIVA.toFixed(2)} €</span>
                              </div>
                              <div className="flex justify-between pt-1 font-bold text-sm text-white">
                                <span>TOTAL FACTURA:</span>
                                <span>{totalInclTax.toFixed(2)} €</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <button
                              onClick={() => handleCheckoutTable(selectedTable.id, orderType)}
                              disabled={updating}
                              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <Coins className="h-4 w-4" /> 
                              {billingMode === 'itemized' && selectedItemsTotal > 0
                                ? `Cobrar Cliente actual (${selectedItemsTotal.toFixed(2)}€)`
                                : `Cobrar Mesa Completa (${totalInclTax.toFixed(2)}€)`
                              }
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })()}
                </div>
              )}

            </section>

            {/* RIGHT PANEL: RESERVATIONS & LOGS (col-span-4) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Box 1: Reservations */}
              <section className="glass-panel rounded-2xl p-6 flex flex-col gap-4 max-h-[350px]">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h2 className="text-md font-bold text-white flex items-center gap-1.5">
                    <Calendar className="h-4.5 w-4.5 text-indigo-400" /> Reservas del Día
                  </h2>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-300 font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {reservationsList.length}
                  </span>
                </div>

                <div className="overflow-y-auto space-y-3 pr-1">
                  {reservationsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No hay reservas programadas.</p>
                  ) : (
                    reservationsList.map((res) => {
                      const resTime = new Date(res.reservationTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={res.id} className="p-3 rounded-lg border border-white/5 bg-slate-900/40 flex justify-between items-center">
                          <div>
                            <span className="text-sm font-semibold text-white block">{res.customerName}</span>
                            <span className="text-[10px] text-indigo-300 flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {resTime} • {res.partySize} personas
                            </span>
                            {res.allergies && (
                              <span className="block text-[10px] text-rose-400 font-bold mt-1">
                                ⚠️ Alergias: {res.allergies}
                              </span>
                            )}
                            {res.tableId ? (
                              <span className="inline-block text-[9px] uppercase font-bold text-emerald-400 mt-1">
                                Asignada a Mesa {tablesList.find(t => t.id === res.tableId)?.tableNumber || '?' }
                              </span>
                            ) : (
                              <span className="inline-block text-[9px] uppercase font-bold text-amber-400 mt-1">
                                Sin Asignar
                              </span>
                            )}
                          </div>

                          {!res.tableId && (
                            <button
                              onClick={() => setAssigningReservation(res)}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-1 px-2.5 rounded-lg transition"
                            >
                              Asignar
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Assignment Dropdown Modal */}
                {assigningReservation && (
                  <div className="p-3 rounded-lg border border-indigo-500/30 bg-indigo-950/30 flex flex-col gap-2">
                    <span className="text-xs font-semibold text-white">Asignar mesa para {assigningReservation.customerName}:</span>
                    <div className="flex gap-2">
                      <select 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val) handleAssignTableToReservation(assigningReservation.id, val);
                        }}
                        className="text-xs bg-slate-950 border border-white/10 text-slate-300 rounded px-2 py-1 w-full"
                        defaultValue=""
                      >
                        <option value="" disabled>Selecciona Mesa...</option>
                        {tablesList.filter(t => t.status === 'free').map(t => (
                          <option key={t.id} value={t.id}>Mesa {t.tableNumber} (Pax {t.capacity})</option>
                        ))}
                      </select>
                      <button 
                        onClick={() => setAssigningReservation(null)}
                        className="text-xs bg-slate-800 text-slate-400 rounded px-2 py-1"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                )}
              </section>

              {/* Box 2: Activity Logs */}
              <section className="glass-panel rounded-2xl p-6 flex flex-col gap-4 max-h-[380px]">
                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                  <h2 className="text-md font-bold text-white flex items-center gap-1.5">
                    <History className="h-4.5 w-4.5 text-indigo-400" /> Log de Auditoría RLS
                  </h2>
                  <span className="text-[9px] uppercase bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">En tiempo real</span>
                </div>

                <div className="overflow-y-auto space-y-3 pr-1 flex-1">
                  {logsList.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-6">No hay registros de actividad aún.</p>
                  ) : (
                    logsList.map((log) => {
                      const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                      return (
                        <div key={log.id} className="text-xs border-b border-white/5 pb-2 last:border-b-0">
                          <p className="text-slate-300 leading-snug">{log.actionDescription}</p>
                          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span className="font-semibold text-slate-400">{log.userName || 'Sistema'} ({log.userRole || 'Admin'})</span>
                            <span>{logTime}</span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

            </div>

          </div>
        )}

        {/* -------------------- TAB 2: MARKETING (MEDIUM PLAN) -------------------- */}
        {activeTab === 'marketing' && (
          <div className="relative">
            {!isTierEnough('medium') ? (
              
              /* Lock Screen (Basic user blocking) */
              <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] border border-amber-500/10">
                <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-full text-amber-400 mb-6">
                  <Lock className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Módulo: Fidelización y Marketing Bloqueado</h2>
                <p className="text-slate-400 max-w-lg mb-8 text-sm">
                  Esta funcionalidad requiere un plan de suscripción <span className="font-bold text-amber-300">Growth (Medium)</span>. Tu plan actual es <span className="font-bold text-slate-300 uppercase">{user.subscriptionTier}</span>.
                </p>
                <button 
                  onClick={() => alert('Simular Upgrades de Suscripción no implementados en este demo.')}
                  className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 text-sm"
                >
                  Solicitar Upgrade de Plan
                </button>
              </div>

            ) : (

              /* Growth / Marketing Module UI */
              <div className="space-y-6">
                
                {/* Header */}
                <div className="glass-panel rounded-2xl p-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-emerald-400" /> Panel de Fidelización y Automatización de Marketing
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Herramientas Growth para fidelización de clientes (Inquilino: {user.tenantName}).</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Loyalty Directory & Form */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Add Customer Form */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Plus className="h-4 w-4 text-emerald-400" /> Registrar Cliente de Fidelidad
                      </h3>
                      <form onSubmit={handleAddLoyaltyCustomer} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Nombre Completo</label>
                          <input 
                            type="text"
                            required
                            placeholder="Ej. Juan Pérez"
                            value={newCustName}
                            onChange={(e) => setNewCustName(e.target.value)}
                            className="w-full text-xs bg-slate-950/80 border border-white/10 text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Correo Electrónico</label>
                          <input 
                            type="email"
                            required
                            placeholder="juan@gmail.com"
                            value={newCustEmail}
                            onChange={(e) => setNewCustEmail(e.target.value)}
                            className="w-full text-xs bg-slate-950/80 border border-white/10 text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Teléfono (Opcional)</label>
                          <input 
                            type="text"
                            placeholder="+34600111222"
                            value={newCustPhone}
                            onChange={(e) => setNewCustPhone(e.target.value)}
                            className="w-full text-xs bg-slate-950/80 border border-white/10 text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Alergias (Opcional)</label>
                          <input 
                            type="text"
                            placeholder="Gluten, Marisco, etc."
                            value={newCustAllergies}
                            onChange={(e) => setNewCustAllergies(e.target.value)}
                            className="w-full text-xs bg-slate-950/80 border border-white/10 text-white rounded-lg p-2.5 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Preferencias o Notas</label>
                          <textarea 
                            placeholder="Prefiere mesa exterior, vino tinto, etc."
                            value={newCustPref}
                            onChange={(e) => setNewCustPref(e.target.value)}
                            className="w-full text-xs bg-slate-950/80 border border-white/10 text-white rounded-lg p-2.5 h-16 resize-none focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="sm:col-span-2 flex justify-end">
                          <button 
                            type="submit"
                            disabled={updating}
                            className="bg-emerald-600 text-white text-xs font-bold py-2 px-5 rounded-lg hover:bg-emerald-500 transition disabled:opacity-50"
                          >
                            {updating ? 'Guardando...' : 'Fidelizar Cliente'}
                          </button>
                        </div>
                      </form>
                    </div>

                    {/* Customer Directory Table */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Star className="h-4 w-4 text-emerald-400" /> Directorio de Clientes Fidelizados
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/10 text-slate-400 uppercase text-[10px]">
                              <th className="py-2.5 font-semibold">Cliente</th>
                              <th className="py-2.5 font-semibold">Contacto</th>
                              <th className="py-2.5 font-semibold">Puntos</th>
                              <th className="py-2.5 font-semibold">Alergias / Preferencias</th>
                            </tr>
                          </thead>
                          <tbody>
                            {loyaltyCustomers.length === 0 ? (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-500">No hay clientes fidelizados registrados aún.</td>
                              </tr>
                            ) : (
                              loyaltyCustomers.map((cust: any) => (
                                <tr key={cust.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/5 transition">
                                  <td className="py-3 font-semibold text-white">{cust.name}</td>
                                  <td className="py-3 text-slate-300">
                                    <span className="block">{cust.email}</span>
                                    <span className="text-[10px] text-slate-500">{cust.phone || 'Sin teléfono'}</span>
                                  </td>
                                  <td className="py-3">
                                    <span className="font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded font-bold">
                                      {cust.points} pts
                                    </span>
                                  </td>
                                  <td className="py-3 text-slate-300">
                                    {cust.allergies && (
                                      <span className="inline-block bg-red-500/20 text-red-300 px-1.5 py-0.5 rounded text-[10px] font-bold mr-1.5">
                                        ⚠️ {cust.allergies}
                                      </span>
                                    )}
                                    <span className="text-[11px] text-slate-400 italic block mt-0.5">{cust.preferences || 'Sin notas especiales'}</span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Public reservation widget & Marketing Trigger simulation */}
                  <div className="space-y-6">
                    
                    {/* Public Reservations Widget snippet */}
                    <div className="glass-panel rounded-2xl p-6 space-y-3">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <MessageSquare className="h-4 w-4 text-emerald-400" /> Widget Reservas Públicas
                      </h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Inserta este widget en la web corporativa de tu restaurante para que los comensales reserven online:
                      </p>
                      <pre className="p-3 bg-slate-950/80 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto border border-white/5">
                        {`<iframe src="${apiUrl}/public-widget?tenantId=${user.tenantId}"></iframe>`}
                      </pre>
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-bold">Aislamiento RLS Protegido</span>
                        <a 
                          href={`${apiUrl}/public-widget?tenantId=${user.tenantId}`} 
                          target="_blank" 
                          rel="noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          Ver Preview Widget ↗
                        </a>
                      </div>
                    </div>

                    {/* Marketing Automation triggers */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-emerald-400" /> Triggers de Automatización
                      </h3>
                      
                      <div className="p-3 bg-slate-900/40 border border-white/5 rounded-xl space-y-3 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-slate-300">Campaña de Reactivación</span>
                          <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[9px] font-bold">Activo</span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">
                          Filtra a los clientes fidelizados con más de 50 puntos y les envía de forma automática un cupón personalizado de reactivación.
                        </p>
                        <button 
                          onClick={handleRunCampaignSimulation}
                          disabled={isCampaignSimulating}
                          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold py-2 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {isCampaignSimulating ? 'Simulando...' : 'Ejecutar Simulación de Trigger'}
                        </button>
                      </div>

                      {/* Simulation Logs */}
                      {campaignLogs.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-[10px] text-slate-400 uppercase font-bold">Logs de Envío de Campaña:</h4>
                          <div className="p-2.5 bg-slate-950 rounded-lg max-h-[140px] overflow-y-auto space-y-2 border border-white/5">
                            {campaignLogs.map((log: any, idx: number) => (
                              <div key={idx} className="text-[11px] font-mono text-indigo-300 leading-snug">
                                {log.msg}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                    </div>

                  </div>

                </div>

              </div>

            )}
          </div>
        )}

        {/* -------------------- TAB 3: FINANCE (PREMIUM PLAN) -------------------- */}
        {activeTab === 'finance' && (
          <div className="relative">
            {!isTierEnough('premium') ? (
              
              /* Lock Screen (Basic / Medium user blocking) */
              <div className="glass-panel rounded-2xl p-12 text-center flex flex-col items-center justify-center min-h-[400px] border border-purple-500/10">
                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-full text-purple-400 mb-6">
                  <Lock className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Módulo: BI predictivo e Informes P&L Bloqueado</h2>
                <p className="text-slate-400 max-w-lg mb-8 text-sm">
                  Esta funcionalidad requiere un plan de suscripción <span className="font-bold text-purple-300">Enterprise BI & Finance (Premium)</span>. Tu plan actual es <span className="font-bold text-slate-300 uppercase">{user.subscriptionTier}</span>.
                </p>
                <button 
                  onClick={() => alert('Simular Upgrades de Suscripción no implementados en este demo.')}
                  className="bg-indigo-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30 text-sm"
                >
                  Solicitar Upgrade a Premium
                </button>
              </div>

            ) : (

              /* Premium / Finance BI Module UI */
              <div className="space-y-6">
                
                {/* Metrics Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-emerald-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Ventas del Mes</span>
                    <span className="text-2xl font-bold text-white block mt-1">
                      {pnlData ? `${parseFloat(pnlData.totalRevenue).toLocaleString('es-ES')} €` : '24.500 €'}
                    </span>
                    <span className="text-[10px] text-emerald-400 mt-1 block">↑ 12.3% vs Mes anterior</span>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-indigo-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Escandallo Medio (Margen)</span>
                    <span className="text-2xl font-bold text-white block mt-1">77.9 %</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Objetivo de cocina: 75.0%</span>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-pink-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Último Descuadre de Caja</span>
                    <span className={`text-2xl font-bold block mt-1 ${closingsList[0] && parseFloat(closingsList[0].discrepancy) !== 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {closingsList[0] ? `${parseFloat(closingsList[0].discrepancy).toFixed(2)} €` : '0.00 €'}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Arqueos auditados vía RLS</span>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-amber-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Predicción Ventas (Próximo Mes)</span>
                    <span className="text-2xl font-bold text-white block mt-1">
                      {pnlData ? `${parseFloat(pnlData.forecastNextMonthRevenue).toLocaleString('es-ES')} €` : '27.800 €'}
                    </span>
                    <span className="text-[10px] text-indigo-400 mt-1 block">Intervalo Confianza: {pnlData?.confidenceInterval || '94.2%'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: P&L Statement & Escandallos */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* P&L Statement */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                        <TrendingUp className="h-5 w-5 text-indigo-400" /> Cuenta P&L Simplificada (Pérdidas y Ganancias del Mes)
                      </h3>
                      <div className="space-y-2.5 text-xs text-slate-300">
                        <div className="flex justify-between pb-1.5 border-b border-white/5 text-slate-400 font-semibold">
                          <span>Línea de Negocio</span>
                          <span>Monto</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ingresos Totales (Mesa + Takeaway)</span>
                          <span className="font-mono text-emerald-400">
                            +{pnlData ? parseFloat(pnlData.totalRevenue).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '24.500,00'} €
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Costes de Alimento (COGS - Food Cost)</span>
                          <span className="font-mono text-red-400">
                            -{pnlData ? parseFloat(pnlData.foodCost).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '6.125,00'} €
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastos de Personal (Nóminas + SS)</span>
                          <span className="font-mono text-red-400">
                            -{pnlData ? parseFloat(pnlData.laborCost).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '9.800,00'} €
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Gastos Operativos (Alquiler, Suministros, Software)</span>
                          <span className="font-mono text-red-400">
                            -{pnlData ? parseFloat(pnlData.otherExpenses).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '3.200,00'} €
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm text-white">
                          <span>Resultado Neto Operativo (Profit)</span>
                          <span className="font-mono text-emerald-400">
                            +{pnlData ? parseFloat(pnlData.netProfit).toLocaleString('es-ES', { minimumFractionDigits: 2 }) : '5.375,00'} €
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Escandallos list */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                        <Coins className="h-5 w-5 text-indigo-400" /> Fichas de Escandallo (Costes e Ingredientes)
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {escandallosList.map((item: any, idx: number) => (
                          <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-white/5 flex flex-col justify-between gap-3">
                            <div>
                              <span className="font-bold text-white block text-xs">{item.recipeName}</span>
                              <span className="text-[10px] text-slate-400 mt-1 block">Coste Proveedor: {item.supplierCost.toFixed(2)}€</span>
                              <span className="text-[10px] text-slate-400 block">PVP Carta: {item.menuPrice.toFixed(2)}€</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-white/5">
                              <span className="text-[9px] uppercase font-bold text-slate-500">Margen Bruto</span>
                              <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold">
                                {item.marginPercent}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Blind Register Closings Form & History */}
                  <div className="space-y-6">
                    
                    {/* Arqueo Form */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <Coins className="h-4 w-4 text-purple-400" /> Arqueo de Caja Ciego
                      </h3>
                      <p className="text-xs text-slate-400 leading-normal">
                        Introduce el total de efectivo contado físicamente en caja. El sistema calculará el descuadre comparándolo automáticamente con las ventas del día registradas vía RLS.
                      </p>
                      <form onSubmit={handleRegisterClosingSubmit} className="space-y-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1 font-semibold uppercase">Efectivo Físico Contado (€)</label>
                          <div className="relative">
                            <input 
                              type="number"
                              step="0.01"
                              required
                              placeholder="Ej. 1450.25"
                              value={actualAmountInput}
                              onChange={(e) => setActualAmountInput(e.target.value)}
                              className="w-full text-xs bg-slate-950/80 border border-white/10 text-white rounded-lg p-2.5 pr-8 focus:outline-none focus:border-purple-500"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-500">€</span>
                          </div>
                        </div>
                        <button 
                          type="submit"
                          disabled={updating}
                          className="w-full bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold py-2.5 rounded-lg transition disabled:opacity-50"
                        >
                          {updating ? 'Procesando...' : 'Cerrar Caja (Arqueo)'}
                        </button>
                      </form>
                    </div>

                    {/* Historical Closings List */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4">
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <History className="h-4 w-4 text-purple-400" /> Historial de Cierres (Auditoría)
                      </h3>
                      <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {closingsList.length === 0 ? (
                          <p className="text-xs text-slate-500 text-center py-4">No hay cierres registrados hoy.</p>
                        ) : (
                          closingsList.map((closing: any) => {
                            const dateStr = new Date(closing.createdAt).toLocaleDateString([], { day: '2-digit', month: '2-digit' });
                            const timeStr = new Date(closing.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            const disc = parseFloat(closing.discrepancy);
                            return (
                              <div key={closing.id} className="p-3 bg-slate-950/60 border border-white/5 rounded-xl text-xs space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] text-slate-500">
                                  <span>{dateStr} a las {timeStr}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${disc === 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {disc === 0 ? 'Cuadrado' : 'Descuadre'}
                                  </span>
                                </div>
                                <div className="grid grid-cols-3 gap-1 text-center pt-1 text-[11px]">
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Contado</span>
                                    <span className="font-semibold text-white">{parseFloat(closing.actualAmount).toFixed(2)}€</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Esperado</span>
                                    <span className="font-semibold text-slate-300">{parseFloat(closing.expectedAmount).toFixed(2)}€</span>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-slate-500 block">Desviación</span>
                                    <span className={`font-mono font-bold ${disc > 0 ? 'text-emerald-400' : disc < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                                      {disc > 0 ? '+' : ''}{disc.toFixed(2)}€
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

            )}
          </div>
        )}

      </main>

    </div>
  );
}
