"use client";

import Link from "next/link";
import Header from "../components/Header.js";
import Sparkline from "../components/Sparkline.js";
import StatusStrip from "../components/StatusStrip.js";
import TrendChip from "../components/TrendChip.js";
import Avatar from "../components/Avatar.js";
import AddMonitor from "../components/AddMonitor.js";
import Moon, { phaseOf } from "../components/Moon.js";
import { useMonitors, useNow, codeLabel } from "../lib/live.js";
import { summarize, trend, tone } from "../lib/stats.js";
import s from "./page.module.scss";

const STATE_LABEL = { idle: "Pending", down: "Down", slow: "Slow", up: "Up" };

function stateOf(checks) {
  const last = checks.at(-1);
  if (!last) return "idle";
  if (!last.ok) return "down";
  return trend(checks).state === "slow" ? "slow" : "up";
}

function headline(total, down) {
  if (!total) return "Nothing to watch yet";
  if (!down) return "All systems operational";
  if (down === total) return "Every monitor is down";
  return `${down} of ${total} monitors down`;
}

function Card({ m }) {
  const last = m.checks.at(-1);
  const t = trend(m.checks);
  const { uptime, avg, p95 } = summarize(m.checks);
  const state = stateOf(m.checks);

  return (
    <Link href={`/m/${m.id}`} className={`panel ${s.card}`} data-tone={state}>
      <div className={s.cardHead}>
        <Avatar url={m.url} name={m.name} size={36} />
        <div className={s.cardTitle}>
          <strong>{m.name}</strong>
          <span>
            {m.method === "POST" && <b className={s.verb}>POST</b>}
            {m.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
        </div>
        <span className="pill">{STATE_LABEL[state]}</span>
      </div>

      <div className={s.cardReading}>
        <div key={last?.at} className={`${s.big} num flash`} data-tone={tone(last)}>
          {last?.ok ? last.ms : last ? codeLabel(last) : "—"}
          {last?.ok && <small>ms</small>}
        </div>
        <TrendChip t={t} />
      </div>

      <Sparkline checks={m.checks} />
      <StatusStrip checks={m.checks} />

      <dl className={s.cardFoot}>
        <div>
          <dt>Uptime</dt>
          <dd className="num">{m.checks.length ? `${uptime.toFixed(1)}%` : "—"}</dd>
        </div>
        <div>
          <dt>Avg</dt>
          <dd className="num">{avg ? `${avg}ms` : "—"}</dd>
        </div>
        <div>
          <dt>p95</dt>
          <dd className="num">{p95 ? `${p95}ms` : "—"}</dd>
        </div>
        <div>
          <dt>Last code</dt>
          <dd className="num" data-tone={tone(last)}>
            {last ? codeLabel(last) : "—"}
          </dd>
        </div>
      </dl>
    </Link>
  );
}

export default function Dashboard() {
  const { monitors, connected } = useMonitors();
  const now = useNow();
  const list = monitors || [];
  const lasts = list.map((m) => m.checks.at(-1)).filter(Boolean);
  const up = lasts.filter((c) => c.ok);
  const down = lasts.length - up.length;
  const avg = up.length ? Math.round(up.reduce((a, c) => a + c.ms, 0) / up.length) : 0;
  const lastAt = Math.max(0, ...lasts.map((c) => c.at));
  const all = summarize(list.flatMap((m) => m.checks));
  const ago = lastAt && now ? Math.max(0, Math.round((now - lastAt) / 1000)) : 0;

  return (
    <main className="wrap">
      <Header connected={connected} lastAt={lastAt} />

      <section className={s.hero} data-tone={down ? "down" : "up"}>
        <div className={s.heroMoon} title={`Moon phase follows uptime: ${all.uptime.toFixed(2)}%`}>
          <Moon phase={all.count ? phaseOf(all.uptime) : 0.32} size={112} />
        </div>
        <div className={s.heroText}>
          <span className={s.kicker}>
            <i className="lamp" /> {monitors ? "Current status" : "Connecting…"}
          </span>
          <h1>{headline(lasts.length, down)}</h1>
          <p>
            {list.length} {list.length === 1 ? "monitor" : "monitors"} · checked every minute
            {!!lastAt && ` · last check ${ago}s ago`}
          </p>
        </div>
        <dl className={s.heroStats}>
          <div>
            <dt>Uptime · 90 min</dt>
            <dd className="num">
              {all.count ? all.uptime.toFixed(2) : "—"}
              {!!all.count && <small>%</small>}
            </dd>
          </div>
          <div>
            <dt>Avg response</dt>
            <dd className="num">
              {avg || "—"}
              {!!avg && <small>ms</small>}
            </dd>
          </div>
          <div>
            <dt>Up / Down</dt>
            <dd className="num">
              {up.length}
              <small>/</small>
              <span data-tone={down ? "down" : "idle"}>{down}</span>
            </dd>
          </div>
        </dl>
      </section>

      {monitors && !list.length && (
        <div className={`panel ${s.empty}`}>
          <Moon phase={0.15} size={64} />
          <h2>The sky is clear.</h2>
          <p>Add a website or API. moon will check it every minute and chart how fast it answers.</p>
          <AddMonitor label="Add your first monitor" primary />
        </div>
      )}

      {!!list.length && (
        <div className={s.sectionHead}>
          <h2>Monitors</h2>
          <span className="label">Last 90 checks per monitor</span>
        </div>
      )}

      <section className={s.grid}>
        {list.map((m) => (
          <Card key={m.id} m={m} />
        ))}
      </section>
    </main>
  );
}
