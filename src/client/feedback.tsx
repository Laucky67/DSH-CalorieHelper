export function ErrorNotice({ text, retry }: { text: string; retry?: () => void }) {
  return <div className="cal-error" role="alert">
    <span>{text}</span>
    {retry && <button type="button" className="cal-button cal-small" onClick={retry}>重试</button>}
  </div>;
}

export function Loading() {
  return <div className="cal-loading" role="status">正在加载…</div>;
}

export function EditButton({ label, edit }: { label: string; edit: () => void }) {
  return <button type="button" className="cal-icon-button" title={label} aria-label={label} onClick={edit}>
    <span aria-hidden="true">✎</span>
  </button>;
}
