import { useState } from 'react';
import type { Food } from '../core/contracts.ts';
import { DailyPage } from './daily/page.tsx';
import { FoodEditor } from './food/editor.tsx';
import { FoodLibrary } from './food/library.tsx';
import { ProfilePage } from './profile/page.tsx';
import stylesheet from './styles.css';

type Page = 'daily' | 'foods' | 'profile';
export type OpenFoodEditor = (foodId?: string, onSaved?: (food: Food) => void) => void;
const pages: ReadonlyArray<{ id: Page; label: string }> = [
  { id: 'daily', label: '饮食记录' }, { id: 'foods', label: '食物库' }, { id: 'profile', label: '个人资料' },
];

export function CalorieApp() {
  const [page, setPage] = useState<Page>('daily');
  const [editor, setEditor] = useState<{ foodId?: string; onSaved?: (food: Food) => void }>();
  const [revision, setRevision] = useState(0);
  const openFoodEditor: OpenFoodEditor = (foodId, onSaved) => setEditor({ foodId, onSaved });
  const activePage = editor ? 'foods' : page;

  function foodSaved(food: Food) {
    editor?.onSaved?.(food);
    setRevision((value) => value + 1);
    setEditor((current) => current === editor ? undefined : current);
  }

  return <div className="calorie-shell">
    <style>{stylesheet}</style>
    <div className="cal-container">
      <header className="cal-header">
        <h1>卡路里记录</h1>
        <nav className="cal-nav" aria-label="卡路里记录">
          {pages.map(({ id, label }) => <button
            key={id} type="button" aria-current={id === activePage ? 'page' : undefined}
            onClick={() => {
              setEditor(undefined);
              setPage(id);
              setRevision((value) => value + 1);
            }}
          >{label}</button>)}
        </nav>
      </header>

      <div hidden={page !== 'daily' || Boolean(editor)}>
        <DailyPage openFoodEditor={openFoodEditor} revision={revision} />
      </div>
      {page === 'foods' && <div hidden={Boolean(editor)}>
        <FoodLibrary openFoodEditor={openFoodEditor} revision={revision} />
      </div>}
      {page === 'profile' && !editor && <ProfilePage onSaved={() => setRevision((value) => value + 1)} />}
      {editor && <FoodEditor
        key={editor.foodId ?? 'new'} id={editor.foodId}
        onSaved={foodSaved} onCancel={() => setEditor(undefined)}
      />}
    </div>
  </div>;
}
