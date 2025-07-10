import daisyui from 'daisyui'


module.exports = {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  theme: {
    fontFamily: {
      sans: ['Source Sans Pro', 'sans-serif'],
      heading: ['Overpass', 'sans-serif'],
      fraunces: ['Fraunces', 'serif']
    },
    extend: {
      colors: {
        primary: '#0e67d6', // Blue
        secondary: '#F3F4F6' // Light gray
      },
      fontFamily: {
        overpass: ['"Overpass"', 'sans-serif'], // this creates `font-overpass`
      },
    }
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: [
      {
        mytheme: {
          "primary": "#0e67d6",
          "secondary": "#f000b8",
          "accent": "#37cdbe",
          "neutral": "#3d4451",
          "base-100": "#ffffff",
          "info": "#2094f3",
          "success": "#009485",
          "warning": "#ff9900",
          "error": "red",
        },
      },
    ],
  },
}
