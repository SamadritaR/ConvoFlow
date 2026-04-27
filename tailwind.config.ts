import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#09111a",
        ink: "#eaf4ff",
        mist: "#90a9c0",
        panel: "#0d1823",
        line: "rgba(166, 205, 255, 0.14)",
        teal: "#63e6d8",
        gold: "#f1c96a",
        coral: "#ff8577",
        sky: "#8db9ff",
      },
      boxShadow: {
        ambient: "0 24px 80px rgba(3, 12, 22, 0.4)",
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at top, rgba(141, 185, 255, 0.16), transparent 32%), linear-gradient(135deg, rgba(99, 230, 216, 0.08), transparent 40%), linear-gradient(180deg, rgba(241, 201, 106, 0.06), transparent 36%)",
      },
    },
  },
  plugins: [],
};

export default config;
