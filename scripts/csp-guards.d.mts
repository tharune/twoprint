import type { Plugin } from "vite";

export function cspHash(text: string): string;
export function inlineScripts(html: string): string[];
export function policySources(directive: string, file?: string): string[] | null;
export function connectAllows(sources: string[], url: string): boolean;
export function cspGuards(options?: { file?: string; onVercel?: () => boolean }): Plugin;
