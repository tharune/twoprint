import { useId, type SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function icon(paths: React.ReactNode) {
  return function Icon(props: IconProps) {
    return (
      <svg viewBox="0 0 24 24" className="icon" aria-hidden="true" focusable="false" {...props}>
        {paths}
      </svg>
    );
  };
}

export const IconExternal = icon(<path d="M8 16 16 8M9 8h7v7" />);
export const IconCopy = icon(
  <>
    <rect x="9" y="9" width="11" height="11" rx="2.5" />
    <path d="M15 9V6.5A2.5 2.5 0 0 0 12.5 4h-6A2.5 2.5 0 0 0 4 6.5v6A2.5 2.5 0 0 0 6.5 15H9" />
  </>,
);
export const IconCheck = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const IconChevronDown = icon(<path d="m6 9 6 6 6-6" />);
export const IconClose = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </>,
);
export const IconSun = icon(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
  </>,
);
export const IconMoon = icon(<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />);
export const IconInfo = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </>,
);
export const IconAlert = icon(
  <>
    <path d="M12 3.5 2.8 19.5h18.4L12 3.5Z" />
    <path d="M12 10v4M12 17h.01" />
  </>,
);
export const IconCircleCheck = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.5 3 3 5-6" />
  </>,
);
export const IconCircleX = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </>,
);
// The landing page's icon set: the same 24 px stroke style, one idea per icon.

/** Two offset sheets that darken where they overlap: the original and its copy. */
export function Logo({ size = 24 }: { size?: number }) {
  const id = useId();
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <clipPath id={id}>
          <rect x="7" y="3" width="14" height="14" rx="3.5" />
        </clipPath>
      </defs>
      <rect x="3" y="7" width="14" height="14" rx="3.5" style={{ fill: "var(--ink)" }} />
      <rect x="7" y="3" width="14" height="14" rx="3.5" style={{ fill: "var(--carbon)" }} />
      <rect x="3" y="7" width="14" height="14" rx="3.5" clipPath={`url(#${id})`} style={{ fill: "var(--ink)", opacity: 0.7 }} />
    </svg>
  );
}
