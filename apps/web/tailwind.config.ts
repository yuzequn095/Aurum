import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        aurum: {
          bg: '#F6F8FA',
          card: '#FFFFFF',
          border: '#E2E8F0',
          text: '#0F172A',
          muted: '#64748B',
          primary: '#F5C542',
          primaryHover: '#E3B233',
          primarySoft: '#FDF3D1',
          success: '#16A34A',
          danger: '#DC2626',
        },
      },
      borderRadius: {
        aurum: '14px',
      },
      boxShadow: {
        aurum: '0 10px 30px -18px rgba(15, 23, 42, 0.35)',
        aurumSm: '0 2px 10px -8px rgba(15, 23, 42, 0.3)',
      },
    },
  },
};

export default config;
