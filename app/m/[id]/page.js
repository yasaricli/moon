"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// Components
import Header from "@/components/Header";
import Avatar from "@/components/Avatar";
import Chart from "@/components/Chart";
import StatusStrip from "@/components/StatusStrip";
import Timing from "@/components/Timing";
import TrendChip from "@/components/TrendChip";
import MonitorDialog from "@/components/MonitorDialog";

// Partials
import Certificate from "./partials/Certificate";
import DeleteButton from "./partials/DeleteButton";
import Tile from "./partials/Tile";

// Hooks
import useHistory from "@/hooks/useHistory";
import useLiveSync from "@/hooks/useLiveSync";

// Store
import useLiveStore from "@/store/useLiveStore";

// Utils
import { RANGES, summarize, trend, tone, codes, incidents, downsample, avgPhases } from "@/lib/stats";
import { fmtTime, fmtDay, fmtDuration, codeLabel, stateOf } from "@/utils/shortcuts";

// Styles
import Styles from "./styles.module.scss";

const RANGE_LABEL = { "1h": "1h", "24h": "24h", "7d": "7d" };
const LEGEND = [
  ["up", "2xx"],
  ["info", "3xx"],
  ["warn", "4xx"],
  ["down", "5xx / error"],
];

const Detail = () => {
  useLiveSync();
  const { id } = useParams();
  const [range, setRange] = useState("1h");
  const { monitors, loaded } = useLiveStore();
  const { checks, to } = useHistory(id, range);
  const m = monitors.find((x) => x.id === id);

  if (loaded && !m) {
    return (
      <main className="wrap">
        <Header />
        <div className={`panel ${Styles.missing}`}>
          <p>Monitor not found.</p>
          <Link href="/">← All monitors</Link>
        </div>
      </main>
    );
  }
  if (!m) {
    return (
      <main className="wrap">
        <Header />
      </main>
    );
  }

  const last = m.checks.at(-1);
  const t = trend(m.checks);
  const st = summarize(checks);
  const state = stateOf(m.checks);
  const codeList = codes(checks);
  const incList = incidents(checks);
  const recent = checks.slice(-20).reverse();
  const timing = avgPhases(checks);

  return (
    <main className="wrap">
      <Header lastAt={last?.at} />

      <Link href="/" className={Styles.back}>
        ← All monitors
      </Link>

      <section className={Styles.title} data-tone={state}>
        <Avatar url={m.url} name={m.name} size={56} />
        <div className={Styles.titleText}>
          <h1>{m.name}</h1>
          <a href={m.url} target="_blank" rel="noreferrer">
            {m.url} ↗
          </a>
          <div className={Styles.request}>
            <span className={Styles.verb}>{m.method}</span>
            {m.headerNames.map((h) => (
              <span key={h} title="Header value is hidden">
                {h}: ••••
              </span>
            ))}
            {!!m.bodySize && <span>JSON body · {m.bodySize} B</span>}
          </div>
        </div>
        <span className="pill">{{ idle: "Pending", down: "Down", slow: "Slow", up: "Up" }[state]}</span>
        <MonitorDialog monitor={m} label="Edit" />
        <DeleteButton id={id} />
      </section>

      <section className={`panel ${Styles.tiles}`}>
        <Tile label="Current" value={last ? (last.ok ? last.ms : codeLabel(last)) : "—"} unit={last?.ok && "ms"} tone={tone(last)}>
          <TrendChip t={t} />
        </Tile>
        <Tile label={`Uptime · ${RANGE_LABEL[range]}`} value={st.count ? st.uptime.toFixed(2) : "—"} unit={st.count ? "%" : ""} tone={!st.count ? "idle" : st.uptime < 99 ? "down" : "up"} />
        <Tile label="Average" value={st.avg || "—"} unit={st.avg ? "ms" : ""} />
        <Tile label="p95" value={st.p95 || "—"} unit={st.p95 ? "ms" : ""} />
        <Tile label="Fastest" value={st.min || "—"} unit={st.min ? "ms" : ""} />
        <Tile label="Slowest" value={st.max || "—"} unit={st.max ? "ms" : ""} />
      </section>

      <section className={`panel ${Styles.block}`}>
        <div className={Styles.blockHead}>
          <div>
            <h2>Response time</h2>
            <span className="label">
              {st.count} checks · last {RANGE_LABEL[range]}
            </span>
          </div>
          <div className="tabs" role="tablist">
            {Object.keys(RANGES).map((r) => (
              <button key={r} role="tab" aria-selected={r === range} onClick={() => setRange(r)}>
                {RANGE_LABEL[r]}
              </button>
            ))}
          </div>
        </div>
        <Chart checks={downsample(checks, 600)} from={to - RANGES[range]} to={to} />
      </section>

      <div className={Styles.split}>
        <section className={`panel ${Styles.block}`}>
          <div className={Styles.blockHead}>
            <div>
              <h2>Where the time goes</h2>
              <span className="label">From request start to the first byte of the response</span>
            </div>
          </div>
          {timing ? <Timing last={checks.findLast((c) => c.phases)?.phases} avg={timing} /> : <p className={Styles.none}>No timing data in this range yet.</p>}
        </section>

        <section className={`panel ${Styles.block}`}>
          <div className={Styles.blockHead}>
            <div>
              <h2>SSL certificate</h2>
              <span className="label">Checked on every request</span>
            </div>
          </div>
          <Certificate m={m} />
        </section>
      </div>

      <section className={`panel ${Styles.block}`}>
        <div className={Styles.blockHead}>
          <div>
            <h2>Status history</h2>
            <span className="label">Last 90 checks · one block per minute</span>
          </div>
          <div className={Styles.legend}>
            {LEGEND.map(([k, text]) => (
              <span key={k} data-tone={k}>
                <i /> {text}
              </span>
            ))}
          </div>
        </div>
        <StatusStrip checks={m.checks} tall />
      </section>

      <div className={Styles.split}>
        <section className={`panel ${Styles.block}`}>
          <div className={Styles.blockHead}>
            <h2>Status codes</h2>
            <span className="label">{RANGE_LABEL[range]}</span>
          </div>
          {!codeList.length && <p className={Styles.none}>No data yet.</p>}
          <ul className={Styles.codes}>
            {codeList.map((c) => (
              <li key={c.status} data-tone={tone(c)}>
                <span className="num">{c.status || "ERR"}</span>
                <div className={Styles.bar}>
                  <i style={{ width: `${(c.count / st.count) * 100}%` }} />
                </div>
                <span className="num">{c.count}</span>
                <span className={`num ${Styles.pct}`}>{((c.count / st.count) * 100).toFixed(1)}%</span>
              </li>
            ))}
          </ul>
        </section>

        <section className={`panel ${Styles.block}`}>
          <div className={Styles.blockHead}>
            <h2>Incidents</h2>
            <span className="label">{incList.length} total</span>
          </div>
          {!incList.length && <p className={Styles.none}>No incidents in this range.</p>}
          <ul className={Styles.incidents}>
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

      <section className={`panel ${Styles.block}`}>
        <div className={Styles.blockHead}>
          <h2>Recent checks</h2>
          <span className="label">Change vs. previous check</span>
        </div>
        <div className={Styles.tableWrap}>
          <table className={Styles.table}>
            <thead>
              <tr>
                <th>Time</th>
                <th>Status</th>
                <th>Response</th>
                <th>IP</th>
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
                    <td className={`num ${Styles.ip}`}>{c.ip || "—"}</td>
                    <td className={`num ${Styles.delta}`} data-tone={delta > 10 ? "slow" : delta < -10 ? "fast" : "normal"}>
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
};

export default Detail;
