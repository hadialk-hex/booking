import { pgTable, text, varchar, boolean, serial, pgEnum, timestamp } from "drizzle-orm/pg-core"; 

// تعريف الـ Enums أولاً
export const userRoleEnum = pgEnum("user_role", ["admin", "call_center", "reception", "pending"]);
export const patientTypeEnum = pgEnum("patient_type", ["new", "existing"]);
export const appointmentStatusEnum = pgEnum("appointment_status", ["scheduled", "arrived", "no_show", "no_answer"]);


/**
 * جدول المستخدمين - يدعم ثلاث صلاحيات: admin, call_center, reception
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(), 
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("pending").notNull(), 
  isApproved: boolean("isApproved").default(false).notNull(),
  displayName: varchar("displayName", { length: 255 }),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * جدول الأطباء
 */
export const doctors = pgTable("doctors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  specialization: varchar("specialization", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Doctor = typeof doctors.$inferSelect;
export type InsertDoctor = typeof doctors.$inferInsert;

/**
 * جدول مصادر الحجز
 */
export const bookingSources = pgTable("bookingSources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type BookingSource = typeof bookingSources.$inferSelect;
export type InsertBookingSource = typeof bookingSources.$inferInsert;

/**
 * جدول المواعيد
 */
export const appointments = pgTable("appointments", {
  id: serial("id").primaryKey(),
  // معلومات المريض
  patientName: varchar("patientName", { length: 255 }).notNull(),
  patientPhone: varchar("patientPhone", { length: 50 }).notNull(),
  
  // معلومات الموعد
  appointmentDate: timestamp("appointmentDate", { withTimezone: true }).notNull(),
  appointmentTime: varchar("appointmentTime", { length: 10 }).notNull(),
  
  // معلومات الطبيب
  doctorId: serial("doctorId").notNull(), 
  doctorName: varchar("doctorName", { length: 255 }).notNull(),
  
  // نوع الحجز والمريض
  appointmentType: varchar("appointmentType", { length: 100 }).notNull(),
  patientType: patientTypeEnum("patientType").notNull(),
  
  // مصدر الحجز
  bookingSourceId: serial("bookingSourceId"),
  bookingSourceName: varchar("bookingSourceName", { length: 255 }),
  
  // حالة الحجز
  status: appointmentStatusEnum("status").default("scheduled").notNull(),
  
  // السعر (اختياري)
  price: serial("price"), 
  
  // معلومات الموظف الذي أضاف الحجز
  createdById: serial("createdById").notNull(),
  createdByName: varchar("createdByName", { length: 255 }).notNull(),
  
  // ملاحظات
  notes: text("notes"),
  
  createdAt: timestamp("createdAt", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).defaultNow().notNull(),
});

export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = typeof appointments.$inferInsert;
