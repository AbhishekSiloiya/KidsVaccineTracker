/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/template/**/*.html",
    "./app/static/**/*.js",
    "./app/**/*.py"
  ],
  theme: {
    screens: {
      // Custom breakpoints to match your original CSS
      'xs': '480px',      // Extra small devices
      'sm': '560px',      // Your updated small breakpoint  
      'md': '770px',      // Your original medium breakpoint
      'lg': '1025px',     // Your original large breakpoint
      'xl': '1280px',     // Standard extra large
      '2xl': '1536px',    // Standard 2x extra large
      
      // Max-width variants (for mobile-first approach)
      'max-xs': {'max': '479px'},     // Less than 480px
      'max-sm': {'max': '559px'},     // Less than 560px (your updated)
      'max-md': {'max': '769px'},     // Less than 770px (your original)
      'max-lg': {'max': '1024px'},    // Less than 1025px
      'max-xl': {'max': '1279px'},    // Less than 1280px
    },
    extend: {
      // You can add custom colors, spacing, etc. here if needed
      colors: {
        // Example: Add your custom colors if you have any
      },
      spacing: {
        // Example: Add custom spacing if needed
      }
    },
  },
  plugins: [],
}
