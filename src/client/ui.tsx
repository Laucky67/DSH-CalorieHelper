import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { energyText } from './presentation.ts';
import { AlertIcon, CloseIcon, RetryIcon } from './icons.tsx';

export function Kcal({ value, className }: { value: number; className?: string }) {
  return <span className={`cal-kcal${className ? ` ${className}` : ''}`}>
    <b>{energyText(value)}</b><span className="cal-kcal-unit"> 千卡</span>
  </span>;
}

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & { label: string; icon: ReactNode; tone?: 'danger' };

export function IconButton({ label, icon, tone, className, ...rest }: IconButtonProps) {
  return <button
    type="button" aria-label={label} title={label}
    className={`cal-icon-btn${tone ? ` is-${tone}` : ''}${className ? ` ${className}` : ''}`} {...rest}
  >{icon}</button>;
}

/** 错误提示条，可带重试或关闭。 */
export function Banner({ children, onRetry, onDismiss }: { children: ReactNode; onRetry?: () => void; onDismiss?: () => void }) {
  return <div className="cal-banner" role="alert">
    <AlertIcon size={16} />
    <div className="cal-banner-text">{children}</div>
    {onRetry && <button type="button" className="cal-btn is-quiet is-small" onClick={onRetry}><RetryIcon size={14} />重试</button>}
    {onDismiss && <IconButton label="关闭提示" icon={<CloseIcon size={14} />} onClick={onDismiss} />}
  </div>;
}

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return <p className="cal-field-error" id={id}>{children}</p>;
}

type Option<Value extends string> = { value: Value; label: string };

/** 单选分段控件。 */
export function Segmented<Value extends string>({ label, options, value, onChange, name }: {
  label: string; name: string; options: ReadonlyArray<Option<Value>>; value: Value; onChange: (value: Value) => void;
}) {
  return <div className="cal-segmented" role="radiogroup" aria-label={label}>
    {options.map((option) => <label key={option.value} className={option.value === value ? 'is-on' : undefined}>
      <input
        type="radio" name={name} value={option.value} checked={option.value === value}
        onChange={() => onChange(option.value)}
      />
      <span>{option.label}</span>
    </label>)}
  </div>;
}
