/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0B0E14",
          soft: "#171B26",
          border: "#262B38",
        },
        accent: {
          DEFAULT: "#4F46E5",
          dark: "#3730A3",
          soft: "#EEF0FD",
        },
        surface: "#F4F5F7",
        status: {
          overdueBg: "#FCE8E8",
          overdueText: "#C0342A",
          dueBg: "#FDF3D8",
          dueText: "#92620C",
          okBg: "#E1F6E8",
          okText: "#1D7A42",
          paidBg: "#0B0E14",
          paidText: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "IBM Plex Mono",
          "JetBrains Mono",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};
