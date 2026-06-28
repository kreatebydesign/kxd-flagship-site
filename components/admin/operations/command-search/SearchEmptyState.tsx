"use client";

type SearchEmptyStateProps = {
  query: string;
  loading?: boolean;
};

export function SearchEmptyState({ query, loading }: SearchEmptyStateProps) {
  if (loading) {
    return (
      <div className="kxd-cmd-empty">
        <p className="kxd-os-body">Searching…</p>
      </div>
    );
  }

  if (query.trim()) {
    return (
      <div className="kxd-cmd-empty">
        <p className="kxd-os-body">No results for &ldquo;{query}&rdquo;</p>
        <p className="kxd-os-meta">Try a client name, proposal number, or command like &ldquo;new report&rdquo;</p>
      </div>
    );
  }

  return (
    <div className="kxd-cmd-empty">
      <p className="kxd-os-meta">Type to search everything in KXD Core</p>
    </div>
  );
}
