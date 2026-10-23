"use client";

import { useEffect, useState } from "react";
import Moon, { phaseOf } from "../../components/Moon.js";
import Avatar from "../../components/Avatar.js";
import { getSocket, headline, fmtShort } from "../../lib/live.js";
import { dayTone } from "../../lib/stats.js";
import hero from "../page.module.scss";
import ui from "../../components/ui.module.scss";
import s from "./status.module.scss";

const REFRESH_MS = 5 * 60_000;
const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function uptimeOf(days) {
  const count = days.reduce((a, d) => a + d.count, 0);
  return count ? (days.reduce((a, d) => a + d.ok, 0) / count) * 100 : 0;
}

// Daily buckets come from the server; live checks update the current state
// and today's bucket in between refreshes.
function useStatus() {
  const [services, setServices] = useState();
  const [groups, setGroups] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    const load = () => {
      setConnected(true);
      socket.emit("status", (data) => {
        setServices(data.services);
        setGroups(data.groups);
      });
    };
    const onDisconnect = () => setConnected(false);
    const onCheck = ({ id, check }) =>
      setServices((list) =>
        list?.map((m) => {
          if (m.id !== id) return m;
          const today = m.days.at(-1);
          const days = [...m.days.slice(0, -1), { ...today, count: today.count + 1, ok: today.ok + (check.ok ? 1 : 0) }];
          return { ...m, last: check, days };
        }),
      );

    if (socket.connected) load();
    socket.on("connect", load);
    socket.on("disconnect", onDisconnect);
    socket.on("monitors", load);
    socket.on("check", onCheck);
    const t = setInterval(load, REFRESH_MS);
    return () => {
      clearInterval(t);
      socket.off("connect", load);
      socket.off("disconnect", onDisconnect);
      socket.off("monitors", load);
      socket.off("check", onCheck);
    };
  }, []);

  return { services, groups, connected };
}

function Service({ m }) {
  const state = !m.last ? "idle" : m.last.ok ? "up" : "down";
  const uptime = uptimeOf(m.days);

  return (
    <li className={s.service} data-tone={state}>
      <div className={s.serviceHead}>
        <Avatar url={m.site} name={m.name} size={28} />
        <strong>{m.name}</strong>
        <span className={`num ${s.uptime}`}>{m.days.some((d) => d.count) ? `${uptime.toFixed(2)}% uptime` : "No data yet"}</span>
        <span className="pill">{{ idle: "Pending", up: "Operational", down: "Down" }[state]}</span>
      </div>
      <div className={`${ui.strip} ${ui.stripTall}`} role="img" aria-label={`${m.name}: daily uptime, last ${m.days.length} days`}>
        {m.days.map((d) => (
          <i
            key={d.day}
            data-tone={dayTone(d)}
            title={
              d.count
                ? `${fmtDate(d.day)} · ${((d.ok / d.count) * 100).toFixed(2)}% · ${d.count - d.ok} failed checks`
                : `${fmtDate(d.day)} · no data`
            }
          />
        ))}
      </div>
      <div className={s.axis}>
        <span>{m.days.length} days ago</span>
        <span>Today</span>
      </div>
    </li>
  );
}

export default function Status() {
  const { services, groups, connected } = useStatus();
  const list = services || [];
  // services outside any tab first, then each tab in its order; empty tabs are skipped
  const sections = [{ id: "", name: "" }, ...groups]
    .map((g) => ({ ...g, services: list.filter((m) => m.group === g.id) }))
    .filter((g) => g.services.length);
  const down = list.filter((m) => m.last && !m.last.ok).length;
  const days = list.flatMap((m) => m.days);
  const hasData = days.some((d) => d.count);
  const uptime = uptimeOf(days);
  const lastAt = Math.max(0, ...list.map((m) => m.last?.at || 0));

  return (
    <main className={`wrap ${s.page}`}>
      <header className={s.top}>
        <span className={ui.logo}>
          <Moon phase={0.32} size={22} />
          <span>moon</span>
        </span>
        <span className={s.live} data-tone={connected ? "up" : "down"}>
          <i className="lamp" />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </header>

      <section className={hero.hero} data-tone={down ? "down" : "up"}>
        <div className={hero.heroMoon} title={`Moon phase follows uptime: ${uptime.toFixed(2)}%`}>
          <Moon phase={hasData ? phaseOf(uptime) : 0.32} size={112} />
        </div>
        <div className={hero.heroText}>
          <span className={hero.kicker}>
            <i className="lamp" /> {services ? "System status" : "Connecting…"}
          </span>
          <h1>{headline(list.length, down)}</h1>
          <p>
            {list.length} {list.length === 1 ? "service" : "services"}
            {!!lastAt && ` · updated ${fmtShort(lastAt)}`}
          </p>
        </div>
        <dl className={hero.heroStats}>
          <div>
            <dt>Uptime · 30 days</dt>
            <dd className="num">
              {hasData ? uptime.toFixed(2) : "—"}
              {hasData && <small>%</small>}
            </dd>
          </div>
          <div>
            <dt>Operational</dt>
            <dd className="num">
              {list.length - down}
              <small>/</small>
              {list.length}
            </dd>
          </div>
        </dl>
      </section>

      {sections.map((g) => (
        <section key={g.id || "none"} className={s.group}>
          {g.name && <h2>{g.name}</h2>}
          <ul className={`panel ${s.services}`}>
            {g.services.map((m) => (
              <Service key={m.id} m={m} />
            ))}
          </ul>
        </section>
      ))}

      <footer className={s.foot}>
        <span>Checked every minute</span>
        <span>
          Powered by <em>moon</em>
        </span>
      </footer>
    </main>
  );
}
