/**
 * تحويل الوقت من نظام 24 ساعة إلى نظام 12 ساعة مع AM/PM
 * @param time24 - الوقت بصيغة 24 ساعة (مثل: "14:30" أو "04:00")
 * @returns الوقت بصيغة 12 ساعة مع AM/PM (مثل: "02:30 PM" أو "04:00 AM")
 */
export function convertTo12Hour(time24: string): string {
  if (!time24) return '';
  
  const [hours, minutes] = time24.split(':').map(Number);
  
  if (isNaN(hours) || isNaN(minutes)) return time24;
  
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12; // تحويل 0 إلى 12
  
  return `${hours12.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
}

/**
 * تحويل الوقت من نظام 12 ساعة إلى نظام 24 ساعة
 * @param time12 - الوقت بصيغة 12 ساعة (مثل: "02:30 PM")
 * @returns الوقت بصيغة 24 ساعة (مثل: "14:30")
 */
export function convertTo24Hour(time12: string): string {
  if (!time12) return '';
  
  const match = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return time12;
  
  let [, hoursStr, minutesStr, period] = match;
  let hours = parseInt(hoursStr);
  const minutes = parseInt(minutesStr);
  
  if (period.toUpperCase() === 'PM' && hours !== 12) {
    hours += 12;
  } else if (period.toUpperCase() === 'AM' && hours === 12) {
    hours = 0;
  }
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
