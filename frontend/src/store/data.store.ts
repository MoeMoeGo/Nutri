import { create } from "zustand";
import { format, addDays, subDays, isToday } from "date-fns";

interface DateState {
  selectedDate: Date;
  dateString: string;       
  goToPrevDay: () => void;
  goToNextDay: () => void;
  goToToday:   () => void;
  setDate:     (date: Date) => void;
}

export const useDateStore = create<DateState>((set, get) => ({
  selectedDate: new Date(),
  dateString:   format(new Date(), "yyyy-MM-dd"),

  goToPrevDay: () => {
    const prev = subDays(get().selectedDate, 1);
    set({ selectedDate: prev, dateString: format(prev, "yyyy-MM-dd") });
  },

  goToNextDay: () => {
    if (isToday(get().selectedDate)) return;
    const next = addDays(get().selectedDate, 1);
    set({ selectedDate: next, dateString: format(next, "yyyy-MM-dd") });
  },

  goToToday: () => {
    const today = new Date();
    set({ selectedDate: today, dateString: format(today, "yyyy-MM-dd") });
  },

  setDate: (date: Date) => {
    set({ selectedDate: date, dateString: format(date, "yyyy-MM-dd") });
  },
}));