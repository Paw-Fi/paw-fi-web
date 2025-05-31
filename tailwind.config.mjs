/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#F5F3FF',
        secondary: '#9181FF',
        primary: '#7458FF',
        success: '#16CDA2',
        'success-light': '#F1FFF8',
        warning: '#FFC219',
        'warning-light': '#FFF4D5',
        danger: '#FF6060',
        'danger-light': '#FFE8E8',
        overlay: 'rgba(0, 0, 0, 0.8)'
      }
    }
  }
}
