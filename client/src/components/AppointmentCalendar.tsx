import { useState, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Appointment {
  id: number;
  patientName: string;
  doctorId: number;
  doctorName: string;
  appointmentDate: Date;
  appointmentTime: string;
  status: string;
}

interface AppointmentCalendarProps {
  appointments: Appointment[];
  doctors: Array<{ id: number; name: string }>;
  onTimeSlotClick?: (doctorId: number, date: Date, time: string) => void;
}

const timeSlots = [
  '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
  '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
  '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
  '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM',
  '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM',
  '04:00 PM', '04:15 PM', '04:30 PM', '04:45 PM',
  '05:00 PM', '05:15 PM', '05:30 PM', '05:45 PM',
  '06:00 PM', '06:15 PM', '06:30 PM', '06:45 PM',
  '07:00 PM', '07:15 PM', '07:30 PM', '07:45 PM',
  '08:00 PM', '08:15 PM', '08:30 PM', '08:45 PM',
  '09:00 PM', '09:15 PM', '09:30 PM', '09:45 PM',
  '10:00 PM'
];

export default function AppointmentCalendar({ appointments, doctors, onTimeSlotClick }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  // الحصول على تواريخ الأسبوع
  const getWeekDates = (date: Date) => {
    const dates = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // البداية من الأحد
    
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(startOfWeek);
      currentDate.setDate(startOfWeek.getDate() + i);
      dates.push(currentDate);
    }
    return dates;
  };

  const weekDates = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const displayDates = viewMode === 'week' ? weekDates : [selectedDate];

  // تحويل الوقت من AM/PM إلى 24 ساعة
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');
    
    if (hours === '12') {
      hours = modifier === 'AM' ? '00' : '12';
    } else if (modifier === 'PM') {
      hours = String(parseInt(hours, 10) + 12);
    }
    
    return `${hours.padStart(2, '0')}:${minutes}`;
  };

  // التحقق من وجود موعد في وقت معين
  const getAppointmentForSlot = (doctorId: number, date: Date, time: string) => {
    const time24 = convertTo24Hour(time);
    return appointments.find(apt => {
      const aptDate = new Date(apt.appointmentDate);
      const aptTime24 = apt.appointmentTime.includes(':') ? apt.appointmentTime.substring(0, 5) : apt.appointmentTime;
      return (
        apt.doctorId === doctorId &&
        aptDate.toDateString() === date.toDateString() &&
        aptTime24 === time24
      );
    });
  };

  // التنقل بين التواريخ
  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'day') {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 1 : -1));
    } else {
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
    }
    setSelectedDate(newDate);
  };

  // تنسيق التاريخ (ميلادي)
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatShortDate = (date: Date) => {
    return date.toLocaleDateString('en-GB', { 
      weekday: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="p-6">
      {/* رأس التقويم */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <CalendarIcon className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">تقويم المواعيد</h2>
        </div>
        
        <div className="flex items-center gap-4">
          {/* أزرار التبديل بين العرض اليومي والأسبوعي */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
            >
              يوم
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
            >
              أسبوع
            </Button>
          </div>

          {/* أزرار التنقل */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('prev')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              onClick={() => setSelectedDate(new Date())}
            >
              اليوم
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigateDate('next')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* عرض التاريخ الحالي */}
      <div className="text-center mb-6">
        <p className="text-lg font-semibold text-gray-700">
          {viewMode === 'day' 
            ? formatDate(selectedDate)
            : `${formatShortDate(weekDates[0])} - ${formatShortDate(weekDates[6])}`
          }
        </p>
      </div>

      {/* جدول التقويم */}
      <div className="overflow-x-auto" dir="rtl">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 p-3 text-right font-semibold sticky right-0 z-10">
                الطبيب / الوقت
              </th>
              {displayDates.map((date, idx) => (
                <th 
                  key={idx} 
                  className="border border-gray-300 bg-gray-100 p-3 text-center font-semibold min-w-[120px]"
                >
                  {viewMode === 'week' ? formatShortDate(date) : 'المواعيد'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {doctors.map((doctor) => (
              <tr key={doctor.id}>
                <td className="border border-gray-300 bg-gray-50 p-3 font-semibold sticky right-0 z-10">
                  {doctor.name}
                </td>
                {displayDates.map((date, dateIdx) => (
                  <td key={dateIdx} className="border border-gray-300 p-2 align-top">
                    <div className="space-y-1 max-h-[400px] overflow-y-auto">
                      {timeSlots.map((time) => {
                        const appointment = getAppointmentForSlot(doctor.id, date, time);
                        const isBooked = !!appointment;
                        
                        return (
                          <button
                            key={time}
                            onClick={() => {
                              if (!isBooked && onTimeSlotClick) {
                                onTimeSlotClick(doctor.id, date, time);
                              }
                            }}
                            className={`
                              w-full text-xs p-2 rounded text-right transition-colors
                              ${isBooked 
                                ? 'bg-red-100 text-red-800 border border-red-300 cursor-not-allowed' 
                                : 'bg-green-50 text-green-800 border border-green-300 hover:bg-green-100 cursor-pointer'
                              }
                            `}
                            disabled={isBooked}
                            title={isBooked ? `محجوز: ${appointment.patientName}` : 'متاح للحجز'}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{time}</span>
                              {isBooked && (
                                <span className="text-[10px] truncate max-w-[80px]">
                                  {appointment.patientName}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* مفتاح التقويم */}
      <div className="flex items-center justify-center gap-6 mt-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
          <span>متاح</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
          <span>محجوز</span>
        </div>
      </div>
    </Card>
  );
}
