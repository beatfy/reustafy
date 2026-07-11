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
  
  // UI states
  const [activeTab, setActiveTab] = useState<'operations' | 'marketing' | 'finance'>('operations');
  const [selectedZone, setSelectedZone] = useState<'all' | 'salon' | 'terrace' | 'bar'>('all');
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [assigningReservation, setAssigningReservation] = useState<Reservation | null>(null);
  
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

      // 3. Fetch activity logs
      const logsRes = await fetch(`${apiUrl}/api/logs`, {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      if (!logsRes.ok) throw new Error('Error al cargar logs');
      const logsData = await logsRes.json();
      setLogsList(logsData);

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

              /* Growth / Marketing Module UI Mockup */
              <div className="glass-panel rounded-2xl p-8 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <UserCheck className="h-6 w-6 text-emerald-400" /> Panel de Fidelización y Automatización de Marketing
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">Herramientas Growth para fidelización de clientes (Inquilino: {user.tenantName}).</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Widget Public Widget Details */}
                  <div className="p-5 rounded-xl bg-slate-900/40 border border-white/5 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <MessageSquare className="h-4 w-4 text-emerald-400" /> Widget Reservas Públicas
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Copia el código script en tu página web corporativa para sincronizar las reservas directamente:
                    </p>
                    <pre className="p-3 bg-slate-950 rounded-lg text-[10px] font-mono text-slate-400 overflow-x-auto border border-white/5">
                      {`<iframe src="http://reustafy.com/widget?tenantId=${user.tenantId}"></iframe>`}
                    </pre>
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-300 px-2 py-0.5 rounded font-bold">API Public Active</span>
                  </div>

                  {/* Customer Allergies / Loyalty profiles */}
                  <div className="p-5 rounded-xl bg-slate-900/40 border border-white/5 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Star className="h-4 w-4 text-emerald-400" /> Historial y Preferencias
                    </h3>
                    <div className="space-y-2">
                      <div className="p-2 bg-slate-950 rounded text-xs">
                        <span className="font-semibold block text-slate-300">Lucía Pérez</span>
                        <span className="text-[10px] text-red-400 font-bold block mt-0.5">Alergia: Marisco y Gluten</span>
                      </div>
                      <div className="p-2 bg-slate-950 rounded text-xs">
                        <span className="font-semibold block text-slate-300">Marcos Gómez</span>
                        <span className="text-[10px] text-indigo-300 font-bold block mt-0.5">Prefiere mesa en Terraza</span>
                      </div>
                    </div>
                  </div>

                  {/* Automation triggers */}
                  <div className="p-5 rounded-xl bg-slate-900/40 border border-white/5 space-y-3">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Clock className="h-4 w-4 text-emerald-400" /> Automatizaciones Activas
                    </h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Trigger: 30 Días Inactivo</span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">Activo</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Trigger: Cumpleaños Cliente</span>
                        <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded text-[10px]">Activo</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-normal pt-2 border-t border-white/5">
                        Envía correos electrónicos de reactivación y cupones de fidelidad de manera automatizada.
                      </p>
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
                    <span className="text-2xl font-bold text-white block mt-1">24.500 €</span>
                    <span className="text-[10px] text-emerald-400 mt-1 block">↑ 12.3% vs Mes anterior</span>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-indigo-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Escandallo Medio (Margen)</span>
                    <span className="text-2xl font-bold text-white block mt-1">77.9 %</span>
                    <span className="text-[10px] text-slate-400 mt-1 block">Objetivo de cocina: 75.0%</span>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-pink-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Arqueos Ciegos (Desviación)</span>
                    <span className="text-2xl font-bold text-white block mt-1">0.12 %</span>
                    <span className="text-[10px] text-emerald-400 mt-1 block">Dentro del umbral de confianza</span>
                  </div>
                  <div className="glass-panel rounded-xl p-5 border-l-4 border-amber-400">
                    <span className="text-xs font-semibold text-slate-400 uppercase block">Predicción Ventas (Próximo Mes)</span>
                    <span className="text-2xl font-bold text-white block mt-1">27.800 €</span>
                    <span className="text-[10px] text-indigo-400 mt-1 block">Confianza predictiva: 94.2%</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* P&L statement */}
                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <TrendingUp className="h-5 w-5 text-indigo-400" /> Cuenta P&L Simplificada (Pérdidas y Ganancias)
                    </h3>
                    <div className="space-y-2.5 text-xs text-slate-300">
                      <div className="flex justify-between pb-1.5 border-b border-white/5 text-slate-400 font-semibold">
                        <span>Línea de Negocio</span>
                        <span>Monto</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ingresos Totales (Mesa + Takeaway)</span>
                        <span className="font-mono text-emerald-400">+24.500,00 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Costes de Alimento (COGS)</span>
                        <span className="font-mono text-red-400">-6.125,00 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gastos de Personal (Nóminas + SS)</span>
                        <span className="font-mono text-red-400">-9.800,00 €</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gastos Operativos (Luz, Alquiler, Software)</span>
                        <span className="font-mono text-red-400">-3.200,00 €</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm text-white">
                        <span>Resultado Neto Operativo (Profit)</span>
                        <span className="font-mono">+5.375,00 €</span>
                      </div>
                    </div>
                  </div>

                  {/* Escandallos list */}
                  <div className="glass-panel rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-white flex items-center gap-1.5 text-sm">
                      <Coins className="h-5 w-5 text-indigo-400" /> Fichas de Escandallo (Costo vs Proveedor)
                    </h3>
                    <div className="space-y-3">
                      
                      <div className="p-3 rounded bg-slate-900/60 border border-white/5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">Solomillo al Whisky</span>
                          <span className="text-[10px] text-slate-400">Costo Proveedor: 4.20€ • Venta: 14.50€</span>
                        </div>
                        <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Margen: 71.0%</span>
                      </div>

                      <div className="p-3 rounded bg-slate-900/60 border border-white/5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">Patatas Bravas</span>
                          <span className="text-[10px] text-slate-400">Costo Proveedor: 0.80€ • Venta: 6.50€</span>
                        </div>
                        <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Margen: 87.7%</span>
                      </div>

                      <div className="p-3 rounded bg-slate-900/60 border border-white/5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-white block">Hamburguesa Gourmet</span>
                          <span className="text-[10px] text-slate-400">Costo Proveedor: 3.50€ • Venta: 14.00€</span>
                        </div>
                        <span className="font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-bold">Margen: 75.0%</span>
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
