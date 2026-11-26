import { useCallback, useEffect, useState } from 'react';
import { confirmDiscard } from '../dirty.ts';
import { useResource } from '../requests.ts';
import { Banner } from '../ui.tsx';
import { loadProfile } from './draft.ts';
import type { ProfileRecord } from './draft.ts';
import { ProfileForm } from './profile-form.tsx';

type Props = {
  onSaved: () => void;
  onDirtyChange: (dirty: boolean) => void;
};

export function ProfilePage({ onSaved, onDirtyChange }: Props) {
  const load = useCallback((signal: AbortSignal) => loadProfile(signal), []);
  const { data, error, refresh } = useResource(load);
  const [saved, setSaved] = useState<ProfileRecord>();
  const [justSaved, setJustSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const report = useCallback((value: boolean) => { setDirty(value); onDirtyChange(value); }, [onDirtyChange]);
  const profile = saved ?? data;

  useEffect(() => {
    if (!justSaved) return;
    const timer = window.setTimeout(() => setJustSaved(false), 4000);
    return () => window.clearTimeout(timer);
  }, [justSaved]);

  const reload = () => {
    if (!confirmDiscard(dirty)) return;
    setSaved(undefined);
    refresh();
  };
  const handleSaved = (next: ProfileRecord) => {
    setSaved(next);
    setJustSaved(true);
    onSaved();
  };

  return <div className="cal-profile">
    {error && !profile && <Banner onRetry={refresh}>{error}</Banner>}
    {!profile && !error && <div className="cal-card"><div className="cal-skeleton is-tall" aria-busy="true" /></div>}
    {profile && <ProfileForm
      key={`${profile.version ?? 'new'}:${saved ? 'saved' : 'loaded'}`}
      profile={profile} justSaved={justSaved} onSaved={handleSaved} onEdit={() => setJustSaved(false)}
      onReload={reload} reportDirty={report}
    />}
  </div>;
}
