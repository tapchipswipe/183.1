/** @type {import(tailwindcss).Config} */
module.exports = {
  content: [
    ./app/**/*.js,
    ./components/**/*.js,
  ],
  theme: {
    extend: {
      colors: {
        primary: #008060,
        primary-dark: #00D47E,
      },
    },
  },
  plugins: [],
  darkMode: class,
}
