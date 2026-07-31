import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";

/**
 * UnitCalendarPicker Component
 * Renders a calendar where dates booked in `bookings` are disabled.
 * Allows picking start and end dates.
 * 
 * Props:
 *  - bookings: Array<{ start: Date, end: Date }>
 *  - startDate: string (YYYY-MM-DD)
 *  - endDate: string (YYYY-MM-DD)
 *  - onChange: ({ start: string, end: string }) => void
 */
export default function UnitCalendarPicker({ bookings = [], startDate, endDate, onChange, compact = false }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectingEnd, setSelectingEnd] = useState(false);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const monthNames = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Convert Date to YYYY-MM-DD
  const toFormatStr = (d) => {
    if (!d) return "";
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return "";
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const day = String(dateObj.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const isBooked = (dateObj) => {
    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);
    return bookings.some((b) => {
      if (!b.start || !b.end) return false;
      const s = new Date(b.start);
      s.setHours(0, 0, 0, 0);
      const e = new Date(b.end);
      e.setHours(0, 0, 0, 0);
      return target >= s && target <= e;
    });
  };

  const isPast = (dateObj) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateObj);
    target.setHours(0, 0, 0, 0);
    return target < today;
  };

  const handleDateClick = (dayNumber) => {
    const clickedDate = new Date(year, month, dayNumber);
    if (isPast(clickedDate) || isBooked(clickedDate)) return;

    const clickedStr = toFormatStr(clickedDate);

    if (!startDate || selectingEnd || new Date(clickedStr) < new Date(startDate)) {
      // Pick start date
      onChange({ start: clickedStr, end: "" });
      setSelectingEnd(true);
    } else {
      // Pick end date
      const startObj = new Date(startDate);
      const endObj = new Date(clickedStr);
      let rangeHasBooked = false;

      for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
        if (isBooked(d)) {
          rangeHasBooked = true;
          break;
        }
      }

      if (rangeHasBooked) {
        onChange({ start: clickedStr, end: "" });
        setSelectingEnd(true);
      } else {
        onChange({ start: startDate, end: clickedStr });
        setSelectingEnd(false);
      }
    }
  };

  const startStr = startDate ? startDate.split("T")[0] : "";
  const endStr = endDate ? endDate.split("T")[0] : "";

  return (
    <div className={`select-none ${compact ? "bg-slate-50/50 border border-slate-100 rounded-2xl p-3" : "bg-slate-50 border border-slate-200 rounded-3xl p-5"}`}>
      {/* Month Header */}
      <div className={`flex items-center justify-between px-1 ${compact ? "mb-2" : "mb-4"}`}>
        <div className="flex items-center gap-2">
          <CalendarIcon size={compact ? 14 : 16} className="text-[#990000]" />
          <span className={`font-black text-slate-900 tracking-tight ${compact ? "text-xs" : "text-sm"}`}>
            {monthNames[month]} {year}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ChevronLeft size={compact ? 14 : 16} />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
          >
            <ChevronRight size={compact ? 14 : 16} />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {(compact ? ["S", "S", "R", "K", "J", "S", "M"] : ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]).map((day, idx) => (
          <span
            key={idx}
            className={`font-bold uppercase tracking-wider ${compact ? "text-[9px] text-slate-400" : "text-[10px] text-slate-400"}`}
          >
            {day}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Blank offset days */}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`blank-${i}`} className={compact ? "h-7" : "h-9"} />
        ))}

        {/* Month days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const dayNum = i + 1;
          const thisDateObj = new Date(year, month, dayNum);
          const thisDateStr = toFormatStr(thisDateObj);
          const past = isPast(thisDateObj);
          const booked = isBooked(thisDateObj);

          const isStart = startStr === thisDateStr;
          const isEnd = endStr === thisDateStr;
          const inRange =
            startStr &&
            endStr &&
            thisDateStr > startStr &&
            thisDateStr < endStr;

          let cellClass = "bg-white text-slate-700 hover:bg-red-50 hover:text-[#990000]";

          if (past || booked) {
            cellClass = "bg-slate-100/60 text-slate-300 cursor-not-allowed line-through opacity-50";
          } else if (isStart || isEnd) {
            cellClass = "bg-[#990000] text-white font-black shadow-md shadow-red-900/30 scale-105 z-10 rounded-xl";
          } else if (inRange) {
            cellClass = "bg-red-100 text-[#990000] font-bold rounded-lg";
          }

          return (
            <button
              key={dayNum}
              type="button"
              disabled={past || booked}
              onClick={() => handleDateClick(dayNum)}
              title={booked ? "Sudah Terbooked" : past ? "Lewat" : `${dayNum} ${monthNames[month]}`}
              className={`${compact ? "h-7 text-[11px] rounded-lg" : "h-9 text-xs rounded-xl"} flex flex-col items-center justify-center font-bold transition-all relative ${cellClass}`}
            >
              <span>{dayNum}</span>
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-4 pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-[10px] text-slate-500 font-bold gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#990000]" />
              <span>Dipilih</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 line-through" />
              <span>Terbooked</span>
            </div>
          </div>
          <span className="text-[#990000]">
            {!startStr ? "Klik tanggal mulai" : !endStr ? "Klik tanggal selesai" : `${startStr} s/d ${endStr}`}
          </span>
        </div>
      )}
    </div>
  );
}
