"use client";

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  placeholder?: string;
};

export function SearchInput({
  value,
  onChange,
  inputRef,
  placeholder = "Search clients, projects, commands…",
}: SearchInputProps) {
  return (
    <div className="kxd-cmd-input-wrap">
      <svg
        className="kxd-cmd-input__icon"
        viewBox="0 0 16 16"
        fill="none"
        aria-hidden
      >
        <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.25" />
        <path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="kxd-cmd-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label="Universal command search"
      />
      <kbd className="kxd-cmd-input__hint">esc</kbd>
    </div>
  );
}
