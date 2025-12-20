'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchRecentCompletedGames,
  type GameDoc,
  updateGameTag,
} from '../../lib/firestore-helpers';

type TagEditorProps = {
  gameId: string;
  currentTag: string | null;
  onTagChange?: (next: string | null) => void;
  autoFocus?: boolean;
  inputId?: string;
};

function buildUniqueTagsByRecency(games: GameDoc[]) {
  const sorted = [...games].sort((a, b) => {
    const aTime = a.endedAt?.getTime() ?? 0;
    const bTime = b.endedAt?.getTime() ?? 0;
    return bTime - aTime;
  });
  const seen = new Set<string>();
  const tags: string[] = [];
  sorted.forEach((game) => {
    const label = game.tag?.trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    tags.push(label);
  });
  return { tags, sorted };
}

export function TagEditor({
  gameId,
  currentTag,
  onTagChange,
  autoFocus,
  inputId,
}: TagEditorProps) {
  const [inputValue, setInputValue] = useState(currentTag ?? '');
  const [localTag, setLocalTag] = useState<string | null>(currentTag);
  const [recentGames, setRecentGames] = useState<GameDoc[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lengthWarning, setLengthWarning] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoadingSuggestions(true);
    fetchRecentCompletedGames(75)
      .then((games) => {
        if (!isMounted) return;
        setRecentGames(games);
      })
      .finally(() => {
        if (isMounted) {
          setLoadingSuggestions(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setInputValue(currentTag ?? '');
    setLocalTag(currentTag);
  }, [currentTag]);

  useEffect(() => {
    if (inputValue.length <= 24) {
      setLengthWarning(null);
      return;
    }
    setLengthWarning('Tag name too long');
    const timer = setTimeout(() => setLengthWarning(null), 1500);
    return () => {
      clearTimeout(timer);
    };
  }, [inputValue]);

  const { tags: uniqueTags, sorted: sortedGames } = useMemo(
    () => buildUniqueTagsByRecency(recentGames),
    [recentGames],
  );

  const displayTag = localTag ?? currentTag;

  const suggestions = useMemo(() => {
    if (displayTag) return [];
    const trimmed = inputValue.trim();
    const currentKey = (displayTag ?? '').trim().toLowerCase();
    if (!trimmed) {
      const mostRecentGame = sortedGames[0];
      const primary = mostRecentGame?.tag?.trim();
      const fallback = uniqueTags[0];
      const base = primary || fallback || '';
      return base && base.toLowerCase() !== currentKey ? [base].slice(0, 4) : [];
    }
    const lower = trimmed.toLowerCase();
    return uniqueTags
      .filter((tag) => tag.toLowerCase().startsWith(lower) && tag.toLowerCase() !== currentKey)
      .slice(0, 4);
  }, [displayTag, inputValue, sortedGames, uniqueTags]);

  const commitTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) {
      setError('Enter a tag before saving.');
      return;
    }
    if (trimmed.length > 24) {
      setError('Tag must be 24 characters or fewer.');
      return;
    }
    setSaving(true);
    setError(null);
    setLocalTag(trimmed);
    setInputValue('');
    try {
      await updateGameTag(gameId, trimmed);
      onTagChange?.(trimmed);
      setRecentGames((games) => [
        {
          id: gameId,
          startedAt: null,
          endedAt: new Date(),
          totalRounds: 0,
          roundsPlayed: 0,
          status: 'completed',
          hideScores: false,
          tag: trimmed,
          notes: null,
        },
        ...games.filter((game) => game.id !== gameId),
      ]);
    } catch (err) {
      setLocalTag(null);
      setInputValue('');
      setError(err instanceof Error ? err.message : 'Unable to save tag.');
    } finally {
      setSaving(false);
    }
  };

  const removeTag = async () => {
    setSaving(true);
    setError(null);
    const previousTag = localTag;
    setLocalTag(null);
    try {
      await updateGameTag(gameId, null);
      setInputValue('');
      onTagChange?.(null);
      setRecentGames((games) =>
        games.map((game) => (game.id === gameId ? { ...game, tag: null } : game)),
      );
    } catch (err) {
      setLocalTag(previousTag);
      setError(err instanceof Error ? err.message : 'Unable to remove tag.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="tag-editor">
      <div className="tag-input-row">
        <div className="tag-input-wrapper">
          <input
            type="text"
            value={displayTag ? '' : inputValue}
            placeholder=""
            id={inputId}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commitTag(inputValue);
              }
            }}
            disabled={saving}
            readOnly={!!displayTag}
            autoFocus={autoFocus}
          />
          <div className="tag-chip-slot">
            {displayTag ? (
              <div className="tag-chip">
                <span>{displayTag}</span>
                <button
                  type="button"
                  onClick={removeTag}
                  aria-label="Remove tag"
                  disabled={saving}
                >
                  ×
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div className="tag-helper">
        {lengthWarning ? (
          <span className="text-warning">{lengthWarning}</span>
        ) : null}
        {loadingSuggestions ? (
          <span className="text-muted">Loading suggestions…</span>
        ) : null}
      </div>
      <div className="tag-suggestions">
        {suggestions.map((tag) => (
          <button
            key={tag}
            type="button"
            className="tag-suggestion"
            onClick={() => commitTag(tag)}
            disabled={saving}
          >
            {tag}
          </button>
        ))}
      </div>
      {error ? <p className="error-text">{error}</p> : null}
    </div>
  );
}

