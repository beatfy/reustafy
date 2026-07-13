'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Sparkles, LogIn, LayoutGrid, Users, Utensils, Star } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [backendUrl, setBackendUrl] = useState('http://localhost:3001');

  useEffect(() => {
    // Build-time env variable takes precedence (set in Railway dashboard)
    const envUrl = process.env.NEXT_PUBLIC_API_URL;
    if (envUrl) {
      setBackendUrl(envUrl);
      return;
    }
    // Fallback for local dev: replace port 3000 → 3001
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      // Production without env var: show warning but still let admin configure it
      console.warn('[Reustafy] NEXT_PUBLIC_API_URL is not set. Configure it in Railway → Variables.');
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Save token and info
      localStorage.setItem('reustafy_token', data.token);
      localStorage.setItem('reustafy_user', JSON.stringify(data.user));
      localStorage.setItem('reustafy_api_url', backendUrl);

      // Redirect to Dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor backend');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (presetEmail: string) => {
    setEmail(presetEmail);
    // Submit login using preset
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: presetEmail, password: 'password123' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      localStorage.setItem('reustafy_token', data.token);
      localStorage.setItem('reustafy_user', JSON.stringify(data.user));
      localStorage.setItem('reustafy_api_url', backendUrl);

      router.push('/dashboard');
    } catch (err: any) {
      setError(`Error en Quick Login: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-height-screen flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden" style={{ minHeight: '100vh' }}>
      
      {/* Background Neon Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[120px] animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px]"></div>

      <div className="z-10 w-full max-w-5xl flex flex-col items-center text-center">
        
        {/* Header Logo */}
        <div className="flex items-center space-x-2 mb-4 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <span className="text-sm font-semibold tracking-wider text-slate-300 uppercase">Arquitectura Enterprise Multi-Tenant</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-2">
          Reusta<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-pink-500">fy</span>
        </h1>
        <p className="text-slate-400 text-lg md:text-xl max-w-2xl mb-12">
          Gestión integral de restaurantes con aislamiento RLS a nivel de base de datos PostgreSQL y control estricto de suscripción por módulos.
        </p>

        {/* Two Columns: Login and Preset Switcher */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 w-full text-left items-stretch">
          
          {/* Preset Selector */}
          <div className="md:col-span-7 glass-panel rounded-2xl p-6 md:p-8 flex flex-col justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <Users className="h-6 w-6 text-indigo-400" />
                Simulador Multi-Tenant RLS
              </h2>
              <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                Selecciona uno de los siguientes inquilinos de prueba. Cada uno tiene acceso exclusivo a sus datos en la base de datos común de PostgreSQL y cuenta con un plan de suscripción diferente.
              </p>

              <div className="space-y-4">
                
                {/* Don Curro (Basic) */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition duration-200 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  onClick={() => quickLogin('carlos@doncurro.com')}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Inquilino A: Don Curro</span>
                      <span className="text-[10px] uppercase bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full border border-amber-500/30">Plan Básico</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Ubicación de datos: RLS aislado. Módulos de Marketing y Finanzas bloqueados.</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Carlos Admin (carlos@doncurro.com)</span>
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Waiter Juan</span>
                    </div>
                  </div>
                  <button className="text-xs bg-indigo-600/80 text-white font-semibold py-1.5 px-3 rounded-lg hover:bg-indigo-600 transition flex items-center gap-1 self-end sm:self-center">
                    Entrar <LogIn className="h-3 w-3" />
                  </button>
                </div>

                {/* Le Gourmet (Premium) */}
                <div className="p-4 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition duration-200 cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
                  onClick={() => quickLogin('sophia@legourmet.com')}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">Inquilino B: Le Gourmet</span>
                      <span className="text-[10px] uppercase bg-purple-500/20 text-purple-300 font-bold px-2 py-0.5 rounded-full border border-purple-500/30 flex items-center gap-0.5">
                        <Star className="h-2 w-2 fill-purple-300" /> Plan Premium
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Ubicación de datos: RLS aislado. Acceso total a analítica predictiva, P&L y escandallos.</p>
                    <div className="flex gap-2 mt-2">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">Sophia Owner (sophia@legourmet.com)</span>
                    </div>
                  </div>
                  <button className="text-xs bg-indigo-600/80 text-white font-semibold py-1.5 px-3 rounded-lg hover:bg-indigo-600 transition flex items-center gap-1 self-end sm:self-center">
                    Entrar <LogIn className="h-3 w-3" />
                  </button>
                </div>

              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1"><Shield className="h-3.5 w-3.5 text-emerald-400" /> PostgreSQL RLS Activado</span>
              <span>Backend en Puerto: 3001</span>
            </div>

          </div>

          {/* Regular Login Form */}
          <div className="md:col-span-5 glass-panel rounded-2xl p-6 md:p-8 flex flex-col justify-between">
            <form onSubmit={handleLogin} className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-2">Acceso Regular</h3>
              <p className="text-xs text-slate-400 mb-4">
                Inicia sesión manualmente si has creado tu propio tenant.
              </p>

              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-300">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Servidor de API</label>
                <input
                  type="text"
                  required
                  value={backendUrl}
                  onChange={(e) => setBackendUrl(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@restaurante.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wider">Contraseña</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-900/60 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-300 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition duration-200 flex items-center justify-center gap-2 text-sm"
              >
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
                <LogIn className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-6 pt-4 border-t border-white/5 text-center text-[10px] text-slate-500">
              Contraseña por defecto en seeds: <span className="font-mono text-slate-400">password123</span>
            </div>
          </div>

        </div>

        {/* Feature Highlights Footer */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 w-full text-center">
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md">
            <LayoutGrid className="mx-auto h-5 w-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">UI Responsive</h4>
            <p className="text-[10px] text-slate-500">Floor map y KDS PWA adaptados a tablet/móvil.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md">
            <Shield className="mx-auto h-5 w-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Aislamiento RLS</h4>
            <p className="text-[10px] text-slate-500">Separación estricta de base de datos a nivel de SQL.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md">
            <Utensils className="mx-auto h-5 w-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">KDS & Camarero</h4>
            <p className="text-[10px] text-slate-500">Gestión de comandas y estado de mesa interactivos.</p>
          </div>
          <div className="p-4 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md">
            <Star className="mx-auto h-5 w-5 text-indigo-400 mb-2" />
            <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-1">Módulos Capados</h4>
            <p className="text-[10px] text-slate-500">Protección a nivel de API/UI por suscripción.</p>
          </div>
        </div>

      </div>
    </main>
  );
}
