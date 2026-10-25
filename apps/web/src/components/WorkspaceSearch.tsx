import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { SearchResultDto } from '@hub/shared';
import { api } from '../lib/api';

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function resultPath(result: SearchResultDto): string {
  if (result.kind === 'plan') return `/plans/${result.id}`;
  return `/plans?grade=${result.grade}&outcome=${encodeURIComponent(result.id)}`;
}

export function WorkspaceSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultDto[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setMessage('');
      setLoading(false);
      setOpen(false);
      return;
    }

    setOpen(true);
    if (trimmed.length < 2) {
      setResults([]);
      setMessage('Type at least 2 characters to search.');
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setMessage('');
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.search(trimmed);
        if (!active) return;
        setResults(response.results);
        setMessage(response.results.length === 0 ? 'No matching plans or outcomes.' : '');
      } catch (error) {
        if (!active) return;
        setResults([]);
        setMessage(error instanceof Error ? error.message : 'Search is unavailable right now.');
      } finally {
        if (active) setLoading(false);
      }
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [query]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setMessage('Type at least 2 characters to search.');
      setOpen(true);
      return;
    }
    setOpen(true);
  }

  function handleSelect(result: SearchResultDto) {
    setOpen(false);
    setQuery('');
    navigate(resultPath(result));
  }

  return (
    <div className="workspace-search">
      <form className="workspace-search-form" onSubmit={handleSubmit} role="search">
        <label className="visually-hidden" htmlFor="workspace-search-input">
          Search plans and curriculum outcomes
        </label>
        <input
          id="workspace-search-input"
          type="search"
          value={query}
          placeholder="Search workspace"
          onChange={(event) => {
            setQuery(event.target.value);
          }}
          onFocus={() => {
            if (query.trim() || results.length > 0) setOpen(true);
          }}
        />
        <button type="submit" className="workspace-search-submit" aria-label="Search">
          <SearchIcon />
        </button>
      </form>

      {open && (
        <div className="workspace-search-results" role="listbox" aria-label="Search results">
          {loading ? (
            <p className="workspace-search-message">Searching workspace…</p>
          ) : results.length > 0 ? (
            results.map((result) => (
              <button
                type="button"
                className="workspace-search-result"
                role="option"
                key={`${result.kind}-${result.id}`}
                onClick={() => handleSelect(result)}
              >
                <span className="workspace-search-result-type">
                  {result.kind === 'plan' ? 'Plan' : 'Outcome'}
                </span>
                <span className="workspace-search-result-copy">
                  <strong>{result.title}</strong>
                  <small>{result.description}</small>
                  <em>{result.meta}</em>
                </span>
              </button>
            ))
          ) : (
            <p className="workspace-search-message">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
