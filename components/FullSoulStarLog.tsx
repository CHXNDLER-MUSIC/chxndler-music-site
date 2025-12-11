"use client";

import { useEffect, useMemo, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { loadSoulStarFullLog, SoulJournalWithPrompt } from '@/utils/soulJournal';

type Props = {
  userId: string;
};

export default function FullSoulStarLog({ userId }: Props) {
  const [entries, setEntries] = useState<SoulJournalWithPrompt[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [error, setError] = useState<string>('');

  const elementColors = useMemo(
    () => ({
      heart: { color: '#F91880' },
      water: { color: '#38B6FF' },
      lightning: { color: '#F2EF1D' },
      darkness: { color: '#FFFFFF' },
    }),
    []
  );

  useEffect(() => {
    if (!userId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = await loadSoulStarFullLog(supabaseClient, userId);
        if (mounted) setEntries(data);
      } catch (e: any) {
        console.error('Failed to load soul star full log:', e);
        if (mounted) setError(e?.message || 'Failed to load log');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const formatDate = (dateString: string) => {
    try {
      // Parse YYYY-MM-DD as local date to avoid timezone shifting
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      return localDate.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric', weekday: 'short'
      });
    } catch {
      return dateString;
    }
  };

  const togglePrivate = async (id: string, current: boolean | null) => {
    try {
      const { error } = await supabaseClient
        .from('soul_journal_entries')
        .update({ is_public: current === null ? true : !current })
        .eq('entry_id', id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.entry_id === id ? { ...e, is_private: !current } : e));
    } catch (e: any) {
      console.error('Toggle private failed:', e);
      setError(e?.message || 'Failed to update privacy');
      setTimeout(() => setError(''), 2500);
    }
  };

  const startEdit = (entry: SoulJournalWithPrompt) => {
    setEditingId(entry.entry_id);
    setEditValue(entry.soul_star || '');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue('');
  };

  const saveEdit = async (id: string) => {
    try {
      const trimmed = editValue.trim();
      const { error } = await supabaseClient
        .from('soul_journal_entries')
        .update({ soul_star: trimmed })
        .eq('entry_id', id);
      if (error) throw error;
      setEntries(prev => prev.map(e => e.entry_id === id ? { ...e, soul_star: trimmed } : e));
      setEditingId(null);
      setEditValue('');
    } catch (e: any) {
      console.error('Save edit failed:', e);
      setError(e?.message || 'Failed to save edit');
      setTimeout(() => setError(''), 2500);
    }
  };

  if (!userId) return null;

  return (
    <div className="w-full space-y-3">
      {loading && <div>Loading your full Soul Star log…</div>}
      {error && (
        <div className="text-red-400 text-sm">{error}</div>
      )}

      {(!loading && entries.length === 0) && (
        <div className="text-sm opacity-80">No entries yet.</div>
      )}

      {entries.map((entry) => {
        const color = elementColors[entry.element as keyof typeof elementColors]?.color || '#F2EF1D';
        const isEditing = editingId === entry.entry_id;
        return (
          <div
            key={entry.entry_id}
            className="rounded-lg p-3 border"
            style={{ borderColor: `${color}60`, background: 'rgba(0,0,0,0.5)' }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full border" style={{ borderColor: color, color }}>{entry.element}</span>
                <span className="text-sm opacity-80">{formatDate(entry.entry_date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs px-2 py-1 rounded border"
                  onClick={() => togglePrivate(entry.entry_id, entry.is_private ?? false)}
                  style={{ borderColor: color, color }}
                >
                  {entry.is_private ? 'Private' : 'Public'}
                </button>
                {!isEditing ? (
                  <button
                    className="text-xs px-2 py-1 rounded border"
                    onClick={() => startEdit(entry)}
                    style={{ borderColor: color, color }}
                  >
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button className="text-xs px-2 py-1 rounded border" onClick={() => saveEdit(entry.entry_id)} style={{ borderColor: color, color }}>Save</button>
                    <button className="text-xs px-2 py-1 rounded border" onClick={cancelEdit} style={{ borderColor: color, color }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-2">
              <div className="text-xs font-semibold mb-1" style={{ color }}>✨ Prompt</div>
              <div className="text-sm leading-relaxed">{entry.prompt || '—'}</div>
            </div>

            <div>
              <div className="text-xs font-semibold mb-1" style={{ color }}>⭐ Your Soul Star</div>
              {!isEditing ? (
                <div className="text-sm leading-relaxed whitespace-pre-wrap">{entry.soul_star || '—'}</div>
              ) : (
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full p-2 rounded border text-sm"
                  rows={3}
                  style={{ borderColor: `${color}60`, background: 'rgba(0,0,0,0.6)' }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
