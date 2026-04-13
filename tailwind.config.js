/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        sans: [
          "ui-rounded",
          '"SF Pro Rounded"',
          '"SF Pro Display"',
          '"Segoe UI Variable Display"',
          '"Segoe UI Variable Text"',
          '"Segoe UI"',
          '"HarmonyOS Sans SC"',
          '"HarmonyOS Sans"',
          '"MiSans"',
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei UI"',
          '"Microsoft YaHei"',
          '"Noto Sans SC"',
          '"Source Han Sans SC"',
          '"Inter var"',
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Helvetica",
          "Arial",
          '"Apple Color Emoji"',
          '"Segoe UI Emoji"',
        ],
      },
      colors: {
        background: "rgb(var(--background) / <alpha-value>)",
        foreground: "rgb(var(--foreground) / <alpha-value>)",
        "foreground-soft": "rgb(var(--foreground-soft) / <alpha-value>)",

        surface: "rgb(var(--surface) / <alpha-value>)",
        "surface-2": "rgb(var(--surface-2) / <alpha-value>)",

        muted: "rgb(var(--muted) / <alpha-value>)",
        "muted-foreground": "rgb(var(--muted-foreground) / <alpha-value>)",

        border: "rgb(var(--border) / <alpha-value>)",
        "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
        input: "rgb(var(--input) / <alpha-value>)",

        primary: "rgb(var(--primary) / <alpha-value>)",
        "primary-foreground": "rgb(var(--primary-foreground) / <alpha-value>)",

        accent: "rgb(var(--accent) / <alpha-value>)",
        "accent-foreground": "rgb(var(--accent-foreground) / <alpha-value>)",

        destructive: "rgb(var(--destructive) / <alpha-value>)",
        "destructive-foreground": "rgb(var(--destructive-foreground) / <alpha-value>)",

        success: "rgb(var(--success) / <alpha-value>)",
        warning: "rgb(var(--warning) / <alpha-value>)",
        info: "rgb(var(--info) / <alpha-value>)",

        ring: "rgb(var(--ring) / <alpha-value>)",
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
      },
      ringColor: {
        DEFAULT: "rgb(var(--ring) / <alpha-value>)",
      },
      ringOffsetColor: {
        background: "rgb(var(--background) / <alpha-value>)",
      },
      boxShadow: {
        e1: "var(--shadow-1)",
        e2: "var(--shadow-2)",
        e3: "var(--shadow-3)",
      },
      fontSize: {
        "ui-xs": ["0.75rem", { lineHeight: "1rem" }],
        "ui-sm": ["0.8125rem", { lineHeight: "1.25rem" }],
        "ui-md": ["0.875rem", { lineHeight: "1.25rem" }],
        "ui-lg": ["1rem", { lineHeight: "1.5rem" }],
        "ui-xl": ["1.125rem", { lineHeight: "1.75rem" }],
      },
      spacing: {
        "rail-left": "20rem",
        "rail-right": "17.5rem",
        "drawer": "23.75rem",
        "card-lg": "32.5rem",
        "card-md": "26.25rem",
      },
      maxWidth: {
        drawer: "23.75rem",
        "card-lg": "32.5rem",
        "card-md": "26.25rem",
        layout: "87.5rem",
        "media-sm": "11.25rem",
        "dialog-md": "35rem",
        "dialog-lg": "51.25rem",
        "text-xl": "28rem",
        "text-md": "12rem",
        "text-sm": "3.75rem",
      },
      maxHeight: {
        "card-tall": "22.5rem",
      },
    },
  },
  plugins: [],
};
