import { EventEmitter } from 'events';

class TenantEventBus extends EventEmitter {}

export const eventBus = new TenantEventBus();

export interface RealtimeEvent {
  type: 'ORDER_CREATED' | 'ORDER_STATUS_UPDATED' | 'ITEM_STATUS_UPDATED' | 'TABLE_STATUS_UPDATED' | 'ORDER_PAYMENT_REGISTERED' | 'ITEM_RECLAIMED';
  tenantId: string;
  payload: any;
  timestamp: string;
}

export function notifyTenant(tenantId: string, type: RealtimeEvent['type'], payload: any) {
  const event: RealtimeEvent = {
    type,
    tenantId,
    payload,
    timestamp: new Date().toISOString()
  };
  eventBus.emit(`tenant:${tenantId}`, event);
}
