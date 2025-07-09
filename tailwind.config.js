module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    fontFamily: {
      sans: ['Source Sans Pro', 'sans-serif'],
      heading: ['Overpass', 'sans-serif']
    },
    extend: {
      colors: {
        primary: '#2563EB', // Blue
        secondary: '#F3F4F6' // Light gray
      }
    }
  },
  plugins: [require('daisyui')]
}
