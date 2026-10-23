// Styles
import Styles from "../styles.module.scss";

const Tile = ({ label, value, unit, tone, children }) => (
  <div className={Styles.tile} data-tone={tone}>
    <span className="label">{label}</span>
    <b className="num">
      {value}
      {unit && <small>{unit}</small>}
    </b>
    {children}
  </div>
);

export default Tile;
