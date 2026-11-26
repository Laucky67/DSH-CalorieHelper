import { useRef, useState } from 'react';
import type { Food } from '../core/contracts.ts';
import { DailyPage } from './daily/page.tsx';
import { FoodEditor } from './food/editor.tsx';
import { FoodLibrary } from './food/library.tsx';
import { ProfilePage } from './profile/page.tsx';
import { useUnsavedWarning } from './requests.ts';
import stylesheet from './styles.css';

type Page = 'daily' | 'foods' | 'profile';
export type OpenFoodEditor = (foodId?: string, onSaved?: (food: Food) => void) => void;
const pages: ReadonlyArray<{ id: Page; label: string }> = [
  { id: 'daily', label: '饮食记录' }, { id: 'foods', label: '食物库' }, { id: 'profile', label: '个人资料' },
];
type Editor = { foodId?: string; onSaved?: (food: Food) => void; trigger: Element | null };

export function CalorieApp() {
  const [page, setPage] = useState<Page>('daily');
  const [editor, setEditor] = useState<Editor>();
  const editorRef = useRef<Editor | undefined>(undefined);
  const [editorDirty, setEditorDirty] = useState(false);
  const [profileDirty, setProfileDirty] = useState(false);
  const [revision, setRevision] = useState(0);
  useUnsavedWarning(editorDirty || profileDirty);
  const openFoodEditor: OpenFoodEditor = (foodId, onSaved) => {
    const next = { foodId, onSaved, trigger: document.activeElement };
    editorRef.current = next;
    setEditorDirty(false);
    setEditor(next);
  };
  const activePage = editor ? 'foods' : page;

  function closeEditor(restoreFocus: boolean) {
    const trigger = editorRef.current?.trigger;
    editorRef.current = undefined;
    setEditor(undefined);
    setEditorDirty(false);
    if (restoreFocus && trigger instanceof HTMLElement) {
      window.requestAnimationFrame(() => { if (trigger.isConnected) trigger.focus(); });
    }
  }

  function foodSaved(food: Food) {
    setRevision((value) => value + 1);
    if (editor && editorRef.current === editor) {
      editor.onSaved?.(food);
      closeEditor(true);
    }
  }

  function visit(next: Page) {
    if ((editorDirty || (profileDirty && page !== next)) && !window.confirm('内容还没有保存。要放弃编辑吗？')) return;
    if (page !== next) setProfileDirty(false);
    closeEditor(false);
    setPage(next);
    setRevision((value) => value + 1);
  }

  return <div className="calorie-shell">
    <style>{stylesheet}</style>
    <div className="cal-container">
      <header className="cal-header">
        <h1>卡路里记录</h1>
        <nav className="cal-nav" aria-label="卡路里记录">
          {pages.map(({ id, label }) => <button
            key={id} type="button" aria-current={id === activePage ? 'page' : undefined}
            onClick={() => visit(id)}
          >{label}</button>)}
        </nav>
      </header>

      <div hidden={page !== 'daily' || Boolean(editor)}>
        <DailyPage openFoodEditor={openFoodEditor} revision={revision} active={page === 'daily' && !editor} />
      </div>
      {page === 'foods' && <div hidden={Boolean(editor)}>
        <FoodLibrary openFoodEditor={openFoodEditor} revision={revision} active={!editor} />
      </div>}
      {page === 'profile' && !editor && <ProfilePage onDirty={() => setProfileDirty(true)} onSaved={() => {
        setProfileDirty(false);
        setRevision((value) => value + 1);
      }} />}
      {editor && <FoodEditor
        key={editor.foodId ?? 'new'} id={editor.foodId}
        onSaved={foodSaved} onDirty={() => setEditorDirty(true)} onCancel={() => {
          if (!editorDirty || window.confirm('食物资料还没有保存。要放弃编辑吗？')) closeEditor(true);
        }}
      />}
    </div>
  </div>;
}
