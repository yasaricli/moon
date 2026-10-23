// Styles
import Styles from "./styles.module.scss";

const TEXT = { slow: "slower", fast: "faster", normal: "steady", down: "unreachable", idle: "waiting" };

const TrendChip = ({ t }) => {
  const showDelta = t.state !== "down" && t.state !== "idle";
  const arrow = t.delta > 0 ? "↑" : t.delta < 0 ? "↓" : "→";

  return (
    <span className={Styles.trend} data-tone={t.state}>
      {showDelta && (
        <span className="num">
          {arrow} {Math.abs(t.delta)}%
        </span>
      )}
      {TEXT[t.state]}
    </span>
  );
};

export default TrendChip;
