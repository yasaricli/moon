import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

// Styles
import "@/styles/main.scss";

const sans = Geist({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });
const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-serif" });

export const metadata = {
  title: "moon",
  description: "Uptime and response time monitoring",
};

const RootLayout = ({ children }) => {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} ${serif.variable}`}>
      <body>
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <linearGradient id="glow-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f3ead0" stopOpacity=".22" />
            <stop offset="1" stopColor="#f3ead0" stopOpacity="0" />
          </linearGradient>
        </svg>
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
