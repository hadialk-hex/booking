import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

/**
 * جدول المستخدمين - يدعم ثلاث صلاحيات: admin, call_center, reception
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "call_center", "reception", "pending"]).default("pending").notNull(),
  isApproved: boolean("isApproved").default(false).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * جدول الأطباء
 */
export const doctors = mysqlTable("doctors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

/**
 * جدول مصادر الحجز
 */
export const bookingSources = mysqlTable("bookingSources", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BookingSource = typeof bookingSources.$inferSelect;
export type InsertBookingSource = typeof bookingSources.$inferInsert;

/**
 * جدول المواعيد
 */
export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  // معلومات المريض
  patientName: varchar("patientName", { length: 255 }).notNull(),
  patientPhone: varchar("patientPhone", { length: 50 }).notNull(),
  
  // معلومات الموعد
  appointmentDate: timestamp("appointmentDate").notNull(),
  appointmentTime: varchar("appointmentTime", { length: 10 }).notNull(),
  
  // معلومات الطبيب
  doctorId: int("doctorId").notNull(),
  doctorName: varchar("doctorName", { length: 255 }).notNull(),
  
  // نوع الحجز والمريض
  appointmentType: varchar("appointmentType", { length: 100 }).notNull(),
  patientType: mysqlEnum("patientType", ["new", "existing"]).notNull(),
  
  // مصدر الحجز
  bookingSourceId: int("bookingSourceId"),
  bookingSourceName: varchar("bookingSourceName", { length: 255 }),
  
  // حالة الحجز
  status: mysqlEnum("status", ["scheduled", "arrived", "no_show", "no_answer"]).default("scheduled").notNull(),
  
  // السعر (اختياري)
  price: int("price"),
  
  // معلومات الموظف الذي أضاف الحجز
  createdById: int("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  
  // ملاحظات
  notes: text("notes"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
