import { useCallback, useEffect, useRef, useState } from 'react';
import type { Food } from '../core/contracts.ts';
import { DailyPage } from './daily/page.tsx';
import { confirmDiscard } from './dirty.ts';
import { FoodEditor } from './foods/editor.tsx';
import type { FoodTarget } from './foods/editor.tsx';
import { FoodsPage } from './foods/page.tsx';
import { ProfilePage } from './profile/page.tsx';
import { Tabs } from './tabs.tsx';
import type { Tab } from './tabs.tsx';
import base from './styles/base.css';
import daily from './styles/daily.css';
import foods from './styles/foods.css';
import profile from './styles/profile.css';

const stylesheet = [base, daily, foods, profile].join('\n');

type Editor = { key: number; target: FoodTarget; onSaved?: (food: Food) => void; returnFocus: Element | null };

export function CalorieApp() {
  const [tab, setTab] = useState<Tab>('daily');
  const [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<Editor>();
  const pageDirty = useRef(false);
  const mainRef = useRef<HTMLElement>(null);
  const editorKey = useRef(0);
  const editorRef = useRef<Editor | undefined>(undefined);

  const reportDirty = useCallback((dirty: boolean) => { pageDirty.current = dirty; }, []);
  const bump = useCallback(() => setRevision((value) => value + 1), []);

  const switchTab = (next: Tab) => {
    if (next === tab || !confirmDiscard(pageDirty.current)) return;
    pageDirty.current = false;
    setTab(next);
  };

  const openFood = useCallback((target: FoodTarget, onSaved?: (food: Food) => void) => {
    editorKey.current += 1;
    const next = { key: editorKey.current, target, onSaved, returnFocus: document.activeElement };
    editorRef.current = next;
    setEditor(next);
  }, []);

  const closeEditor = useCallback(() => {
    const element = editorRef.current?.returnFocus;
    editorRef.current = undefined;
    mainRef.current?.removeAttribute('inert');
    setEditor(undefined);
    window.requestAnimationFrame(() => {
      if (element instanceof HTMLElement && element.isConnected) element.focus();
    });
  }, []);

  const foodSaved = (food: Food) => {
    const current = editorRef.current;
    bump();
    closeEditor();
    current?.onSaved?.(food);
  };
  const foodDeleted = () => { bump(); closeEditor(); };

  // 编辑面板打开时，背后的内容不可操作。
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    if (editor) main.setAttribute('inert', '');
    else main.removeAttribute('inert');
  }, [editor]);

  return <div className="cal">
    <style>{stylesheet}</style>
    <section className="cal-frame" ref={mainRef}>
      <header className="cal-top">
        <Tabs value={tab} onChange={switchTab} />
      </header>
      <main className="cal-scroll">
        <div className="cal-page" key={tab}>
          {tab === 'daily' && <DailyPage
            revision={revision} onOpenFood={openFood} onOpenProfile={() => switchTab('profile')} onDirtyChange={reportDirty}
          />}
          {tab === 'foods' && <FoodsPage revision={revision} onOpenFood={openFood} />}
          {tab === 'profile' && <ProfilePage onSaved={bump} onDirtyChange={reportDirty} />}
        </div>
      </main>
    </section>
    {editor && <FoodEditor
      key={editor.key} target={editor.target} onClose={closeEditor} onSaved={foodSaved} onDeleted={foodDeleted}
    />}
  </div>;
}
