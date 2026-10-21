import type { ReactNode } from "react";
import { cx } from "../../lib/cx";
import { CountUp, Reveal } from "./motion";

export interface Stat {
  value: ReactNode;
  label: string;
}

/**
 * One idea per section: a headline, a sentence, a few facts and a few points on one side, and a picture of it on the other.
 * Sections alternate which side the picture is on, so the page reads left, right, left as it scrolls.
 */
export function Split({
  id,
  title,
  lead,
  stats,
  points,
  action,
  flip,
  band,
  children,
}: {
  id: string;
  title: ReactNode;
  lead: ReactNode;
  stats?: Stat[];
  points?: ReactNode[];
  /** A button or link under the words, such as the way on to the docs. */
  action?: ReactNode;
  flip?: boolean;
  band?: boolean;
  children: ReactNode;
}) {
  return (
    <section className={cx("split", flip && "split--flip", band && "split--band")} id={id} aria-labelledby={`${id}-title`}>
      <div className="split__in">
        <Reveal className="split__text">
          <h2 className="l-title" id={`${id}-title`}>
            {title}
          </h2>
          <p className="l-lede">{lead}</p>
          {stats && stats.length > 0 && (
            <dl className="l-stats">
              {stats.map((s) => (
                <div key={s.label}>
                  <dt>{s.label}</dt>
                  <dd>{typeof s.value === "string" ? <CountUp text={s.value} /> : s.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {points && points.length > 0 && (
            <ul className="l-points">
              {points.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
          {action && <div className="l-action">{action}</div>}
        </Reveal>
        <Reveal className="split__visual" delay={140}>
          {children}
        </Reveal>
      </div>
    </section>
  );
}
