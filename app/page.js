"use client";

import { useEffect, useState } from "react";

// Components
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Moon, { phaseOf } from "@/components/Moon";
import MonitorDialog from "@/components/MonitorDialog";
import GroupDialog from "@/components/GroupDialog";

// Partials
import MonitorCard from "./partials/MonitorCard";
import NewTab from "./partials/NewTab";

// Hooks
import useLiveSync from "@/hooks/useLiveSync";
import useNow from "@/hooks/useNow";

// Store
import useLiveStore from "@/store/useLiveStore";
import usePrefsStore from "@/store/usePrefsStore";

// Utils
import { summarize } from "@/lib/stats";
import { headline, stateOf, move } from "@/utils/shortcuts";
import { getSocket } from "@/utils/socket";

// Styles
import Styles from "./styles.module.scss";

const RANK = { down: 0, slow: 1, idle: 2, up: 3 };
const SORTS = {
  custom: { label: "Custom order" },
  name: { label: "Name", by: (a, b) => a.name.localeCompare(b.name) },
  status: { label: "Down first", by: (a, b) => RANK[stateOf(a.checks)] - RANK[stateOf(b.checks)] },
  uptime: { label: "Lowest uptime", by: (a, b) => summarize(a.checks).uptime - summarize(b.checks).uptime },
  slow: { label: "Slowest response", by: (a, b) => summarize(b.checks).avg - summarize(a.checks).avg },
};

const Dashboard = () => {
  useLiveSync();
  const { monitors, groups, loaded } = useLiveStore();
  const { group: tab, sort, setGroup, setSort } = usePrefsStore();
  const now = useNow();
  const [dragId, setDragId] = useState();
  const [dragOrder, setDragOrder] = useState();

  useEffect(() => {
    usePrefsStore.persist.rehydrate();
  }, []);

  const group = groups.find((g) => g.id === tab);
  const ordered = dragOrder ? dragOrder.map((id) => monitors.find((m) => m.id === id)).filter(Boolean) : monitors;
  const shown = (SORTS[sort]?.by ? [...ordered].sort(SORTS[sort].by) : ordered).filter((m) => !group || m.group === group.id);
  // ids cover every monitor, so dragging inside a group tab keeps the others in place
  const drag = SORTS[sort]?.by ? undefined : {
    id: dragId,
    start: (id) => {
      setDragId(id);
      setDragOrder(monitors.map((m) => m.id));
    },
    enter: (id) => {
      if (!dragId || id === dragId) return;
      setDragOrder((ids) => ids && move(ids, dragId, id));
    },
    end: () => {
      setDragId(undefined);
      if (!dragOrder) return;
      getSocket().emit("reorder", dragOrder, () => setDragOrder(undefined));
    },
  };

  const lasts = monitors.map((m) => m.checks.at(-1)).filter(Boolean);
  const up = lasts.filter((c) => c.ok);
  const down = lasts.length - up.length;
  const avg = up.length ? Math.round(up.reduce((a, c) => a + c.ms, 0) / up.length) : 0;
  const lastAt = Math.max(0, ...lasts.map((c) => c.at));
  const all = summarize(monitors.flatMap((m) => m.checks));
  const ago = lastAt && now ? Math.max(0, Math.round((now - lastAt) / 1000)) : 0;

  return (
    <main className="wrap">
      <Header lastAt={lastAt} />

      <Hero
        tone={down ? "down" : "up"}
        phase={all.count ? phaseOf(all.uptime) : 0.32}
        moonTitle={`Moon phase follows uptime: ${all.uptime.toFixed(2)}%`}
        kicker={loaded ? "Current status" : "Connecting…"}
        title={headline(lasts.length, down)}
        subtitle={
          <>
            {monitors.length} {monitors.length === 1 ? "monitor" : "monitors"} · checked every minute
            {!!lastAt && ` · last check ${ago}s ago`}
          </>
        }
      >
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
      </Hero>

      {loaded && !monitors.length && (
        <div className={`panel ${Styles.empty}`}>
          <Moon phase={0.15} size={64} />
          <h2>The sky is clear.</h2>
          <p>Add a website or API. moon will check it every minute and chart how fast it answers.</p>
          <MonitorDialog label="Add your first monitor" primary />
        </div>
      )}

      {!!monitors.length && (
        <div className={Styles.sectionHead}>
          <div className="tabs" role="tablist" aria-label="Tabs">
            <button role="tab" aria-selected={!group} onClick={() => setGroup("")}>
              All<small>{monitors.length}</small>
            </button>
            {groups.map((g) => (
              <button key={g.id} role="tab" aria-selected={g.id === group?.id} onClick={() => setGroup(g.id)}>
                {g.name}
                <small>{monitors.filter((m) => m.group === g.id).length}</small>
              </button>
            ))}
          </div>
          <NewTab onCreated={setGroup} />
          {group && <GroupDialog key={group.id} group={group} label="Edit tab" />}
          <span className={`label ${Styles.hint}`}>{drag && shown.length > 1 ? "Drag cards to reorder" : ""}</span>
          <label className={Styles.sort}>
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
        <div className={`panel ${Styles.empty}`}>
          <Moon phase={0.15} size={64} />
          <h2>{group.name} is empty.</h2>
          <p>Pick the monitors that belong in this tab.</p>
          <GroupDialog group={group} label="Add monitors" primary />
        </div>
      )}

      <section className={Styles.grid}>
        {shown.map((m) => (
          <MonitorCard key={m.id} m={m} drag={drag} />
        ))}
      </section>
    </main>
  );
};

export default Dashboard;
