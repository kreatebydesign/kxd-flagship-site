"use client";

import Link from "next/link";
import type { CalendarEventRecord } from "@/lib/calendar/types";
import { eventHeadline, EVENT_TYPE_LABELS } from "@/lib/calendar/presentation";

type Props = {
  events: CalendarEventRecord[];
  year: number;
  monthIndex: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
};

export function defaultCalendarMonthFromEvents(
  events: CalendarEventRecord[],
): { year: number; monthIndex: number } {
  const today = new Date();
  const fallback = { year: today.getFullYear(), monthIndex: today.getMonth() };
  const upcoming = [...events]
    .filter((event) => event.status !== "cancelled")
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const anchor = upcoming[0]?.startsOn ?? today.toISOString().slice(0, 10);
  const parsed = new Date(`${anchor.slice(0, 10)}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return { year: parsed.getFullYear(), monthIndex: parsed.getMonth() };
}

/** Pure month intersection helper (shared with local verifiers). */
export function calendarEventIntersectsMonth(
  event: CalendarEventRecord,
  year: number,
  monthIndex: number,
): boolean {
  const start = event.startsOn?.slice(0, 10);
  const end = (event.endsOn || event.startsOn)?.slice(0, 10);
  if (!start) return false;
  const monthStart = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const monthEnd = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return start <= monthEnd && end >= monthStart;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Map day-of-month → events that should render in the month grid. */
export function groupCalendarEventsByDayInMonth(
  monthEvents: CalendarEventRecord[],
  year: number,
  monthIndex: number,
): Map<number, CalendarEventRecord[]> {
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const eventsByDay = new Map<number, CalendarEventRecord[]>();
  for (const event of monthEvents) {
    const startDay = Number(event.startsOn.slice(8, 10));
    const endDay = Number((event.endsOn || event.startsOn).slice(8, 10));
    const startMonth = event.startsOn.slice(0, 7);
    const endMonth = (event.endsOn || event.startsOn).slice(0, 7);
    const from = startMonth === monthKey ? startDay : 1;
    const to = endMonth === monthKey ? endDay : daysInMonth;
    for (let d = from; d <= to; d += 1) {
      const list = eventsByDay.get(d) ?? [];
      if (!list.some((row) => row.eventKey === event.eventKey)) {
        list.push(event);
      }
      eventsByDay.set(d, list);
    }
  }
  return eventsByDay;
}

export function CalendarMonthView({ events, year, monthIndex, onPrevMonth, onNextMonth }: Props) {
  const label = new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);

  const monthEvents = events
    .filter((event) => calendarEventIntersectsMonth(event, year, monthIndex))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn));

  const firstDow = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: Array<{ day: number | null; key: string }> = [];
  for (let i = 0; i < firstDow; i += 1) {
    cells.push({ day: null, key: `pad-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ day, key: `day-${day}` });
  }

  const eventsByDay = groupCalendarEventsByDayInMonth(monthEvents, year, monthIndex);
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return (
    <div className="kxd-cal-month" aria-label={`Calendar month view for ${label}`}>
      <div className="kxd-cal-month__header">
        <button type="button" className="kxd-ces-btn kxd-ces-btn--ghost" onClick={onPrevMonth}>
          Previous
        </button>
        <h3 className="kxd-cal-month__title">{label}</h3>
        <button type="button" className="kxd-ces-btn kxd-ces-btn--ghost" onClick={onNextMonth}>
          Next
        </button>
      </div>
      <div className="kxd-cal-month__grid" role="grid" aria-label="Month days">
        {WEEKDAY_LABELS.map((day) => (
          <span key={day} className="kxd-cal-month__weekday" role="columnheader">
            {day}
          </span>
        ))}
        {cells.map((cell) => {
          const dayEvents = cell.day ? eventsByDay.get(cell.day) ?? [] : [];
          const dayIso =
            cell.day != null
              ? `${monthKey}-${String(cell.day).padStart(2, "0")}`
              : null;
          const isToday = dayIso === todayKey;
          return (
            <div
              key={cell.key}
              className={`kxd-cal-month__cell${cell.day ? "" : " kxd-cal-month__cell--pad"}${isToday ? " kxd-cal-month__cell--today" : ""}`}
              role="gridcell"
            >
              {cell.day ? (
                <>
                  <span className="kxd-cal-month__daynum">{cell.day}</span>
                  <ul className="kxd-cal-month__events">
                    {dayEvents.slice(0, 3).map((event) => (
                      <li key={`${event.eventKey}-${cell.day}`}>
                        <Link
                          href={`/portal/calendar/${event.eventKey}`}
                          className="kxd-cal-month__event"
                          title={`${eventHeadline(event)} · ${EVENT_TYPE_LABELS[event.eventType]}`}
                        >
                          <span className="kxd-cal-month__event-type">
                            {EVENT_TYPE_LABELS[event.eventType]}
                          </span>
                          <span className="kxd-cal-month__event-title">{eventHeadline(event)}</span>
                        </Link>
                      </li>
                    ))}
                    {dayEvents.length > 3 ? (
                      <li className="kxd-cal-month__more">+{dayEvents.length - 3} more</li>
                    ) : null}
                  </ul>
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}