"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Header from "../../../components/Header.js";
import Chart from "../../../components/Chart.js";
import StatusStrip from "../../../components/StatusStrip.js";
import TrendChip from "../../../components/TrendChip.js";
import Avatar from "../../../components/Avatar.js";
import { useMonitors, getSocket, fmtTime, fmtDay, fmtDuration, codeLabel } from "../../../lib/live.js";
import { RANGES, summarize, trend, tone, codes, incidents, downsample } from "../../../lib/stats.js";
import s from "./detail.module.scss";

const RANGE_LABEL = { "1h": "1h", "24h": "24h", "7d": "7d" };
const LEGEND = [
  ["up", "2xx"],
  ["info", "3xx"],
  ["warn", "4xx"],
  ["down", "5xx / error"],
];

function useHistory(id, range) {
  const [state, setState] = useState({ checks: [], to: 0 });

  useEffect(() => {
    const socket = getSocket();
    const load = () => socket.emit("history", { id, range }, (checks) => setState({ checks, to: Date.now() }));
    const onCheck = (e) => {
      if (e.id !== id) return;
      setState(({ checks }) => {
        const to = e.check.at;
        return { checks: [...checks.filter((c) => c.at >= to - RANGES[range]), e.check], to };
      });
    };
    load();
    socket.on("connect", load);
    socket.on("check", onCheck);
    return () => {
      socket.off("connect", load);
      socket.off("check", onCheck);
    };
  }, [id, range]);

  return state;
}

function DeleteButton({ id }) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);

  function click() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 3000);
      return;
    }
    getSocket().emit("remove", id, () => router.push("/"));
  }

  return (
    <button className={s.delete} data-armed={armed} onClick={click}>
      {armed ? "Click again to confirm" : "Delete monitor"}
    </button>
  );
}

function Tile({ label, value, unit, tone, children }) {
  return (
    <div className={s.tile} data-tone={tone}>
      <span className="label">{label}</span>
      <b className="num">
        {value}
        {unit && <small>{unit}</small>}
      </b>
      {children}
    </div>
  );
}

