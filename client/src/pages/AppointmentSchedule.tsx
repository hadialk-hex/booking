import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Calendar as CalendarIcon } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

// توليد الأوقات من 10 صباحاً إلى 10 مساءً بفاصل 15 دقيقة
const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 10; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const isPM = hour >= 12;
      const displayHour = hour > 12 ? hour - 12 : hour;
      const displayTime = `${displayHour}:${minute.toString().padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
      slots.push({ time, displayTime });
    }
  }
  return slots;
};

export default function AppointmentSchedule() {
  const [, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [prefilledData, setPrefilledData] = useState<{
    doctorId: number;
    doctorName: string;
    date: string;
    time: string;
  } | null>(null);
  
  const { data: doctors } = trpc.doctors.listActive.useQuery(undefined, {
    refetchInterval: 5000 // تحديث كل 5 ثواني
  });
  const { data: allAppointments } = trpc.appointments.listAllForSchedule.useQuery(undefined, {
    refetchInterval: 5000 // تحديث كل 5 ثواني
  });

  const timeSlots = generateTimeSlots();

  // فلترة المواعيد حسب التاريخ المحدد
  const filteredAppointments = allAppointments?.filter(apt => {
    const aptDate = new Date(apt.appointmentDate).toISOString().split('T')[0];
    return aptDate === selectedDate;
  }) || [];

  // دالة معالجة النقر على خانة في الجدول
  const handleSlotClick = (doctorId: number, doctorName: string, time: string, isBooked: boolean) => {
    if (isBooked) return; // لا يمكن الحجز في وقت محجوز
    
    // تحويل الوقت من 24 ساعة إلى AM/PM
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const isPM = hour >= 12;
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const displayTime = `${displayHour}:${minutes} ${isPM ? 'PM' : 'AM'}`;
    
    setPrefilledData({
      doctorId,
      doctorName,
      date: selectedDate,
      time: displayTime
    });
    
    // العودة إلى صفحة الكول سنتر مع البيانات
    setLocation('/call-center', { 
      state: { 
        prefillAppointment: {
          doctorId,
          doctorName,
          date: selectedDate,
          time: displayTime
        }
      } 
    });
  };

  // التحقق من وجود موعد لطبيب في وقت معين
  const getAppointmentForSlot = (doctorId: number, time: string) => {
    return filteredAppointments.find(apt => 
      apt.doctorId === doctorId && apt.appointmentTime === time
    );
  };

  // تنسيق التاريخ للعرض (ميلادي)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-20">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/call-center')}
                className="flex items-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <CalendarIcon className="w-6 h-6 text-blue-600" />
                  جدول المواعيد
                </h1>
                <p className="text-gray-600">{formatDate(selectedDate)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium text-gray-700">اختر التاريخ:</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-auto"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="container mx-auto px-6 py-6">
        <Card className="p-6 overflow-hidden">
          <div className="overflow-x-auto" dir="rtl">
            <table className="w-full border-collapse min-w-max">
              <thead>
                {/* السطر الأول: أسماء الأطباء */}
                <tr>
                  <th className="border border-gray-300 bg-blue-600 text-white p-3 text-center font-bold sticky top-0 z-10 min-w-[100px]">
                    الوقت
                  </th>
                  {doctors?.map((doctor) => (
                    <th 
                      key={doctor.id} 
                      className="border border-gray-300 bg-blue-600 text-white p-3 text-center font-bold sticky top-0 z-10 min-w-[150px]"
                    >
                      {doctor.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {timeSlots.map((slot, index) => (
                  <tr key={slot.time} className={index % 4 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    {/* عمود الوقت */}
                    <td className="border border-gray-300 p-3 text-center font-semibold text-gray-700 sticky right-0 z-10 bg-gray-100">
                      {slot.displayTime}
                    </td>
                    {/* أعمدة الأطباء */}
                    {doctors?.map((doctor) => {
                      const appointment = getAppointmentForSlot(doctor.id, slot.time);
                      const isBooked = !!appointment;
                      
                      return (
                        <td 
                          key={doctor.id} 
                          onClick={() => handleSlotClick(doctor.id, doctor.name, slot.time, isBooked)}
                          className={`border border-gray-300 p-3 text-center transition-colors ${
                            isBooked 
                              ? 'bg-red-100 hover:bg-red-200 cursor-not-allowed' 
                              : 'bg-green-50 hover:bg-green-100 cursor-pointer'
                          }`}
                        >
                          {isBooked ? (
                            <span className="text-red-800 font-bold text-sm">محجوز</span>
                          ) : (
                            <span className="text-green-700 font-medium text-sm">متاح</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 pt-6 border-t text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-50 border-2 border-green-300 rounded"></div>
              <span className="font-medium">متاح</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-red-100 border-2 border-red-300 rounded"></div>
              <span className="font-medium">محجوز</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
