import type { ReactNode } from 'react';

type IconProps = { size?: number };

function Svg({ size = 16, children }: IconProps & { children: ReactNode }) {
  return <svg
    width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"
  >{children}</svg>;
}

/** 侧边栏图标：一个小火焰。 */
export function FlameIcon({ size = 16 }: IconProps) {
  return <Svg size={size}>
    <path d="M12 3c.6 3-1.6 4.6-3.2 6.5C7.3 11.2 6.5 12.8 6.5 14.6A5.5 5.5 0 0 0 12 20.1a5.5 5.5 0 0 0 5.5-5.5c0-2.4-1.2-4.2-2.4-5.4-.3 1.3-1 2.2-2 2.6.4-2.9-.2-6.1-1.1-8.8Z" />
    <path d="M12 20.1a2.4 2.4 0 0 1-2.4-2.4c0-1.4 1.1-2.3 2.4-3.6 1.3 1.3 2.4 2.2 2.4 3.6a2.4 2.4 0 0 1-2.4 2.4Z" />
  </Svg>;
}

export function PlateIcon({ size }: IconProps) {
  return <Svg size={size}>
    <circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" />
  </Svg>;
}

export function BasketIcon({ size }: IconProps) {
  return <Svg size={size}>
    <path d="M4 9.5h16l-1.5 9a2 2 0 0 1-2 1.7h-9a2 2 0 0 1-2-1.7L4 9.5Z" />
    <path d="m8.5 9.5 3-5.5M15.5 9.5l-3-5.5M9.5 13.5v3M14.5 13.5v3" />
  </Svg>;
}

export function PersonIcon({ size }: IconProps) {
  return <Svg size={size}>
    <circle cx="12" cy="8" r="3.6" /><path d="M5 20c.8-3.6 3.6-5.6 7-5.6s6.2 2 7 5.6" />
  </Svg>;
}

export function ChevronLeftIcon({ size }: IconProps) {
  return <Svg size={size}><path d="m14.5 6-6 6 6 6" /></Svg>;
}

export function ChevronRightIcon({ size }: IconProps) {
  return <Svg size={size}><path d="m9.5 6 6 6-6 6" /></Svg>;
}

export function ChevronDownIcon({ size }: IconProps) {
  return <Svg size={size}><path d="m6.5 9.5 5.5 5.5 5.5-5.5" /></Svg>;
}

export function PlusIcon({ size }: IconProps) {
  return <Svg size={size}><path d="M12 5.5v13M5.5 12h13" /></Svg>;
}

export function CloseIcon({ size }: IconProps) {
  return <Svg size={size}><path d="m6.5 6.5 11 11M17.5 6.5l-11 11" /></Svg>;
}

export function SearchIcon({ size }: IconProps) {
  return <Svg size={size}><circle cx="11" cy="11" r="6" /><path d="m19.5 19.5-4.2-4.2" /></Svg>;
}

export function TrashIcon({ size }: IconProps) {
  return <Svg size={size}>
    <path d="M4.5 7h15M10 4h4M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7M10 11v5M14 11v5" />
  </Svg>;
}

/** 食物资料：一张带折角的卡片。 */
export function FoodCardIcon({ size }: IconProps) {
  return <Svg size={size}>
    <path d="M6 3.5h8.5L19 8v11a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1-1.5Z" />
    <path d="M14 3.5V8h5M8.5 12.5h7M8.5 16h4.5" />
  </Svg>;
}

export function CheckIcon({ size }: IconProps) {
  return <Svg size={size}><path d="m5.5 12.5 4 4 9-9" /></Svg>;
}

export function AlertIcon({ size }: IconProps) {
  return <Svg size={size}>
    <circle cx="12" cy="12" r="8.5" /><path d="M12 7.8v5M12 16.2v.01" />
  </Svg>;
}

export function RetryIcon({ size }: IconProps) {
  return <Svg size={size}><path d="M19 12a7 7 0 1 1-2.1-5M19 4.5V9h-4.5" /></Svg>;
}

export function CalendarIcon({ size }: IconProps) {
  return <Svg size={size}>
    <rect x="4" y="5.5" width="16" height="14.5" rx="2.5" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" />
  </Svg>;
}
