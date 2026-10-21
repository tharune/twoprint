import { createPortal } from "react-dom";
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { explorerTx } from "../config/chains";
import { cx } from "../lib/cx";
import { short } from "../lib/format";
import { IconAlert, IconCheck, IconChevronDown, IconCircleCheck, IconCircleX, IconCopy, IconExternal, IconInfo } from "./icons";

// ---------------------------------------------------------------- buttons

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "long" | "short";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  busy?: boolean;
};

export function Button({ variant = "primary", size = "md", block, busy, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx("btn", `btn--${variant}`, size !== "md" && `btn--${size}`, block && "btn--block", className)}
    >
      {busy && <span className="spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- segmented control

interface SegOption<T> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
  tone?: "long" | "short";
  disabled?: boolean;
  /** What the option means in full, for a tooltip and a screen reader. The label stays in the name, as the label-in-name rule asks. */
  title?: string;
}

/** A single-choice control with radiogroup semantics and arrow-key navigation. */
export function Segmented<T extends string | number>({
  value,
  onChange,
  options,
  label,
  size,
  full,
  tinted,
}: {
  value: T;
  onChange: (v: T) => void;
  options: SegOption<T>[];
  label: string;
  size?: "sm" | "lg";
  full?: boolean;
  /** Tint the selected option by its tone (long and short). */
  tinted?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const move = (from: number, dir: 1 | -1) => {
    for (let step = 1; step <= options.length; step++) {
      const i = (from + dir * step + options.length * 2) % options.length;
      if (!options[i].disabled) {
        onChange(options[i].value);
        refs.current[i]?.focus();
        return;
      }
    }
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") (e.preventDefault(), move(i, 1));
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") (e.preventDefault(), move(i, -1));
    else if (e.key === "Home") (e.preventDefault(), move(-1, 1));
    else if (e.key === "End") (e.preventDefault(), move(options.length, -1));
  };
  return (
    <div role="radiogroup" aria-label={label} className={cx("seg", full && "seg--full", size && `seg--${size}`, tinted && "seg--long")}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            disabled={o.disabled}
            data-tone={o.tone}
            title={o.title}
            aria-label={o.title && typeof o.label === "string" ? `${o.label}, ${o.title}` : undefined}
            className="seg__opt"
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {o.label}
            {o.hint !== undefined && <span className="seg__hint">{o.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Tabs with tablist semantics and arrow-key navigation. The panel that follows carries role="tabpanel" and the matching ids. */
export function Tabs<T extends string>({ value, onChange, tabs, label, idPrefix }: { value: T; onChange: (v: T) => void; tabs: { value: T; label: ReactNode; count?: number }[]; label: string; idPrefix: string }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const go = (i: number) => {
    const next = (i + tabs.length) % tabs.length;
    onChange(tabs[next].value);
    refs.current[next]?.focus();
  };
  const onKey = (e: KeyboardEvent, i: number) => {
    if (e.key === "ArrowRight") (e.preventDefault(), go(i + 1));
    else if (e.key === "ArrowLeft") (e.preventDefault(), go(i - 1));
    else if (e.key === "Home") (e.preventDefault(), go(0));
    else if (e.key === "End") (e.preventDefault(), go(tabs.length - 1));
  };
  return (
    <div role="tablist" aria-label={label} className="tabs">
      {tabs.map((t, i) => (
        <button
          key={t.value}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="tab"
          id={`${idPrefix}-tab-${t.value}`}
          aria-selected={t.value === value}
          aria-controls={`${idPrefix}-panel-${t.value}`}
          tabIndex={t.value === value ? 0 : -1}
          className="tabs__tab"
          onClick={() => onChange(t.value)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
          {t.count !== undefined && <span className="tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- fields

export function Field({ label, aside, hint, children, as: As = "div" }: { label?: ReactNode; aside?: ReactNode; hint?: ReactNode; children: ReactNode; as?: "div" | "label" }) {
  return (
    <As className="field">
      {(label || aside) && (
        <span className="field__label">
          <span>{label}</span>
          {aside && <span>{aside}</span>}
        </span>
      )}
      {children}
      {hint && <span className="field__hint">{hint}</span>}
    </As>
  );
}

export function Input({ unit, small, large, invalid, className, ...rest }: InputHTMLAttributes<HTMLInputElement> & { unit?: ReactNode; small?: boolean; large?: boolean; invalid?: boolean }) {
  return (
    <div className={cx("input", small && "input--sm", large && "input--lg", className)} aria-invalid={invalid || undefined}>
      <input {...rest} />
      {unit && <span className="input__unit">{unit}</span>}
    </div>
  );
}

export function Chips<T extends string | number>({
  options,
  value,
  onChange,
  label,
  format,
  fill,
}: {
  options: T[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
  format?: (v: T) => ReactNode;
  /** Stretch the options across the row. */
  fill?: boolean;
}) {
  return (
    <div className={cx("chips", fill && "chips--fill")} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={String(o)} type="button" className="chip" aria-pressed={o === value} onClick={() => onChange(o)}>
          {format ? format(o) : o}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- badges and notices

type Tone = "neutral" | "long" | "short" | "warn" | "carbon" | "solid";

export function Badge({ tone = "neutral", dot, title, children }: { tone?: Tone; dot?: boolean; title?: string; children: ReactNode }) {
  return (
    <span className={cx("badge", tone !== "neutral" && `badge--${tone}`, dot && "badge--dot")} title={title}>
      {children}
    </span>
  );
}

export function SideBadge({ isLong }: { isLong: boolean }) {
  return <Badge tone={isLong ? "long" : "short"}>{isLong ? "Long" : "Short"}</Badge>;
}

export function Notice({ tone = "info", title, children, actions }: { tone?: "info" | "warn" | "error" | "success"; title?: ReactNode; children?: ReactNode; actions?: ReactNode }) {
  const Icon = tone === "warn" ? IconAlert : tone === "error" ? IconCircleX : tone === "success" ? IconCircleCheck : IconInfo;
  return (
    <div className={cx("notice", tone !== "info" && `notice--${tone}`)} role={tone === "error" ? "alert" : undefined}>
      <Icon />
      <div className="notice__body">
        {title && <div className="notice__title">{title}</div>}
        {children}
        {actions && <div className="notice__actions">{actions}</div>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- receipt rows

export function Receipt({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return (
    <dl className={cx("receipt", className)} aria-label={label}>
      {children}
    </dl>
  );
}

export function ReceiptRow({ label, children, note, tone, total }: { label: ReactNode; children: ReactNode; note?: ReactNode; tone?: "long" | "short" | "warn" | "muted"; total?: boolean }) {
  return (
    <div className={cx("receipt__row", total && "receipt__row--total")}>
      <dt>{label}</dt>
      <dd className={tone ? (tone === "muted" ? "muted" : `text-${tone}`) : undefined}>{children}</dd>
      {note && <dd className="receipt__note">{note}</dd>}
    </div>
  );
}

/** A one-line live check: a reconciliation that holds, or one that does not. */
export function Check({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p className={cx("check", ok ? "check--ok" : "check--bad")}>
      {ok ? <IconCircleCheck /> : <IconAlert />}
      <span>{children}</span>
    </p>
  );
}

// ---------------------------------------------------------------- numbers

export function Stat({ label, value, sub, tone, large }: { label: ReactNode; value: ReactNode; sub?: ReactNode; tone?: "long" | "short" | "warn"; large?: boolean }) {
  return (
    <div className="stat">
      <div className="stat__label">{label}</div>
      <div className={cx("stat__value", large && "stat__value--lg", tone && `text-${tone}`)}>{value}</div>
      {sub && <div className="stat__sub">{sub}</div>}
    </div>
  );
}

/** A value against a cap. */
export function Gauge({ label, value, cap, fmt, tone, note }: { label: ReactNode; value: bigint; cap: bigint; fmt: (v: bigint) => string; tone?: "long" | "short" | "warn" | "carbon"; note?: ReactNode }) {
  const share = cap > 0n ? Math.min(100, Number((value * 10_000n) / cap) / 100) : 0;
  const level = tone ?? (share >= 90 ? "short" : share >= 70 ? "warn" : undefined);
  return (
    <div className="gauge">
      <div className="gauge__top">
        <span className="gauge__label">{label}</span>
        <span className="gauge__value">
          {fmt(value)} <span className="muted">of {fmt(cap)}</span>
        </span>
      </div>
      <div className="gauge__track" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(share)} aria-label={typeof label === "string" ? label : undefined}>
        <div className="gauge__fill" data-tone={level} style={{ width: `${share}%` }} />
      </div>
      <div className="gauge__foot">
        <span>{share.toFixed(share > 0 && share < 1 ? 2 : 1)}% used</span>
        {note && <span>{note}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- links and addresses

export function TxLink({ chainId, hash, label }: { chainId: number; hash?: string; label?: string }) {
  if (!hash) return null;
  const url = explorerTx(chainId, hash);
  const text = label ?? short(hash);
  return url ? (
    <a className="txlink" href={url} target="_blank" rel="noreferrer">
      {text}
      <IconExternal />
    </a>
  ) : (
    <span className="txlink" title={`${hash} (local node, no explorer)`} style={{ color: "var(--muted)" }}>
      {text}
    </span>
  );
}

export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(false), 1400);
    return () => clearTimeout(t);
  }, [done]);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={done ? "Copied" : label}
      title={done ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
        } catch {
          /* clipboard unavailable (insecure context or denied) */
        }
      }}
    >
      {done ? <IconCheck /> : <IconCopy />}
    </button>
  );
}

// ---------------------------------------------------------------- dialog

/** A modal built on the native dialog element: focus trap, Escape and the backdrop come for free. */
export function Modal({
  open,
  onClose,
  title,
  sub,
  children,
  footer,
  wide,
  name,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  sub?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  /** What a screen reader calls the dialog while it is closed and its title is not on the page. Defaults to a plain title. */
  name?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  // Rendered into <body> so it never inherits styles from wherever it was opened (a table cell, a menu).
  return createPortal(
    <dialog
      ref={ref}
      className={cx("modal", wide && "modal--wide")}
      aria-label={open ? undefined : (name ?? (typeof title === "string" ? title : "Dialog"))}
      aria-labelledby={open ? titleId : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      {open && (
        <>
          <div className="modal__head">
            <div>
              <h2 className="modal__title" id={titleId}>
                {title}
              </h2>
              {sub && <p className="modal__sub">{sub}</p>}
            </div>
            <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
              <svg viewBox="0 0 24 24" className="icon" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <div className="modal__body">
            {children}
            {footer && <div className="modal__foot">{footer}</div>}
          </div>
        </>
      )}
    </dialog>,
    document.body,
  );
}

// ---------------------------------------------------------------- popover

/** A trigger plus a floating panel. Closes on outside press and Escape; focus returns to the trigger. */
export function Popover({
  trigger,
  children,
  align = "right",
  label,
  panelClass,
}: {
  trigger: (p: { open: boolean; toggle: () => void }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  label: string;
  /** Extra class for the floating panel, for a panel wider than a menu. */
  panelClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  // How far the panel is moved sideways to stay inside the window, so a menu opened near an edge of a phone is never cut off.
  const [shift, setShift] = useState(0);
  const close = useCallback(() => setOpen(false), []);
  useLayoutEffect(() => {
    const el = panel.current;
    if (!open || !el) {
      setShift(0);
      return;
    }
    const r = el.getBoundingClientRect();
    const edge = 8;
    const width = document.documentElement.clientWidth;
    setShift(r.right > width - edge ? width - edge - r.right : r.left < edge ? edge - r.left : 0);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        box.current?.querySelector<HTMLElement>("[data-pop-trigger]")?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="pop" ref={box}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div
          ref={panel}
          className={cx("pop__panel", align === "left" && "pop__panel--left", panelClass)}
          style={shift ? (align === "left" ? { marginLeft: shift } : { marginRight: -shift }) : undefined}
          role="group"
          aria-label={label}
        >
          {children(close)}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- misc

/** A table that scrolls sideways on a narrow screen. It takes focus, so the arrow keys can scroll it. */
export function TableWrap({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div className={className ? `table-wrap ${className}` : "table-wrap"} role="region" aria-label={label} tabIndex={0}>
      {children}
    </div>
  );
}

export function Empty({ title, children, action }: { title: ReactNode; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function Disclosure({ summary, children, defaultOpen }: { summary: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details className="disclosure" open={defaultOpen}>
      <summary>
        <span>{summary}</span>
        <IconChevronDown />
      </summary>
      {children}
    </details>
  );
}

export function PageHeader({ title, lede, actions }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="page-head__text">
        <h1 className="page-head__title">{title}</h1>
        {lede && <p className="page-head__lede">{lede}</p>}
      </div>
      {actions && <div className="page-head__actions">{actions}</div>}
    </header>
  );
}
