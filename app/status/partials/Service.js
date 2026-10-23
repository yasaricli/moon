// Components
import Avatar from "@/components/Avatar";

// Utils
import { dayTone } from "@/lib/stats";
import { uptimeOf } from "@/utils/shortcuts";

// Styles
import Styles from "../styles.module.scss";
import StripStyles from "@/components/StatusStrip/styles.module.scss";

const STATE_LABEL = { idle: "Pending", up: "Operational", down: "Down" };

const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

const dayTitle = (d) =>
  d.count
    ? `${fmtDate(d.day)} · ${((d.ok / d.count) * 100).toFixed(2)}% · ${d.count - d.ok} failed checks`
    : `${fmtDate(d.day)} · no data`;

// One service row: current state, 30-day uptime and one block per day.
const Service = ({ m }) => {
  const state = !m.last ? "idle" : m.last.ok ? "up" : "down";
  const uptime = uptimeOf(m.days);

  return (
    <li className={Styles.service} data-tone={state}>
      <div className={Styles.serviceHead}>
        <Avatar url={m.site} name={m.name} size={28} />
        <strong>{m.name}</strong>
        <span className={`num ${Styles.uptime}`}>{m.days.some((d) => d.count) ? `${uptime.toFixed(2)}% uptime` : "No data yet"}</span>
        <span className="pill">{STATE_LABEL[state]}</span>
      </div>
      <div className={`${StripStyles.strip} ${StripStyles.stripTall}`} role="img" aria-label={`${m.name}: daily uptime, last ${m.days.length} days`}>
        {m.days.map((d) => (
          <i key={d.day} data-tone={dayTone(d)} title={dayTitle(d)} />
        ))}
      </div>
      <div className={Styles.axis}>
        <span>{m.days.length} days ago</span>
        <span>Today</span>
      </div>
    </li>
  );
};

export default Service;
