import { meals } from '../../core/choices.ts';
import type { Meal } from '../../core/contracts.ts';
import { energyText, mealLabels } from '../presentation.ts';

type Props = { byMeal: Record<Meal, number> | undefined; total: number | undefined; maintenance: number | null | undefined };

const size = 172;
const stroke = 14;
const radius = (size - stroke) / 2;
const circumference = 2 * Math.PI * radius;
const gap = 3;

/** 环形图：各餐摄入按顺序首尾相接，满圈代表估算维持热量（超出时代表摄入总量）。 */
export function IntakeRing({ byMeal, total, maintenance }: Props) {
  const intake = total ?? 0;
  const scale = Math.max(intake, maintenance ?? 0);
  const parts = byMeal ? meals.filter((meal) => byMeal[meal] > 0).map((meal) => ({ meal, kcal: byMeal[meal] })) : [];
  const spaced = parts.length > 1 || (scale > 0 && intake < scale);
  let offset = 0;
  const arcs = scale > 0 ? parts.map(({ meal, kcal }) => {
    const length = (kcal / scale) * circumference;
    const arc = { meal, kcal, start: offset, length: Math.max(length - (spaced ? gap : 0), 0.5) };
    offset += length;
    return arc;
  }) : [];
  const over = maintenance != null && maintenance > 0 && intake > maintenance;
  const markerAngle = over ? (maintenance / scale) * 2 * Math.PI - Math.PI / 2 : 0;
  const center = size / 2;
  const inner = radius - stroke / 2 - 3;
  const outer = radius + stroke / 2 + 3;

  return <div className="cal-ring">
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={total === undefined ? '摄入热量' : `摄入热量 ${energyText(intake)} 千卡`}>
      <circle className="cal-ring-track" cx={center} cy={center} r={radius} strokeWidth={stroke} fill="none" />
      <g transform={`rotate(-90 ${center} ${center})`}>
        {arcs.map((arc) => <circle
          key={arc.meal} className="cal-ring-arc" data-meal-color={arc.meal}
          cx={center} cy={center} r={radius} strokeWidth={stroke} fill="none"
          strokeDasharray={`${arc.length} ${circumference}`} strokeDashoffset={-arc.start}
        ><title>{`${mealLabels[arc.meal]} ${energyText(arc.kcal)} 千卡`}</title></circle>)}
      </g>
      {over && <line
        className="cal-ring-marker"
        x1={center + inner * Math.cos(markerAngle)} y1={center + inner * Math.sin(markerAngle)}
        x2={center + outer * Math.cos(markerAngle)} y2={center + outer * Math.sin(markerAngle)}
      ><title>估算维持热量</title></line>}
    </svg>
    <div className="cal-ring-center" aria-hidden="true">
      <span className="cal-ring-label">摄入热量</span>
      <b className="cal-ring-value">{total === undefined ? '—' : energyText(intake)}</b>
      <span className="cal-ring-unit">千卡</span>
    </div>
  </div>;
}
