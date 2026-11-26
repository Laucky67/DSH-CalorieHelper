import { useRef } from 'react';
import { localDate, shiftDate } from '../../core/calendar.ts';
import { dayDetail, dayName } from '../format.ts';
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons.tsx';
import { IconButton } from '../ui.tsx';

type Props = { date: string; onChange: (date: string) => void };

export function DateNav({ date, onChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const today = localDate();
  const name = dayName(date, today, shiftDate(today, -1), shiftDate(today, 1));
  const detail = dayDetail(date, today);
  const relative = name === '今天' || name === '昨天' || name === '明天';
  const sub = relative ? detail : detail.split(' ').at(-1);

  const openPicker = () => {
    const element = input.current;
    if (!element) return;
    try { element.showPicker(); }
    catch { element.focus(); }
  };

  return <div className="cal-datebar">
    <IconButton label="前一天" icon={<ChevronLeftIcon size={18} />} onClick={() => onChange(shiftDate(date, -1))} />
    <div className="cal-date-pick">
      <button type="button" className="cal-date-btn" onClick={openPicker} aria-label={`选择日期，当前 ${detail}`}>
        <span className="cal-date-main">{name}</span>
        <span className="cal-date-sub">{sub}</span>
        <ChevronDownIcon size={14} />
      </button>
      <input
        ref={input} type="date" name="date" className="cal-date-input" tabIndex={-1} aria-hidden="true"
        value={date} onChange={(event) => { if (event.target.value) onChange(event.target.value); }}
      />
    </div>
    <IconButton label="后一天" icon={<ChevronRightIcon size={18} />} onClick={() => onChange(shiftDate(date, 1))} />
    {date !== today && <button type="button" className="cal-btn is-quiet is-small cal-today-btn" onClick={() => onChange(today)}>回到今天</button>}
  </div>;
}
