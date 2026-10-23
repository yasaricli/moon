// Utils
import { certDays, certTone } from "@/lib/stats";

// Styles
import Styles from "../styles.module.scss";

const fmtDate = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

const Certificate = ({ m }) => {
  if (!m.cert && m.url.startsWith("http:")) return <p className={Styles.none}>Plain HTTP, so there is no certificate to check.</p>;
  if (!m.cert) return <p className={Styles.none}>Waiting for the first successful check.</p>;
  const now = Date.now();
  const days = certDays(m.cert, now);
  const { issued, expires } = m.cert;
  const left = issued ? Math.min(Math.max((expires - now) / (expires - issued), 0), 1) : 0;

  return (
    <div className={Styles.cert} data-tone={certTone(days)}>
      <b className={`num ${Styles.certDays}`}>
        {days < 0 ? "Expired" : days}
        {days >= 0 && <small>{days === 1 ? "day left" : "days left"}</small>}
      </b>

      {!!issued && (
        <div className={Styles.lifetime}>
          <div className={Styles.lifetimeBar} role="img" aria-label={`${Math.round(left * 100)}% of the certificate lifetime left`}>
            <i style={{ width: `${(1 - left) * 100}%` }} />
            <i style={{ width: `${left * 100}%` }} />
          </div>
          <div className={Styles.lifetimeDates}>
            <span>Issued {fmtDate(issued)}</span>
            <span>Expires {fmtDate(expires)}</span>
          </div>
        </div>
      )}

      <dl>
        {!issued && (
          <div>
            <dt>Expires</dt>
            <dd>{fmtDate(expires)}</dd>
          </div>
        )}
        <div>
          <dt>Issued to</dt>
          <dd className="num">{m.cert.subject || "—"}</dd>
        </div>
        <div>
          <dt>Issuer</dt>
          <dd>{m.cert.issuer || "—"}</dd>
        </div>
      </dl>
    </div>
  );
};

export default Certificate;
