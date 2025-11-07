import {
  pgTable,
  varchar,
  text,
  timestamp,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";

// ============================================================
// Companies (회사 관리)
// ============================================================

export const companyTypeEnum = pgEnum("company_type", ["owner", "bp", "ep"]);

export const companies = pgTable("companies", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  businessNumber: varchar("business_number", { length: 50 }),
  companyType: companyTypeEnum("company_type").notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 100 }),
  contactPerson: varchar("contact_person", { length: 100 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

// ============================================================
// Location Logs (위치 추적)
// ============================================================

export const locationLogs = pgTable("location_logs", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workerId: varchar("worker_id", { length: 64 }),
  equipmentId: varchar("equipment_id", { length: 64 }),
  latitude: decimal("latitude", { precision: 10, scale: 8 }).notNull(),
  longitude: decimal("longitude", { precision: 11, scale: 8 }).notNull(),
  accuracy: decimal("accuracy", { precision: 10, scale: 2 }),
  loggedAt: timestamp("logged_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export type LocationLog = typeof locationLogs.$inferSelect;
export type InsertLocationLog = typeof locationLogs.$inferInsert;

// ============================================================
// Emergency Alerts (긴급 상황)
// ============================================================

export const emergencyStatusEnum = pgEnum("emergency_status", ["active", "resolved", "false_alarm"]);

export const emergencyAlerts = pgTable("emergency_alerts", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workerId: varchar("worker_id", { length: 64 }),
  equipmentId: varchar("equipment_id", { length: 64 }),
  alertType: varchar("alert_type", { length: 50 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 8 }),
  longitude: decimal("longitude", { precision: 11, scale: 8 }),
  description: text("description"),
  status: emergencyStatusEnum("status").default("active"),
  resolvedBy: varchar("resolved_by", { length: 64 }),
  resolvedAt: timestamp("resolved_at"),
  resolutionNote: text("resolution_note"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type EmergencyAlert = typeof emergencyAlerts.$inferSelect;
export type InsertEmergencyAlert = typeof emergencyAlerts.$inferInsert;

// ============================================================
// Work Sessions (작업 세션)
// ============================================================

export const sessionTypeEnum = pgEnum("session_type", ["work", "break", "overtime"]);

export const workSessions = pgTable("work_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  workerId: varchar("worker_id", { length: 64 }),
  equipmentId: varchar("equipment_id", { length: 64 }),
  sessionType: sessionTypeEnum("session_type").default("work"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  durationMinutes: varchar("duration_minutes", { length: 10 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type WorkSession = typeof workSessions.$inferSelect;
export type InsertWorkSession = typeof workSessions.$inferInsert;

