import { useState } from "react";
import Icon from "./ui/Icon";

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

  // Convert JS getDay() (0=Sun) to Monday-first index (0=Mon)
  const jsDay = new Date(year, month, 1).getDay();
  const firstDayOfMonth = (jsDay + 6) % 7;
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
    <div className={`select-none ${compact ? "bg-c57-surface-container-low rounded-c57-lg" : "bg-c57-surface-container-low rounded-c57-lg p-5 border border-c57-outline-variant"}`}>
      {/* Month Header */}
      <div className={`flex items-center justify-between px-1 ${compact ? "mb-2" : "mb-4"}`}>
        <div className="flex items-center gap-2">
          <Icon name="calendar_month" size="sm" className="text-c57-primary" />
          <span className={`font-label-md font-bold text-c57-on-surface tracking-tight ${compact ? "text-label-sm" : "text-label-md"}`}>
            {monthNames[month]} {year}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={prevMonth}
            className="p-1 rounded-c57-sm hover:bg-c57-surface-container-highest text-c57-on-surface-variant transition-colors"
            aria-label="Bulan sebelumnya"
          >
            <Icon name="chevron_left" size="sm" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="p-1 rounded-c57-sm hover:bg-c57-surface-container-highest text-c57-on-surface-variant transition-colors"
            aria-label="Bulan berikutnya"
          >
            <Icon name="chevron_right" size="sm" />
          </button>
        </div>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {(compact ? ["S", "S", "R", "K", "J", "S", "M"] : ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"]).map((day, idx) => (
          <span
            key={idx}
            className={`font-label-sm text-label-sm font-bold uppercase tracking-wider text-c57-on-surface-variant`}
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

          let cellClass = "bg-c57-surface-container-lowest text-c57-on-surface hover:bg-c57-primary-container/30 hover:text-c57-primary";

          if (past || booked) {
            cellClass = "bg-c57-surface-container text-c57-on-surface-variant/40 cursor-not-allowed line-through opacity-60";
          } else if (isStart || isEnd) {
            cellClass = "bg-c57-primary text-c57-on-primary font-bold shadow-c57-card scale-105 z-10 rounded-c57-md";
          } else if (inRange) {
            cellClass = "bg-c57-primary/15 text-c57-primary font-bold rounded-c57-sm";
          }

          return (
            <button
              key={dayNum}
              type="button"
              disabled={past || booked}
              onClick={() => handleDateClick(dayNum)}
              title={booked ? "Sudah Terbooked" : past ? "Lewat" : `${dayNum} ${monthNames[month]}`}
              className={`${compact ? "h-7 text-label-sm" : "h-9 text-label-sm"} flex flex-col items-center justify-center font-bold transition-all relative ${cellClass}`}
            >
              <span>{dayNum}</span>
            </button>
          );
        })}
      </div>

      {!compact && (
        <div className="mt-4 pt-3 border-t border-c57-outline-variant flex flex-wrap items-center justify-between text-label-sm text-c57-on-surface-variant font-bold gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-c57-primary" />
              <span>Dipilih</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-c57-surface-container-highest line-through" />
              <span>Terbooked</span>
            </div>
          </div>
          <span className="text-c57-primary">
            {!startStr ? "Klik tanggal mulai" : !endStr ? "Klik tanggal selesai" : `${startStr} s/d ${endStr}`}
          </span>
        </div>
      )}
    </div>
  );
}