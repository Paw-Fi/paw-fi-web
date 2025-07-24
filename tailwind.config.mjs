/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Light mode colors (default)
        background: '#F9FAFB',
        foreground: '#1F2937',
        icon: '#AA76FF',
        secondary: '#836DFF',
        primary: '#7458FF',
        success: '#16CDA2',
        'success-light': '#F1FFF8',
        warning: '#FFC219',
        'warning-light': '#FFF4D5',
        danger: '#FF6060',
        'danger-light': '#FFE8E8',
        overlay: 'rgba(0, 0, 0, 0.8)',
        
        // Dark mode specific colors (used with dark: variants)
        'dark-background': '#0A0E1A',
        'dark-foreground': '#F1F5F9',
        'dark-icon': '#B388FF',
        'dark-secondary': '#9B82FF',
        'dark-primary': '#8B70FF',
        'dark-success': '#1FE3B8',
        'dark-success-light': '#0A2920',
        'dark-warning': '#FFD04A',
        'dark-warning-light': '#2B1F00',
        'dark-danger': '#FF7A7A',
        'dark-danger-light': '#2B0A0A',
        'dark-overlay': 'rgba(0, 0, 0, 0.9)',
        
        // Ambient Halo Colors
        'halo-bg': '#f0f0ff',
        'halo-purple': 'rgba(207, 195, 245, 0.9)',
        'halo-purple-mid': 'rgba(195, 180, 235, 0.85)',
        'halo-purple-outer': 'rgba(215, 205, 250, 0.6)',
        'halo-pink': 'rgba(243, 221, 247, 0.85)',
        'halo-pink-mid': 'rgba(235, 210, 240, 0.8)',
        'halo-pink-outer': 'rgba(245, 225, 250, 0.6)',
        'halo-blue': 'rgba(162, 212, 244, 0.85)',
        'halo-blue-mid': 'rgba(150, 200, 235, 0.8)',
        'halo-blue-outer': 'rgba(170, 220, 250, 0.65)',
        'halo-light-blue': 'rgba(215, 236, 250, 0.8)',
        'halo-light-blue-mid': 'rgba(205, 225, 245, 0.75)',
        'halo-light-blue-outer': 'rgba(220, 240, 252, 0.55)',
        
        // Dark mode ambient halo colors
        'dark-halo-bg': '#0A0E1A',
        'dark-halo-purple': 'rgba(139, 112, 255, 0.6)',
        'dark-halo-purple-mid': 'rgba(124, 95, 240, 0.55)',
        'dark-halo-purple-outer': 'rgba(155, 130, 255, 0.4)',
        'dark-halo-pink': 'rgba(243, 221, 247, 0.5)',
        'dark-halo-pink-mid': 'rgba(235, 210, 240, 0.45)',
        'dark-halo-pink-outer': 'rgba(245, 225, 250, 0.35)',
        'dark-halo-blue': 'rgba(96, 165, 250, 0.6)',
        'dark-halo-blue-mid': 'rgba(76, 145, 230, 0.55)',
        'dark-halo-blue-outer': 'rgba(116, 185, 255, 0.45)',
        'dark-halo-light-blue': 'rgba(125, 186, 220, 0.5)',
        'dark-halo-light-blue-mid': 'rgba(105, 166, 200, 0.45)',
        'dark-halo-light-blue-outer': 'rgba(145, 206, 240, 0.35)',
        
        // Accent colors for special components
        'accent-pink': '#EC4899',
        'accent-indigo': '#6366F1',
        'dark-accent-pink': '#F472B6',
        'dark-accent-indigo': '#818CF8'
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle, var(--tw-gradient-stops))',
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
