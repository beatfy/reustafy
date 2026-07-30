'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KitchenPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard since kitchen view is disabled per client request (using thermal printer only)
    router.replace('/dashboard');
  }, [router]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <h2 className="text-lg font-bold text-foreground">Modo Cocina desactivado</h2>
      <p className="text-xs text-foreground-muted mt-2">Las comandas se envían directamente a la impresora térmica de cocina por orden de pase.</p>
    </div>
  );
}
