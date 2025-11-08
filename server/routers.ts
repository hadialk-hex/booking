import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";

// Middleware للتحقق من صلاحية الأدمن
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

// Middleware للتحقق من صلاحية الكول سنتر أو الأدمن
const callCenterProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'call_center' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Call center access required' });
  }
  return next({ ctx });
});

// Middleware للتحقق من صلاحية الرسبشن أو الأدمن
const receptionProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'reception' && ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Reception access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    setupName: protectedProcedure
      .input(z.object({ displayName: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        await db.updateUserDisplayName(ctx.user.id, input.displayName);
        return { success: true };
      }),
  }),

  // ===== إدارة الأطباء =====
  doctors: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllDoctors();
    }),
    
    listActive: protectedProcedure.query(async () => {
      return await db.getActiveDoctors();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
        specialization: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await db.createDoctor(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        specialization: z.string().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateDoctor(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteDoctor(input.id);
        return { success: true };
      }),
  }),

  // ===== إدارة مصادر الحجز =====
  bookingSources: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllBookingSources();
    }),
    
    listActive: protectedProcedure.query(async () => {
      return await db.getActiveBookingSources();
    }),

    create: adminProcedure
      .input(z.object({
        name: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await db.createBookingSource(input);
        return { success: true };
      }),

    update: adminProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateBookingSource(id, data);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteBookingSource(input.id);
        return { success: true };
      }),
  }),

  // ===== إدارة المواعيد =====
  appointments: router({
    // الحصول على جميع المواعيد (للأدمن والرسبشن)
    listAll: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'call_center') {
        throw new TRPCError({ code: 'FORBIDDEN', message: 'Access denied' });
      }
      return await db.getAllAppointments();
    }),

    // الحصول على جميع المواعيد للكول سنتر (لعرض الجدول)
    listAllForSchedule: callCenterProcedure.query(async () => {
      return await db.getAllAppointments();
    }),

    // الحصول على مواعيد المستخدم الحالي (للكول سنتر)
    listMine: callCenterProcedure.query(async ({ ctx }) => {
      return await db.getAppointmentsByUserId(ctx.user.id);
    }),

    // إنشاء موعد جديد
    create: callCenterProcedure
      .input(z.object({
        patientName: z.string().min(1),
        patientPhone: z.string().min(1),
        appointmentDate: z.date(),
        appointmentTime: z.string(),
        doctorId: z.number(),
        doctorName: z.string(),
        appointmentType: z.string(),
        patientType: z.enum(["new", "existing"]),
        bookingSourceId: z.number().optional(),
        bookingSourceName: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // التحقق من عدم وجود حجز متضارب
        const conflictingAppointments = await db.checkConflictingAppointment(
          input.doctorId,
          input.appointmentDate,
          input.appointmentTime
        );
        
        if (conflictingAppointments.length > 0) {
          throw new TRPCError({ 
            code: 'CONFLICT', 
            message: 'APPOINTMENT_CONFLICT'
          });
        }
        
        await db.createAppointment({
          ...input,
          createdById: ctx.user.id,
          createdByName: ctx.user.displayName || ctx.user.name || 'Unknown',
          status: 'scheduled',
        });
        return { success: true };
      }),

    // تحديث موعد
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        patientName: z.string().optional(),
        patientPhone: z.string().optional(),
        appointmentDate: z.date().optional(),
        appointmentTime: z.string().optional(),
        doctorId: z.number().optional(),
        doctorName: z.string().optional(),
        appointmentType: z.string().optional(),
        patientType: z.enum(["new", "existing"]).optional(),
        bookingSourceId: z.number().optional(),
        bookingSourceName: z.string().optional(),
        status: z.enum(["scheduled", "arrived", "no_show", "no_answer"]).optional(),
        price: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // التحقق من الصلاحيات
        if (ctx.user.role === 'call_center') {
          // الكول سنتر يمكنه تعديل حجوزاته فقط
          const appointments = await db.getAppointmentsByUserId(ctx.user.id);
          const appointment = appointments.find(a => a.id === id);
          if (!appointment) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only edit your own appointments' });
          }
        }
        
        // إذا تم تغيير الطبيب أو التاريخ أو الوقت، نتحقق من عدم التضارب
        if (data.doctorId !== undefined || data.appointmentDate !== undefined || data.appointmentTime !== undefined) {
          // نحتاج للحصول على الموعد الحالي للحصول على القيم الأصلية
          const allAppointments = await db.getAllAppointments();
          const currentAppointment = allAppointments.find(a => a.id === id);
          
          if (currentAppointment) {
            const checkDoctorId = data.doctorId !== undefined ? data.doctorId : currentAppointment.doctorId;
            const checkDate = data.appointmentDate !== undefined ? data.appointmentDate : currentAppointment.appointmentDate;
            const checkTime = data.appointmentTime !== undefined ? data.appointmentTime : currentAppointment.appointmentTime;
            
            const conflictingAppointments = await db.checkConflictingAppointment(
              checkDoctorId,
              checkDate,
              checkTime,
              id // استبعاد الموعد الحالي
            );
            
            if (conflictingAppointments.length > 0) {
              throw new TRPCError({ 
                code: 'CONFLICT', 
                message: 'APPOINTMENT_CONFLICT'
              });
            }
          }
        }
        
        await db.updateAppointment(id, data);
        return { success: true };
      }),

    // حذف موعد
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // التحقق من الصلاحيات
        if (ctx.user.role === 'call_center') {
          const appointments = await db.getAppointmentsByUserId(ctx.user.id);
          const appointment = appointments.find(a => a.id === input.id);
          if (!appointment) {
            throw new TRPCError({ code: 'FORBIDDEN', message: 'You can only delete your own appointments' });
          }
        }
        
        await db.deleteAppointment(input.id);
        return { success: true };
      }),
  }),

  // ===== الإحصائيات =====
  stats: router({
    // إحصائيات المستخدم الحالي
    mine: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserStats(ctx.user.id);
    }),

    // إحصائيات جميع المستخدمين (لجميع المستخدمين المصرح لهم)
    all: protectedProcedure.query(async () => {
      return await db.getAllUsersStats();
    }),
  }),

  // ===== إدارة المستخدمين (للأدمن فقط) =====
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),

    pending: adminProcedure.query(async () => {
      return await db.getPendingUsers();
    }),

    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "call_center", "reception"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    approve: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(["admin", "call_center", "reception"]),
      }))
      .mutation(async ({ input }) => {
        await db.approveUser(input.userId, input.role);
        return { success: true };
      }),

    updateName: adminProcedure
      .input(z.object({
        userId: z.number(),
        displayName: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserDisplayName(input.userId, input.displayName);
        return { success: true };
      }),

    delete: adminProcedure
      .input(z.object({
        userId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        // منع الأدمن من حذف نفسه
        if (input.userId === ctx.user.id) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Cannot delete your own account',
          });
        }
        await db.deleteUser(input.userId);
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
