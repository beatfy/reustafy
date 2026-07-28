/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        dark: {
          bg: "#0a0e1a",
          card: "#131929",
          border: "rgba(255, 255, 255, 0.08)",
          header: "rgba(15, 23, 42, 0.75)"
        },
        status: {
          free: "#10b981",
          "free-bg": "rgba(16, 185, 129, 0.12)",
          ordered: "#f59e0b",
          "ordered-bg": "rgba(245, 158, 11, 0.12)",
          eating: "#3b82f6",
          "eating-bg": "rgba(59, 130, 246, 0.12)",
          bill: "#f43f5e",
          "bill-bg": "rgba(244, 63, 94, 0.12)",
          reserved: "#8b5cf6",
          "reserved-bg": "rgba(139, 92, 246, 0.12)"
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
};
