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
          bg: '#FCFBFA',
          card: '#FFFFFF',
          border: '#EAEAEB',
          text: '#1A1A1A',
          muted: '#73706B',
          primary: '#C5A059',
          primaryHover: '#B58F48',
          primarySoft: '#F6EFE1',
          success: '#1B9C64',
          danger: '#C94B4B',
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
