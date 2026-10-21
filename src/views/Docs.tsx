import { useEffect, useState } from "react";
import { href, scrollToSection, useRoute } from "../lib/router";
import { Faq } from "./landing/Faq";
import { Closing, Fees, How, Markets, Modes, Risk, Trust } from "./landing/Sections";
import { canAnimate } from "./landing/motion";

/** The docs' sections in reading order, as the side menu lists them. The ids are the sections' own. */
const DOC_SECTIONS = [
  { id: "how", label: "How orders fill" },
  { id: "risk", label: "Liquidation" },
  { id: "markets", label: "Markets and vaults" },
  { id: "fees", label: "Fees" },
  { id: "modes", label: "Basic and Advanced" },
  { id: "trust", label: "What you trust" },
  { id: "faq", label: "Questions" },
];

/**
 * Everything the home page leaves out: each idea in full, with its picture, in one long page and a menu down the side that marks
 * the section you are reading.
 */
export function Docs() {
  const [animate] = useState(canAnimate);
  const { section } = useRoute();
  const [current, setCurrent] = useState(section ?? DOC_SECTIONS[0].id);

  // The page's code loads on demand, so the app's own scroll to a section can run before the section exists: arriving with one,
  // the page scrolls to it once it has drawn.
  useEffect(() => {
    if (!section) return;
    const id = requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView({ block: "start", behavior: "instant" }));
    return () => cancelAnimationFrame(id);
  }, [section]);

  // The menu follows the reading: the section whose top last passed the upper third of the window is the current one.
  useEffect(() => {
    if (!("IntersectionObserver" in window)) return;
    const watch = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setCurrent(hit.target.id);
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    DOC_SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) watch.observe(el);
    });
    return () => watch.disconnect();
  }, []);

  return (
    <div className="landing docs" data-motion={animate ? "on" : undefined}>
      <div className="docs__in">
        <nav className="docs__nav" aria-label="Docs">
          <h1 className="docs__title">Docs</h1>
          <ol>
            {DOC_SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={href("docs", s.id)}
                  aria-current={current === s.id ? "true" : undefined}
                  onClick={(e) => {
                    if (scrollToSection(s.id)) e.preventDefault();
                    setCurrent(s.id);
                  }}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
        <div className="docs__body">
          <How />
          <Risk />
          <Markets />
          <Fees />
          <Modes />
          <Trust />
          <Faq />
        </div>
      </div>
      <Closing />
    </div>
  );
}
