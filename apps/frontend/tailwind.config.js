/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ─── Surfaces ─── */
        background: "var(--background)",
        card: {
          DEFAULT: "var(--card)",
          alt: "var(--card-alt)",
        },
        input: "var(--input)",
        header: "var(--header)",
        elevated: "var(--elevated)",

        /* ─── Typography ─── */
        foreground: {
          DEFAULT: "var(--foreground)",
          secondary: "var(--foreground-secondary)",
          muted: "var(--foreground-muted)",
          inverted: "var(--foreground-inverted)",
        },

        /* ─── Borders ─── */
        border: {
          DEFAULT: "var(--border)",
          subtle: "var(--border-subtle)",
          strong: "var(--border-strong)",
        },

        /* ─── Brand / Accent ─── */
        accent: {
          DEFAULT: "var(--accent)",
          hover: "var(--accent-hover)",
          light: "var(--accent-light)",
          text: "var(--accent-text)",
          border: "var(--accent-border)",
          foreground: "var(--accent-foreground)",
          focus: "var(--accent-focus)",
        },

        /* ─── Neutral Buttons ─── */
        "btn-neutral": {
          DEFAULT: "var(--btn-neutral)",
          hover: "var(--btn-neutral-hover)",
          text: "var(--btn-neutral-text)",
        },
        "btn-secondary": {
          DEFAULT: "var(--btn-secondary)",
          hover: "var(--btn-secondary-hover)",
          text: "var(--btn-secondary-text)",
        },

        /* ─── Status: Success ─── */
        success: {
          DEFAULT: "var(--success)",
          hover: "var(--success-hover)",
          light: "var(--success-light)",
          text: "var(--success-text)",
          border: "var(--success-border)",
          icon: "var(--success-icon)",
        },

        /* ─── Status: Warning ─── */
        warning: {
          DEFAULT: "var(--warning)",
          hover: "var(--warning-hover)",
          light: "var(--warning-light)",
          text: "var(--warning-text)",
          border: "var(--warning-border)",
        },

        /* ─── Status: Danger ─── */
        danger: {
          DEFAULT: "var(--danger)",
          hover: "var(--danger-hover)",
          light: "var(--danger-light)",
          text: "var(--danger-text)",
          border: "var(--danger-border)",
        },

        /* ─── Status: Info ─── */
        info: {
          DEFAULT: "var(--info)",
          light: "var(--info-light)",
          text: "var(--info-text)",
          border: "var(--info-border)",
        },

        /* ─── Status: Premium ─── */
        premium: {
          DEFAULT: "var(--premium)",
          light: "var(--premium-light)",
          text: "var(--premium-text)",
          border: "var(--premium-border)",
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