export default function Detail() {
  const { id } = useParams();
  const [range, setRange] = useState("1h");
  const { monitors, connected } = useMonitors();
  const { checks, to } = useHistory(id, range);
  const m = monitors?.find((x) => x.id === id);

  if (monitors && !m) {
    return (
      <main className="wrap">
        <Header connected={connected} />
        <div className={`panel ${s.missing}`}>
          <p>Monitor not found.</p>
          <Link href="/">← All monitors</Link>
        </div>
      </main>
    );
  }
  if (!m) return <main className="wrap"><Header connected={connected} /></main>;

  const last = m.checks.at(-1);
  const t = trend(m.checks);
  const st = summarize(checks);
  const state = !last ? "idle" : !last.ok ? "down" : t.state === "slow" ? "slow" : "up";
  const codeList = codes(checks);
  const incList = incidents(checks);
  const recent = checks.slice(-20).reverse();

  return (
    <main className="wrap">
      <Header connected={connected} lastAt={last?.at} />

      <Link href="/" className={s.back}>
        ← All monitors
      </Link>

      <section className={s.title} data-tone={state}>
        <Avatar url={m.url} name={m.name} size={56} />
        <div className={s.titleText}>
          <h1>{m.name}</h1>
          <a href={m.url} target="_blank" rel="noreferrer">
            {m.url} ↗
          </a>
          <div className={s.request}>
            <span className={s.verb}>{m.method}</span>
            {m.headerNames.map((h) => (
              <span key={h} title="Header value is hidden">
                {h}: ••••
              </span>
            ))}
            {!!m.bodySize && <span>JSON body · {m.bodySize} B</span>}
          </div>
        </div>
        <span className="pill">{{ idle: "Pending", down: "Down", slow: "Slow", up: "Up" }[state]}</span>
        <DeleteButton id={id} />
      </section>

      <section className={`panel ${s.tiles}`}>
        <Tile label="Current" value={last ? (last.ok ? last.ms : codeLabel(last)) : "—"} unit={last?.ok && "ms"} tone={tone(last)}>
          <TrendChip t={t} />
        </Tile>
        <Tile label={`Uptime · ${RANGE_LABEL[range]}`} value={st.count ? st.uptime.toFixed(2) : "—"} unit={st.count ? "%" : ""} tone={!st.count ? "idle" : st.uptime < 99 ? "down" : "up"} />
        <Tile label="Average" value={st.avg || "—"} unit={st.avg ? "ms" : ""} />
        <Tile label="p95" value={st.p95 || "—"} unit={st.p95 ? "ms" : ""} />
        <Tile label="Fastest" value={st.min || "—"} unit={st.min ? "ms" : ""} />
        <Tile label="Slowest" value={st.max || "—"} unit={st.max ? "ms" : ""} />
      </section>

      <section className={`panel ${s.block}`}>
        <div className={s.blockHead}>
          <div>
            <h2>Response time</h2>
            <span className="label">
              {st.count} checks · last {RANGE_LABEL[range]}
            </span>
          </div>
          <div className={s.tabs} role="tablist">
            {Object.keys(RANGES).map((r) => (
              <button key={r} role="tab" aria-selected={r === range} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <Chart checks={downsample(checks, 600)} from={to - RANGES[range]} to={to} />
      </section>

      <section className={`panel ${s.block}`}>
        <div className={s.blockHead}>
          <div>
            <h2>Status history</h2>
            <span className="label">Last 90 checks · one block per minute</span>
          </div>
          <div className={s.legend}>
            {LEGEND.map(([k, text]) => (
              <span key={k} data-tone={k}>
                <i /> {text}
              </span>
            ))}
          </div>
        </div>
        <StatusStrip checks={m.checks} tall />
      </section>

      <div className={s.split}>
        <section className={`panel ${s.block}`}>
          <div className={s.blockHead}>
            <h2>Status codes</h2>
            <span className="label">{RANGE_LABEL[range]}</span>
          </div>
          {!codeList.length && <p className={s.none}>No data yet.</p>}
          <ul className={s.codes}>
            {codeList.map((c) => (
              <li key={c.status} data-tone={tone(c)}>
                <span className="num">{c.status || "ERR"}</span>
                <div className={s.bar}>
                  <i style={{ width: `${(c.count / st.count) * 100}%` }} />
                </div>
                <span className="num">{c.count}</span>
                <span className={`num ${s.pct}`}>{((c.count / st.count) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`panel ${s.block}`}>
          <div className={s.blockHead}>
            <h2>Incidents</h2>
            <span className="label">{incList.length} total</span>
          </div>
          {!incList.length && <p className={s.none}>No incidents in this range.</p>}
          <ul className={s.incidents}>
            {incList.slice(0, 20).map((inc) => (
              <li key={inc.start} data-tone={inc.end ? "warn" : "down"}>
                <i className="lamp" />
                <div>
                  <b>{inc.end ? "Resolved" : "Ongoing"}</b>
                  <span className="num">
                    {fmtDay(inc.start)} → {inc.end ? fmtDay(inc.end) : "now"}
                  </span>
                </div>
                <span className="num">{codeLabel(inc)}</span>
                <span className="num">{fmtDuration((inc.end || to) - inc.start)}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className={`panel ${s.block}`}>
        <div className={s.blockHead}>
          <h2>Recent checks</h2>
          <span className="label">Change vs. previous check</span>
        </div>
        <div className={s.tableWrap}>
          <table className={s.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Response</th>
                <th>Change</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((c, i) => {
                const prev = recent[i + 1];
                const delta = c.ok && prev?.ok ? Math.round(((c.ms - prev.ms) / prev.ms) * 100) : 0;
                return (
                  <tr key={c.at}>
                    <td className="num">{fmtTime(c.at)}</td>
                    <td>
                      <span className="pill" data-tone={tone(c)}>
                        {codeLabel(c)}
                      </span>
                    </td>
                    <td className="num">{c.ok ? `${c.ms} ms` : "—"}</td>
                    <td className={`num ${s.delta}`} data-tone={delta > 10 ? "slow" : delta < -10 ? "fast" : "normal"}>
                      {delta > 0 ? `+${delta}% slower` : delta < 0 ? `${delta}% faster` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
