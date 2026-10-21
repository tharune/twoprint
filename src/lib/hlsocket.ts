import { fromRaw, type Candle } from "./candles";

const WS_URL = "wss://api.hyperliquid.xyz/ws";

type Listener = (c: Candle) => void;

/**
 * One shared connection to Hyperliquid's public feed, for the candles the Advanced chart keeps moving. A subscription is
 * counted, sent when the first listener arrives and dropped with the last, and the socket closes when nobody is listening.
 * If the feed cannot be reached the chart still shows its history and refreshes on a timer; nothing here throws.
 */
class Feed {
  private ws: WebSocket | null = null;
  private subs = new Map<string, Set<Listener>>();
  private retry = 0;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private beat: ReturnType<typeof setInterval> | null = null;
  private idle: ReturnType<typeof setTimeout> | null = null;

  private key = (coin: string, interval: string) => `${coin}|${interval}`;

  subscribe(coin: string, interval: string, fn: Listener): () => void {
    const k = this.key(coin, interval);
    let set = this.subs.get(k);
    if (!set) {
      set = new Set();
      this.subs.set(k, set);
      this.send({ method: "subscribe", subscription: { type: "candle", coin, interval } });
    }
    set.add(fn);
    if (this.idle) clearTimeout(this.idle);
    this.idle = null;
    this.open();
    return () => {
      const s = this.subs.get(k);
      if (!s) return;
      s.delete(fn);
      if (s.size === 0) {
        this.subs.delete(k);
        this.send({ method: "unsubscribe", subscription: { type: "candle", coin, interval } });
      }
      if (this.subs.size === 0) this.later();
    };
  }

  /** Closing waits a moment, so a chart that changes market or candle size reuses the connection instead of cutting it mid-handshake. */
  private later() {
    if (this.idle) clearTimeout(this.idle);
    this.idle = setTimeout(() => {
      this.idle = null;
      if (this.subs.size === 0) this.close();
    }, 4000);
  }

  private send(msg: object) {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private open() {
    if (this.ws || typeof WebSocket === "undefined") return;
    let ws: WebSocket;
    try {
      ws = new WebSocket(WS_URL);
    } catch {
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.retry = 0;
      for (const k of this.subs.keys()) {
        const [coin, interval] = k.split("|");
        this.send({ method: "subscribe", subscription: { type: "candle", coin, interval } });
      }
      // The feed drops a connection that has been quiet for a minute.
      this.beat = setInterval(() => this.send({ method: "ping" }), 30_000);
    };
    ws.onmessage = (e) => {
      try {
        const m = JSON.parse(String(e.data)) as { channel?: string; data?: { s?: string; i?: string } & Record<string, string | number> };
        if (m.channel !== "candle" || !m.data?.s || !m.data.i) return;
        const set = this.subs.get(this.key(m.data.s, m.data.i));
        if (!set) return;
        const c = fromRaw(m.data as never);
        if ([c.o, c.h, c.l, c.c].every(Number.isFinite)) set.forEach((fn) => fn(c));
      } catch {
        /* a message that is not a candle is not for us */
      }
    };
    ws.onclose = () => {
      if (this.beat) clearInterval(this.beat);
      this.beat = null;
      this.ws = null;
      if (this.subs.size > 0) {
        this.timer = setTimeout(() => this.open(), Math.min(15_000, 1000 * 2 ** this.retry++));
      }
    };
    ws.onerror = () => ws.close();
  }

  private close() {
    if (this.timer) clearTimeout(this.timer);
    if (this.beat) clearInterval(this.beat);
    this.timer = null;
    this.beat = null;
    this.ws?.close();
    this.ws = null;
  }
}

const feed = new Feed();

/** Calls `fn` with each update of the market's candle of that size until the returned function is called. */
export const watchCandle = (coin: string, interval: string, fn: Listener): (() => void) => feed.subscribe(coin, interval, fn);
