import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, MouseEvent } from 'react';
import type { Trends } from '../../core/contracts.ts';
import { energyText } from '../presentation.ts';

type Day = Trends['days'][number];
type Series = 'intakeKcal' | 'maintenanceKcal';
const height = 280;
const padding = { left: 52, right: 16, top: 20, bottom: 36 };

function linePath(days: Day[], key: Series, x: (index: number) => number, y: (value: number) => number): string {
  let drawing = false;
  return days.map((day, index) => {
    const value = day[key];
    if (value === null) { drawing = false; return ''; }
    const command = drawing ? 'L' : 'M';
    drawing = true;
    return `${command}${x(index)},${y(value)}`;
  }).join(' ');
}

export function TrendChart({ days, onOpenDate }: {
  days: Day[]; onOpenDate: (date: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [selectedDate, setSelectedDate] = useState<string>();
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const selected = Math.max(0, days.findIndex(({ date }) => date === selectedDate));
  const activeIndex = selectedDate ? selected : days.length - 1;
  const activeDay = days[activeIndex];
  let maximum = 0;
  for (const day of days) maximum = Math.max(maximum, day.intakeKcal ?? 0, day.maintenanceKcal ?? 0);
  const step = Math.max(100, Math.ceil(maximum / 4 / 100) * 100);
  const top = step * 4;
  const plotWidth = Math.max(1, width - padding.left - padding.right);
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index: number) => padding.left + (days.length < 2 ? plotWidth / 2 : index * plotWidth / (days.length - 1));
  const y = (value: number) => padding.top + plotHeight * (1 - value / top);

  const pointerIndex = (event: MouseEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - bounds.left) * width / bounds.width;
    return Math.max(0, Math.min(days.length - 1, Math.round((position - padding.left) / plotWidth * (days.length - 1))));
  };
  const onKeyDown = (event: KeyboardEvent<SVGSVGElement>) => {
    if (!activeDay) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onOpenDate(activeDay.date);
    }
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const index = Math.max(0, Math.min(days.length - 1, activeIndex + (event.key === 'ArrowRight' ? 1 : -1)));
      setSelectedDate(days[index].date);
    }
  };
  const ticks = [...new Set([0, Math.floor((days.length - 1) / 2), days.length - 1])];

  return <section className="cal-card cal-trend-chart">
    <div className="cal-trend-chart-heading">
      <div className="cal-trend-chart-title"><h2>热量</h2><span className="cal-muted">千卡</span></div>
      <div className="cal-trend-period">
        {days.length > 0 && <span className="cal-muted">{days[0].date} 至 {days.at(-1)!.date}</span>}
      </div>
    </div>
    <div ref={container} className="cal-trend-plot">
      {days.length > 0 ? <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}
        role="group" tabIndex={0} aria-label="每日热量走势图，左右方向键选择日期，回车查看饮食记录"
        onKeyDown={onKeyDown}
        onMouseMove={(event) => setSelectedDate(days[pointerIndex(event)].date)}
        onClick={(event) => onOpenDate(days[pointerIndex(event)].date)}
      >
        {[0, 1, 2, 3, 4].map((tick) => <g key={tick} className="cal-trend-gridline">
          <line x1={padding.left} x2={width - padding.right} y1={y(tick * step)} y2={y(tick * step)} />
          <text x={padding.left - 10} y={y(tick * step) + 4} textAnchor="end">{energyText(tick * step)}</text>
        </g>)}
        {ticks.map((index) => <text className="cal-trend-axis" key={index}
          x={x(index)} y={height - 10} textAnchor={index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'}
        >{days[index].date.slice(5).replace('-', '/')}</text>)}
        <path className="cal-trend-line is-maintenance" d={linePath(days, 'maintenanceKcal', x, y)} />
        <path className="cal-trend-line is-intake" d={linePath(days, 'intakeKcal', x, y)} />
        {days.map((day, index) => day.intakeKcal !== null && <circle key={day.date}
          className="cal-trend-dot" cx={x(index)} cy={y(day.intakeKcal)} r={days.length <= 30 ? 3.5 : 2}
        />)}
        {activeDay && <g className="cal-trend-cursor">
          <line x1={x(activeIndex)} x2={x(activeIndex)} y1={padding.top} y2={y(0)} />
          {(['intakeKcal', 'maintenanceKcal'] as const).map((key) => activeDay[key] !== null && <circle
            key={key} cx={x(activeIndex)} cy={y(activeDay[key])} r="5" className={key === 'intakeKcal' ? 'is-intake' : 'is-maintenance'}
          />)}
        </g>}
      </svg> : <div className="cal-trend-empty">记下第一餐，开始查看趋势</div>}
    </div>
    <div className="cal-trend-footer">
      {activeDay && <div className="cal-trend-detail" aria-live="polite" aria-atomic="true">
        <button type="button" className="cal-btn is-quiet is-small" onClick={() => onOpenDate(activeDay.date)}>{activeDay.date} ↗</button>
        <span>摄入 <strong>{activeDay.intakeKcal === null ? '未记录' : `${energyText(activeDay.intakeKcal)} 千卡`}</strong></span>
        <span>维持 <strong>{activeDay.maintenanceKcal === null ? '资料不足' : `${energyText(activeDay.maintenanceKcal)} 千卡`}</strong></span>
      </div>}
      <div className="cal-trend-legend">
        <span><i className="is-intake" />摄入热量</span>
        <span><i className="is-maintenance" />估算维持热量</span>
      </div>
    </div>
  </section>;
}
