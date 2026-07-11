import { 
  pgTable, 
  uuid, 
  varchar, 
  timestamp, 
  boolean, 
  integer, 
  decimal, 
  text, 
  pgEnum, 
  uniqueIndex 
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Enums
export const subscriptionTierEnum = pgEnum('subscription_tier_enum', ['basic', 'medium', 'premium']);
export const userRoleEnum = pgEnum('user_role_enum', ['admin', 'manager', 'waiter', 'kitchen']);
export const tableZoneEnum = pgEnum('table_zone_enum', ['salon', 'terrace', 'bar']);
export const tableStatusEnum = pgEnum('table_status_enum', ['free', 'ordered', 'eating', 'bill', 'reserved']);
export const orderStatusEnum = pgEnum('order_status_enum', ['pending', 'cooking', 'served', 'paid']);
export const orderItemStatusEnum = pgEnum('order_item_status_enum', ['pending', 'cooking', 'served']);
export const reservationStatusEnum = pgEnum('reservation_status_enum', ['pending', 'confirmed', 'cancelled', 'seated']);

// 2. Tenants Table
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  subscriptionTier: subscriptionTierEnum('subscription_tier').notNull().default('basic'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// 3. Users Table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: userRoleEnum('role').notNull().default('waiter'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// 4. Tables Table
export const tables = pgTable('tables', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tableNumber: varchar('table_number', { length: 50 }).notNull(),
  zone: tableZoneEnum('zone').notNull().default('salon'),
  status: tableStatusEnum('status').notNull().default('free'),
  capacity: integer('capacity').notNull().default(4)
}, (table) => {
  return {
    tenantTableIdx: uniqueIndex('tables_tenant_number_idx').on(table.tenantId, table.tableNumber)
  };
});

// 5. Orders Table
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
  waiterId: uuid('waiter_id').references(() => users.id, { onDelete: 'set null' }),
  status: orderStatusEnum('status').notNull().default('pending'),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow()
});

// 6. Order Items Table
export const orderItems = pgTable('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  orderId: uuid('order_id').notNull().references(() => orders.id, { onDelete: 'cascade' }),
  itemName: varchar('item_name', { length: 255 }).notNull(),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  status: orderItemStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// 7. Reservations Table
export const reservations = pgTable('reservations', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  partySize: integer('party_size').notNull(),
  reservationTime: timestamp('reservation_time', { withTimezone: true }).notNull(),
  tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
  status: reservationStatusEnum('status').notNull().default('pending'),
  allergies: varchar('allergies', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// 8. Activity Logs Table
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  actionDescription: text('action_description').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow()
});

// 9. Customers Table
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  points: integer('points').notNull().default(0),
  allergies: varchar('allergies', { length: 255 }),
  preferences: text('preferences'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
}, (table) => {
  return {
    tenantEmailIdx: uniqueIndex('customers_tenant_email_idx').on(table.tenantId, table.email)
  };
});

// 10. Register Closings Table
export const registerClosings = pgTable('register_closings', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  expectedAmount: decimal('expected_amount', { precision: 10, scale: 2 }).notNull(),
  actualAmount: decimal('actual_amount', { precision: 10, scale: 2 }).notNull(),
  discrepancy: decimal('discrepancy', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow()
});

// Relations Definitions (Drizzle ORM helper)
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  tables: many(tables),
  orders: many(orders),
  reservations: many(reservations),
  activityLogs: many(activityLogs),
  customers: many(customers),
  registerClosings: many(registerClosings)
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  orders: many(orders),
  activityLogs: many(activityLogs)
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  tenant: one(tenants, { fields: [tables.tenantId], references: [tenants.id] }),
  orders: many(orders),
  reservations: many(reservations)
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  tenant: one(tenants, { fields: [orders.tenantId], references: [tenants.id] }),
  table: one(tables, { fields: [orders.tableId], references: [tables.id] }),
  waiter: one(users, { fields: [orders.waiterId], references: [users.id] }),
  items: many(orderItems)
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  tenant: one(tenants, { fields: [orderItems.tenantId], references: [tenants.id] }),
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] })
}));

export const reservationsRelations = relations(reservations, ({ one }) => ({
  tenant: one(tenants, { fields: [reservations.tenantId], references: [tenants.id] }),
  table: one(tables, { fields: [reservations.tableId], references: [tables.id] })
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  tenant: one(tenants, { fields: [activityLogs.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [activityLogs.userId], references: [users.id] })
}));

export const customersRelations = relations(customers, ({ one }) => ({
  tenant: one(tenants, { fields: [customers.tenantId], references: [tenants.id] })
}));

export const registerClosingsRelations = relations(registerClosings, ({ one }) => ({
  tenant: one(tenants, { fields: [registerClosings.tenantId], references: [tenants.id] }),
  user: one(users, { fields: [registerClosings.userId], references: [users.id] })
}));
