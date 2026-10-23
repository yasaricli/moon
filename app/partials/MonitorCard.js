import Link from "next/link";

// Components
import Avatar from "@/components/Avatar";
import Sparkline from "@/components/Sparkline";
import StatusStrip from "@/components/StatusStrip";
import TrendChip from "@/components/TrendChip";

// Utils
import { summarize, trend, tone, certDays, certTone } from "@/lib/stats";
import { codeLabel, stateOf } from "@/utils/shortcuts";

// Styles
import Styles from "../styles.module.scss";

const STATE_LABEL = { idle: "Pending", down: "Down", slow: "Slow", up: "Up" };

const CertChip = ({ cert }) => {
  const days = certDays(cert, Date.now());

  return (
    <em className={Styles.certChip} data-tone={certTone(days)} title={`SSL certificate expires ${new Date(cert.expires).toDateString()}`}>
      SSL · {days < 0 ? "expired" : `${days}d`}
    </em>
  );
};

// drag: drag-and-drop handlers, only while the custom order is shown.
// ponytail: native HTML5 drag events, so no reordering on most touch screens; the sort menu still works there
const MonitorCard = ({ m, drag }) => {
  const last = m.checks.at(-1);
  const t = trend(m.checks);
  const { uptime, avg, p95 } = summarize(m.checks);
  const state = stateOf(m.checks);

  return (
    <Link
      href={`/m/${m.id}`}
      className={`panel ${Styles.card}`}
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
      <div className={Styles.cardHead}>
        <Avatar url={m.url} name={m.name} size={36} />
        <div className={Styles.cardTitle}>
          <strong>{m.name}</strong>
          <span>
            {m.method === "POST" && <b className={Styles.verb}>POST</b>}
            {m.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
          </span>
          {m.cert && <CertChip cert={m.cert} />}
        </div>
        <span className="pill">{STATE_LABEL[state]}</span>
      </div>

      <div className={Styles.cardReading}>
        <div key={last?.at} className={`${Styles.big} num flash`} data-tone={tone(last)}>
          {last?.ok ? last.ms : last ? codeLabel(last) : "—"}
          {last?.ok && <small>ms</small>}
        </div>
        <TrendChip t={t} />
      </div>

      <Sparkline checks={m.checks} />
      <StatusStrip checks={m.checks} />

      <dl className={Styles.cardFoot}>
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
};

export default MonitorCard;
