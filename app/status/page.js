"use client";

// Components
import Hero from "@/components/Hero";
import Logo from "@/components/Logo";
import { phaseOf } from "@/components/Moon";

// Partials
import Service from "./partials/Service";

// Hooks
import useStatus from "@/hooks/useStatus";

// Utils
import { headline, fmtShort, uptimeOf } from "@/utils/shortcuts";

// Styles
import Styles from "./styles.module.scss";

const Status = () => {
  const { services, groups, loaded, connected } = useStatus();
  // services outside any tab first, then each tab in its order; empty tabs are skipped
  const sections = [{ id: "", name: "" }, ...groups]
    .map((g) => ({ ...g, services: services.filter((m) => m.group === g.id) }))
    .filter((g) => g.services.length);
  const down = services.filter((m) => m.last && !m.last.ok).length;
  const days = services.flatMap((m) => m.days);
  const hasData = days.some((d) => d.count);
  const uptime = uptimeOf(days);
  const lastAt = Math.max(0, ...services.map((m) => m.last?.at || 0));

  return (
    <main className={`wrap ${Styles.page}`}>
      <header className={Styles.top}>
        <Logo />
        <span className={Styles.live} data-tone={connected ? "up" : "down"}>
          <i className="lamp" />
          {connected ? "Live" : "Reconnecting…"}
        </span>
      </header>

      <Hero
        tone={down ? "down" : "up"}
        phase={hasData ? phaseOf(uptime) : 0.32}
        moonTitle={`Moon phase follows uptime: ${uptime.toFixed(2)}%`}
        kicker={loaded ? "System status" : "Connecting…"}
        title={headline(services.length, down)}
        subtitle={
          <>
            {services.length} {services.length === 1 ? "service" : "services"}
            {!!lastAt && ` · updated ${fmtShort(lastAt)}`}
          </>
        }
      >
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
            {services.length - down}
            <small>/</small>
            {services.length}
          </dd>
        </div>
      </Hero>

      {sections.map((g) => (
        <section key={g.id || "none"} className={Styles.group}>
          {g.name && <h2>{g.name}</h2>}
          <ul className={`panel ${Styles.services}`}>
            {g.services.map((m) => (
              <Service key={m.id} m={m} />
            ))}
          </ul>
        </section>
      ))}

      <footer className={Styles.foot}>
        <span>Checked every minute</span>
        <span>
          Powered by <em>moon</em>
        </span>
      </footer>
    </main>
  );
};

export default Status;
