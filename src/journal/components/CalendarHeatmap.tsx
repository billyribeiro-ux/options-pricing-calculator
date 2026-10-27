import React, { useState } from 'react';
import { JournalEntry } from '../types';
import { groupEntriesByDate } from '../analytics';
import { formatCurrency } from '../../utils/formatters';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalendarHeatmapProps {
  entries: JournalEntry[];
  onSelectDate: (date: string | null) => void;
  selectedDate: string | null;
}

export const CalendarHeatmap: React.FC<CalendarHeatmapProps> = ({
  entries,
  onSelectDate,
  selectedDate
}) => {
  // Calendar month state (defaults to October 2026)
  const [currentYear, setCurrentYear] = useState<number>(2026);
  const [currentMonth, setCurrentMonth] = useState<number>(9); // 0-indexed: 9 = October

  const dailyMap = groupEntriesByDate(entries);

  // Month navigation
  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Generate calendar grid
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayWeekday = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun

  const days: { day: number; dateStr: string }[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(i).padStart(2, '0');
    days.push({
      day: i,
      dateStr: `${currentYear}-${monthStr}-${dayStr}`
    });
  }

  // Monthly summary
  let monthPnL = 0;
  let monthTrades = 0;
  let winningDays = 0;
  let activeDays = 0;
  days.forEach((d) => {
    const summary = dailyMap.get(d.dateStr);
    if (summary && summary.tradeCount > 0) {
      monthPnL += summary.realizedPnL;
      monthTrades += summary.tradeCount;
      activeDays += 1;
      if (summary.realizedPnL > 0) winningDays += 1;
    }
  });
  const monthWinRate = activeDays > 0 ? Math.round((winningDays / activeDays) * 100) : 0;

  const jumpToLatest = () => {
    if (entries.length === 0) return;
    const sorted = [...entries].sort((a, b) => (b.exitDate || b.entryDate).localeCompare(a.exitDate || a.entryDate));
    const latestStr = sorted[0].exitDate || sorted[0].entryDate;
    const [yr, mo] = latestStr.split('-').map(Number);
    if (yr && mo) {
      setCurrentYear(yr);
      setCurrentMonth(mo - 1);
    }
  };

  return (
    <div className="md-card md-card--elevated">
      <div className="md-card__header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <CalendarIcon size={18} color="var(--md-sys-color-primary)" />
          <h3 className="md-card__title">
            Trading Calendar Heatmap — {monthNames[currentMonth]} {currentYear}
          </h3>
          <span
            className="md-chip"
            style={{
              backgroundColor: monthPnL >= 0 ? 'var(--quant-color-gain-container)' : 'var(--quant-color-loss-container)',
              color: monthPnL >= 0 ? 'var(--quant-color-on-gain-container)' : 'var(--quant-color-on-loss-container)',
              fontWeight: 700
            }}
          >
            Month P&L: {formatCurrency(monthPnL)} ({monthTrades} trades)
          </span>
          {activeDays > 0 && (
            <span className="md-chip md-chip--neutral" style={{ fontSize: 11 }}>
              Green Days: {winningDays}/{activeDays} ({monthWinRate}%)
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {selectedDate && (
            <button
              className="md-button md-button--text"
              style={{ fontSize: 12, height: 32 }}
              onClick={() => onSelectDate(null)}
            >
              Clear Filter ({selectedDate})
            </button>
          )}

          <button
            className="md-button md-button--outlined"
            style={{ height: 28, padding: '0 10px', fontSize: 11 }}
            onClick={jumpToLatest}
            title="Jump to Month of Latest Trade"
          >
            Latest Trade
          </button>

          <button className="md-icon-button" onClick={prevMonth} title="Previous Month">
            <ChevronLeft size={18} />
          </button>
          <button className="md-icon-button" onClick={nextMonth} title="Next Month">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Scrollable Container to prevent layout shift */}
      <div style={{ overflowX: 'auto', width: '100%', minWidth: 0, paddingBottom: 4 }}>
        <div style={{ minWidth: 480 }}>
          {/* Weekday Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              textAlign: 'center',
              gap: 6,
              fontSize: 11,
              fontWeight: 700,
              color: 'var(--md-sys-color-outline)',
              marginBottom: 6
            }}
          >
            <span>SUN</span>
            <span>MON</span>
            <span>TUE</span>
            <span>WED</span>
            <span>THU</span>
            <span>FRI</span>
            <span>SAT</span>
          </div>

          {/* Calendar Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 6
            }}
          >
        {/* Leading empty cells */}
        {Array.from({ length: firstDayWeekday }).map((_, i) => (
          <div key={`empty-${i}`} style={{ height: 68, opacity: 0.15 }} />
        ))}

        {/* Month Day Cells */}
        {days.map((item) => {
          const summary = dailyMap.get(item.dateStr);
          const hasTrades = summary && summary.tradeCount > 0;
          const pnl = summary?.realizedPnL || 0;
          const isSelected = selectedDate === item.dateStr;

          // Background intensity calculation
          let bg = 'var(--md-sys-color-surface-container)';
          let borderColor = 'var(--md-sys-color-outline-variant)';
          let textColor = 'var(--md-sys-color-on-surface)';

          if (hasTrades) {
            if (pnl > 500) {
              bg = 'rgba(0, 135, 90, 0.40)';
              borderColor = 'var(--quant-color-gain)';
            } else if (pnl > 0) {
              bg = 'rgba(0, 135, 90, 0.22)';
              borderColor = 'rgba(0, 135, 90, 0.6)';
            } else if (pnl < -500) {
              bg = 'rgba(222, 53, 11, 0.40)';
              borderColor = 'var(--quant-color-loss)';
            } else if (pnl < 0) {
              bg = 'rgba(222, 53, 11, 0.22)';
              borderColor = 'rgba(222, 53, 11, 0.6)';
            }
          }

          if (isSelected) {
            borderColor = 'var(--md-sys-color-primary)';
          }

          return (
            <div
              key={item.dateStr}
              onClick={() => onSelectDate(isSelected ? null : item.dateStr)}
              style={{
                height: 68,
                borderRadius: 8,
                backgroundColor: bg,
                border: `1.5px solid ${borderColor}`,
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: hasTrades ? 'pointer' : 'default',
                boxShadow: isSelected ? 'var(--md-sys-elevation-level2)' : 'none',
                transition: 'all 120ms ease'
              }}
              title={hasTrades ? `${item.dateStr}: ${formatCurrency(pnl)} across ${summary.tradeCount} trades` : item.dateStr}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: textColor }}>{item.day}</span>
                {hasTrades && (
                  <span
                    className="label-small"
                    style={{
                      fontSize: 9,
                      padding: '1px 4px',
                      borderRadius: 4,
                      backgroundColor: 'rgba(0,0,0,0.25)',
                      color: '#ffffff'
                    }}
                  >
                    {summary.tradeCount}T
                  </span>
                )}
              </div>

              {hasTrades && (
                <div
                  className="mono-small"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textAlign: 'right',
                    color: pnl >= 0 ? 'var(--quant-color-gain)' : 'var(--quant-color-loss)'
                  }}
                >
                  {formatCurrency(pnl, 0)}
                </div>
              )}
            </div>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
};
