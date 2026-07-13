import type { ReactNode } from "react";

interface WorkspaceHeaderProps {
  titleId: string;
  title: string;
  description: string;
  trailing?: ReactNode;
}

export function WorkspaceHeader({
  titleId,
  title,
  description,
  trailing,
}: WorkspaceHeaderProps) {
  return (
    <header className="hh-workspace-header">
      <div className="min-w-0">
        <h1 id={titleId} className="hh-workspace-title">{title}</h1>
        <p className="hh-workspace-copy">{description}</p>
      </div>
      {trailing ? <div className="hh-workspace-header__aside">{trailing}</div> : null}
    </header>
  );
}

export function WorkspaceControlLabel({ children }: { children: ReactNode }) {
  return <span className="hh-control-label">{children}</span>;
}

interface WorkspaceSelectControlProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function WorkspaceSelectControl({
  id,
  label,
  value,
  onChange,
  children,
  className = "w-44",
  ariaLabel,
}: WorkspaceSelectControlProps) {
  return (
    <label htmlFor={id} className={`hh-control-group min-w-0 ${className}`}>
      <WorkspaceControlLabel>{label}</WorkspaceControlLabel>
      <select
        id={id}
        aria-label={ariaLabel}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="hh-select w-full"
      >
        {children}
      </select>
    </label>
  );
}

export interface WorkspaceSegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
}

interface WorkspaceSegmentedControlProps<T extends string> {
  label: string;
  value: T;
  options: ReadonlyArray<WorkspaceSegmentOption<T>>;
  onChange: (value: T) => void;
  reducedMotion: boolean;
  tone?: "accent" | "academy";
}

export function WorkspaceSegmentedControl<T extends string>({
  label,
  value,
  options,
  onChange,
  reducedMotion,
  tone = "accent",
}: WorkspaceSegmentedControlProps<T>) {
  return (
    <div className="hh-control-group">
      <WorkspaceControlLabel>{label}</WorkspaceControlLabel>
      <div
        role="group"
        aria-label={label}
        className="hh-segmented"
        data-tone={tone}
        data-reduced-motion={reducedMotion ? "true" : "false"}
      >
        {options.map((option) => {
          const active = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.value)}
              className="hh-segmented__option"
            >
              {option.icon}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
