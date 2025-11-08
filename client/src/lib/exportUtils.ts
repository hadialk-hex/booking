import * as XLSX from 'xlsx';

/**
 * تصدير المواعيد إلى ملف Excel
 */
export function exportAppointmentsToExcel(appointments: any[], filename: string = 'appointments.xlsx') {
  // تحضير البيانات للتصدير
  const data = appointments.map(apt => ({
    'رقم الحجز': apt.id,
    'اسم المريض': apt.patientName,
    'رقم الهاتف': apt.patientPhone,
    'التاريخ': new Date(apt.appointmentDate).toLocaleDateString('en-GB'),
    'الوقت': apt.appointmentTime,
    'الطبيب': apt.doctorName,
    'نوع الحجز': apt.appointmentType || '-',
    'نوع المريض': apt.patientType === 'new' ? 'عميل جديد' : 'عميل قديم',
    'مصدر الحجز': apt.bookingSourceName || '-',
    'الحالة': getStatusNameForExport(apt.status),
    'المبلغ': apt.price ? `${apt.price} ريال` : '-',
    'تم الحجز بواسطة': apt.createdByName,
    'ملاحظات': apt.notes || '-',
    'تاريخ الإنشاء': new Date(apt.createdAt).toLocaleString('en-GB', { hour12: false })
  }));

  // إنشاء ورقة عمل
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // تعيين عرض الأعمدة
  const columnWidths = [
    { wch: 10 }, // رقم الحجز
    { wch: 20 }, // اسم المريض
    { wch: 15 }, // رقم الهاتف
    { wch: 15 }, // التاريخ
    { wch: 10 }, // الوقت
    { wch: 20 }, // الطبيب
    { wch: 15 }, // نوع الحجز
    { wch: 15 }, // نوع المريض
    { wch: 20 }, // مصدر الحجز
    { wch: 12 }, // الحالة
    { wch: 12 }, // المبلغ
    { wch: 20 }, // تم الحجز بواسطة
    { wch: 30 }, // ملاحظات
    { wch: 20 }  // تاريخ الإنشاء
  ];
  worksheet['!cols'] = columnWidths;

  // إنشاء كتاب عمل
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'المواعيد');

  // تصدير الملف
  XLSX.writeFile(workbook, filename);
}

/**
 * تصدير إحصائيات الموظفين إلى ملف Excel
 */
export function exportStatsToExcel(stats: any[], filename: string = 'employee-stats.xlsx') {
  // تحضير البيانات للتصدير
  const data = stats.map((stat, index) => ({
    'الترتيب': index + 1,
    'اسم الموظف': stat.displayName || stat.userName || 'غير محدد',
    'إجمالي الحجوزات': stat.total,
    'حجوزات اليوم': stat.today
  }));

  // إنشاء ورقة عمل
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // تعيين عرض الأعمدة
  const columnWidths = [
    { wch: 10 }, // الترتيب
    { wch: 25 }, // اسم الموظف
    { wch: 18 }, // إجمالي الحجوزات
    { wch: 15 }  // حجوزات اليوم
  ];
  worksheet['!cols'] = columnWidths;

  // إنشاء كتاب عمل
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'إحصائيات الموظفين');

  // تصدير الملف
  XLSX.writeFile(workbook, filename);
}

/**
 * دالة مساعدة لتحويل حالة الموعد إلى نص عربي
 */
function getStatusNameForExport(status: string): string {
  switch (status) {
    case 'scheduled': return 'محجوز';
    case 'arrived': return 'حضر';
    case 'no_show': return 'لم يحضر';
    case 'no_answer': return 'لم يرد';
    default: return status;
  }
}
