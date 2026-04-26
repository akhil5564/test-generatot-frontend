export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
       colors: {
         primary: '#007575',
       },
       fontFamily:{
         local1:['Gruppo'],
         local2:['Nunito'],
         custom1: ['Poppins', 'sans-serif'],
       },
       boxShadow:{
        'custom-outer': '3px 4px 2px 0px rgba(0, 0, 0,0.2)',
        'custom-outer1': '2px 2px 3px 3px rgba(0, 0, 0,0.2)',
       },
       screens:{
        '1xl':'1440px',
        'xxl':'1330px',
        'llg':'1130px'
       }
    },
  },
  plugins: [],
}