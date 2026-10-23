"use client";

import { useState } from "react";
import Link from "next/link";
import Header from "../components/Header.js";
import Sparkline from "../components/Sparkline.js";
import StatusStrip from "../components/StatusStrip.js";
import TrendChip from "../components/TrendChip.js";
import Avatar from "../components/Avatar.js";
import AddMonitor from "../components/AddMonitor.js";
import GroupDialog from "../components/GroupDialog.js";
import Moon, { phaseOf } from "../components/Moon.js";
import { useMonitors, useNow, usePref, getSocket, codeLabel, headline } from "../lib/live.js";
import { summarize, trend, tone, certDays, certTone } from "../lib/stats.js";
import s from "./page.module.scss";

const STATE_LABEL = { idle: "Pending", down: "Down", slow: "Slow", up: "Up" };

function stateOf(checks) {
  const last = checks.at(-1);
  if (!last) return "idle";
  if (!last.ok) return "down";
  return trend(checks).state === "slow" ? "slow" : "up";
}

const RANK = { down: 0, slow: 1, idle: 2, up: 3 };
const SORTS = {
  custom: { label: "Custom order" },
  name: { label: "Name", by: (a, b) => a.name.localeCompare(b.name) },
  status: { label: "Down first", by: (a, b) => RANK[stateOf(a.checks)] - RANK[stateOf(b.checks)] },
  uptime: { label: "Lowest uptime", by: (a, b) => summarize(a.checks).uptime - summarize(b.checks).uptime },
  slow: { label: "Slowest response", by: (a, b) => summarize(b.checks).avg - summarize(a.checks).avg },
};

// Moves `from` into the slot of `to`.
function move(ids, from, to) {
  const next = ids.filter((id) => id !== from);
  next.splice(next.indexOf(to) + (ids.indexOf(from) < ids.indexOf(to) ? 1 : 0), 0, from);
  return next;
}

// "+ New tab" turns into a name field; Enter creates the tab, Escape or leaving the field cancels.
function NewTab({ onCreated }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  function close() {
    setEditing(false);
    setName("");
  }

  function submit(e) {
    e.preventDefault();
    if (!name.trim()) return close();
    getSocket().emit("group:add", name, (res) => {
      if (res.error) return;
      close();
      onCreated(res.id);
    });
  }

  if (!editing) {
    return (
      <button type="button" className={s.newTab} onClick={() => setEditing(true)}>
        + New tab
      </button>
    );
  }
  return (
    <form className={s.newTab} onSubmit={submit}>
      <input
        autoFocus
        maxLength={40}
        placeholder="Tab name"
        aria-label="Tab name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={close}
        onKeyDown={(e) => e.key === "Escape" && close()}
      />
    </form>
  );
}

function CertChip({ cert }) {
  const days = certDays(cert, Date.now());
  return (
    <em className={s.certChip} data-tone={certTone(days)} title={`SSL certificate expires ${new Date(cert.expires).toDateString()}`}>
      SSL · {days < 0 ? "expired" : `${days}d`}
    </em>
  );
}

// drag: drag-and-drop handlers, only while the custom order is shown.
// ponytail: native HTML5 drag events, so no reordering on most touch screens; the sort menu still works there
function Card({ m, drag }) {
  const last = m.checks.at(-1);
  const t = trend(m.checks);
  const { uptime, avg, p95 } = summarize(m.checks);
  const state = stateOf(m.checks);

  return (
    <Link
      href={`/m/${m.id}`}
      className={`panel ${s.card}`}
      data-tone={state}
      data-dragging={drag?.id === m.id || undefined}
      {...(drag && {
        draggable: true,
        onDragStart: (e) => {
          e.dataTransfer.effectAllowed = "move";
          drag.start(m.id);
        },
        onDragEnter: () => drag.enter(m.id),
        onDragOver: (e) => e.preventDefault(),
        onDragEnd: drag.end,
      })}
    >
      <div className={s.cardHead}>
        <Avatar url={m.url} name={m.name} size={36} />
        <div className={s.cardTitle}>
          <strong>{m.name}</strong>
          <span>
            {m.method === "POST" && <b className={s.verb}>POST</b>}
            {m.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
          {m.cert && <CertChip cert={m.cert} />}
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
  const { monitors, groups, connected } = useMonitors();
  const now = useNow();
  const [tab, setTab] = usePref("moon.group", "");
  const [sort, setSort] = usePref("moon.sort", "custom");
  const [dragId, setDragId] = useState();
  const [dragOrder, setDragOrder] = useState();
  const list = monitors || [];
  const group = groups.find((g) => g.id === tab);
  const ordered = dragOrder ? dragOrder.map((id) => list.find((m) => m.id === id)).filter(Boolean) : list;
  const shown = (SORTS[sort]?.by ? [...ordered].sort(SORTS[sort].by) : ordered).filter((m) => !group || m.group === group.id);
  // ids cover every monitor, so dragging inside a group tab keeps the others in place
  const drag = SORTS[sort]?.by ? undefined : {
    id: dragId,
    start(id) {
      setDragId(id);
      setDragOrder(list.map((m) => m.id));
    },
    enter(id) {
      if (!dragId || id === dragId) return;
      setDragOrder((ids) => ids && move(ids, dragId, id));
    },
    end() {
      setDragId(undefined);
      if (!dragOrder) return;
      getSocket().emit("reorder", dragOrder, () => setDragOrder(undefined));
    },
  };
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
          <div className="tabs" role="tablist" aria-label="Tabs">
            <button role="tab" aria-selected={!group} onClick={() => setTab("")}>
              All<small>{list.length}</small>
            </button>
            {groups.map((g) => (
              <button key={g.id} role="tab" aria-selected={g.id === group?.id} onClick={() => setTab(g.id)}>
                {g.name}
                <small>{list.filter((m) => m.group === g.id).length}</small>
              </button>
            ))}
          </div>
          <NewTab onCreated={setTab} />
          {group && <GroupDialog key={group.id} group={group} groups={groups} monitors={list} label="Edit tab" />}
          <span className={`label ${s.hint}`}>{drag && shown.length > 1 ? "Drag cards to reorder" : ""}</span>
          <label className={s.sort}>
            <span className="label">Sort</span>
            <select value={SORTS[sort] ? sort : "custom"} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {group && !shown.length && (
        <div className={`panel ${s.empty}`}>
          <Moon phase={0.15} size={64} />
          <h2>{group.name} is empty.</h2>
          <p>Pick the monitors that belong in this tab.</p>
          <GroupDialog group={group} groups={groups} monitors={list} label="Add monitors" primary />
        </div>
      )}

      <section className={s.grid}>
        {shown.map((m) => (
          <Card key={m.id} m={m} drag={drag} />
        ))}
      </section>
    </main>
  );
}
