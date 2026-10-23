import Link from "next/link";

// Components
import Moon from "@/components/Moon";

// Styles
import Styles from "./styles.module.scss";

// With `href` the logo is a link, otherwise plain text.
const Logo = ({ href }) => {
  const content = (
    <>
      <Moon phase={0.32} size={22} />
      <span>moon</span>
    </>
  );

  if (!href) return <span className={Styles.logo}>{content}</span>;
  return (
    <Link href={href} className={Styles.logo}>
      {content}
    </Link>
  );
};

export default Logo;
