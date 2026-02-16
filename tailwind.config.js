/** @type {import(tailwindcss).Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#008060",
        "primary-dark": "#00D47E",
      },
    },
  },
  plugins: [],
  darkMode: "class",
};
