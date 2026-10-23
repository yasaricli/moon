// Components
import Moon from "@/components/Moon";

// Styles
import Styles from "./styles.module.scss";

// The big moon, a headline and a row of stats; children are the stats' <div><dt/><dd/></div> items.
const Hero = ({ tone, phase, moonTitle, kicker, title, subtitle, children }) => (
  <section className={Styles.hero} data-tone={tone}>
    <div className={Styles.heroMoon} title={moonTitle}>
      <Moon phase={phase} size={112} />
    </div>
    <div className={Styles.heroText}>
      <span className={Styles.kicker}>
        <i className="lamp" /> {kicker}
      </span>
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </div>
    <dl className={Styles.heroStats}>{children}</dl>
  </section>
);

export default Hero;
