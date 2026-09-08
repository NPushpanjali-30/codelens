import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0E14",
          50: "#F4F5F7",
          900: "#0B0E14",
        },
        surface: {
          DEFAULT: "#12151C",
          raised: "#171B24",
          hover: "#1B202B",
        },
        border: {
          DEFAULT: "#232838",
          subtle: "#1A1E29",
        },
        ink900: "#0B0E14",
        text: {
          primary: "#E6E9EF",
          muted: "#8B93A7",
          dim: "#5B6478",
        },
        signal: {
          DEFAULT: "#5EEAD4",
          dim: "#2DD4BF",
          soft: "#0F2C29",
        },
        amber: {
          DEFAULT: "#F5A623",
          soft: "#2E2413",
        },
        danger: {
          DEFAULT: "#F87171",
          soft: "#2E1616",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      backgroundImage: {
        "grid-fade":
          "linear-gradient(to bottom, rgba(94,234,212,0.06), transparent 60%)",
      },
      keyframes: {
        "trace-dash": {
          to: { strokeDashoffset: "-24" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "trace-dash": "trace-dash 1.2s linear infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "fade-up": "fade-up 0.4s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
