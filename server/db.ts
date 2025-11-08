import { eq, and, gte, lte, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, doctors, appointments, bookingSources, InsertDoctor, InsertAppointment, InsertBookingSource } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    
    // تعيين الدور والموافقة - فقط للمستخدمين الجدد
    if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
      values.isApproved = true;
      updateSet.isApproved = true;
    } else {
      // المستخدمون الجدد فقط يحتاجون لموافقة
      values.role = 'pending';
      values.isApproved = false;
      // لا نضيفهما إلى updateSet حتى لا نعيد تعيينهما عند التحديث
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserDisplayName(userId: number, displayName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ displayName }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: number, role: "admin" | "call_center" | "reception" | "pending") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role, isApproved: role !== 'pending' }).where(eq(users.id, userId));
}

export async function approveUser(userId: number, role: "admin" | "call_center" | "reception") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role, isApproved: true }).where(eq(users.id, userId));
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.isApproved, true)).orderBy(desc(users.createdAt));
}

export async function getPendingUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).where(eq(users.isApproved, false)).orderBy(desc(users.createdAt));
}

// ===== دوال الأطباء =====

export async function getAllDoctors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(doctors).orderBy(desc(doctors.createdAt));
}

export async function getActiveDoctors() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(doctors).where(eq(doctors.isActive, true)).orderBy(doctors.name);
}

export async function createDoctor(doctor: InsertDoctor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(doctors).values(doctor);
  return result;
}

export async function updateDoctor(id: number, doctor: Partial<InsertDoctor>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(doctors).set(doctor).where(eq(doctors.id, id));
}

export async function deleteDoctor(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(doctors).where(eq(doctors.id, id));
}

// ===== دوال المواعيد =====

export async function getAllAppointments() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(appointments).orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
}

export async function getAppointmentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(appointments).where(eq(appointments.createdById, userId)).orderBy(desc(appointments.appointmentDate), desc(appointments.appointmentTime));
}

export async function getAppointmentsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(appointments)
    .where(and(
      gte(appointments.appointmentDate, startDate),
      lte(appointments.appointmentDate, endDate)
    ))
    .orderBy(appointments.appointmentDate, appointments.appointmentTime);
}

export async function checkConflictingAppointment(doctorId: number, appointmentDate: Date, appointmentTime: string, excludeId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  let query = db.select()
    .from(appointments)
    .where(
      and(
        eq(appointments.doctorId, doctorId),
        gte(appointments.appointmentDate, startOfDay),
        lte(appointments.appointmentDate, endOfDay),
        eq(appointments.appointmentTime, appointmentTime)
      )
    );
  
  const results = await query;
  
  // إذا كان هناك excludeId، نستبعد هذا الموعد من النتائج (للتحديث)
  if (excludeId) {
    return results.filter(a => a.id !== excludeId);
  }
  
  return results;
}

export async function createAppointment(appointment: InsertAppointment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(appointments).values(appointment);
  return result;
}

export async function updateAppointment(id: number, appointment: Partial<InsertAppointment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(appointments).set(appointment).where(eq(appointments.id, id));
}

export async function deleteAppointment(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(appointments).where(eq(appointments.id, id));
}

// ===== دوال الإحصائيات =====

export async function getUserStats(userId: number) {
  const db = await getDb();
  if (!db) return { total: 0, today: 0 };
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [totalResult] = await db.select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(eq(appointments.createdById, userId));

  const [todayResult] = await db.select({ count: sql<number>`count(*)` })
    .from(appointments)
    .where(and(
      eq(appointments.createdById, userId),
      gte(appointments.appointmentDate, today),
      lte(appointments.appointmentDate, tomorrow)
    ));

  return {
    total: Number(totalResult?.count || 0),
    today: Number(todayResult?.count || 0)
  };
}

export async function getAllUsersStats() {
  const db = await getDb();
  if (!db) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const result = await db.select({
    userId: appointments.createdById,
    userName: sql<string>`MAX(${appointments.createdByName})`,
    displayName: users.displayName,
    total: sql<number>`count(*)`,
    today: sql<number>`sum(case when ${appointments.appointmentDate} >= ${today} and ${appointments.appointmentDate} < ${tomorrow} then 1 else 0 end)`
  })
  .from(appointments)
  .leftJoin(users, eq(appointments.createdById, users.id))
  .groupBy(appointments.createdById, users.displayName)
  .orderBy(desc(sql`count(*)`));

  return result.map(r => ({
    userId: r.userId,
    userName: r.userName,
    displayName: r.displayName,
    total: Number(r.total || 0),
    today: Number(r.today || 0)
  }));
}

export async function deleteUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // حذف جميع حجوزات المستخدم أولاً
  await db.delete(appointments).where(eq(appointments.createdById, userId));
  
  // ثم حذف المستخدم
  await db.delete(users).where(eq(users.id, userId));
}


// ===== دوال مصادر الحجز =====

export async function createBookingSource(data: InsertBookingSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(bookingSources).values(data);
  return result;
}

export async function getAllBookingSources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookingSources).orderBy(desc(bookingSources.createdAt));
}

export async function getActiveBookingSources() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(bookingSources).where(eq(bookingSources.isActive, true)).orderBy(bookingSources.name);
}

export async function updateBookingSource(id: number, data: Partial<InsertBookingSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(bookingSources).set(data).where(eq(bookingSources.id, id));
}

export async function deleteBookingSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(bookingSources).where(eq(bookingSources.id, id));
}
