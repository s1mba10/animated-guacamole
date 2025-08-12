import { startOfWeek, addWeeks, addDays, format } from 'date-fns';

export const getWeekDates = (weekOffset: number = 0) => {
  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  return Array.from({ length: 7 }).map((_, i: number) => {
    const date = addDays(weekStart, i);
    return {
      dayLabel: ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'][i],
      dateNumber: format(date, 'd'),
      fullDate: format(date, 'yyyy-MM-dd'),
      isToday: format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
    };
  });
};
