import type { SVGProps } from 'react';
import { cn } from '@/lib/cn';

type AppIconName =
  | 'home'
  | 'portfolio'
  | 'transactions'
  | 'ai'
  | 'plus'
  | 'ask'
  | 'chat'
  | 'analysis'
  | 'settings'
  | 'command';

type AppIconProps = SVGProps<SVGSVGElement> & {
  name: AppIconName;
};

export function AppIcon({ name, className, ...props }: AppIconProps) {
  const sharedProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  };

  return (
    <svg
      viewBox='0 0 24 24'
      aria-hidden='true'
      className={cn('h-5 w-5 shrink-0', className)}
      {...props}
    >
      {name === 'home' ? (
        <>
          <path {...sharedProps} d='M4.5 10.5 12 4l7.5 6.5' />
          <path {...sharedProps} d='M6.5 9.5V20h11V9.5' />
          <path {...sharedProps} d='M10 20v-5.5h4V20' />
        </>
      ) : null}

      {name === 'portfolio' ? (
        <>
          <rect {...sharedProps} x='4' y='5' width='16' height='14' rx='3' />
          <path {...sharedProps} d='M8 9h8' />
          <path {...sharedProps} d='M8 13h5' />
          <path {...sharedProps} d='M16.5 13.5 18 15l2.5-3' />
        </>
      ) : null}

      {name === 'transactions' ? (
        <>
          <path {...sharedProps} d='M5 8h14' />
          <path {...sharedProps} d='M5 16h14' />
          <path {...sharedProps} d='M15 5l4 3-4 3' />
          <path {...sharedProps} d='M9 13 5 16l4 3' />
        </>
      ) : null}

      {name === 'ai' ? (
        <>
          <path {...sharedProps} d='M12 4.5 14 9l4.5 2-4.5 2-2 4.5-2-4.5-4.5-2L10 9l2-4.5Z' />
          <path {...sharedProps} d='M18.5 4.5 19.25 6l1.5.75-1.5.75-.75 1.5-.75-1.5-1.5-.75 1.5-.75.75-1.5Z' />
        </>
      ) : null}

      {name === 'plus' ? (
        <>
          <path {...sharedProps} d='M12 5v14' />
          <path {...sharedProps} d='M5 12h14' />
        </>
      ) : null}

      {name === 'ask' ? (
        <>
          <path {...sharedProps} d='M8.5 9.5a3.5 3.5 0 1 1 6.08 2.35c-.76.81-1.58 1.28-1.58 2.65' />
          <path {...sharedProps} d='M12 18h.01' />
          <path {...sharedProps} d='M4.5 12a7.5 7.5 0 1 0 15 0 7.5 7.5 0 0 0-15 0Z' />
        </>
      ) : null}

      {name === 'chat' ? (
        <>
          <path {...sharedProps} d='M5 6.5h14v9a2.5 2.5 0 0 1-2.5 2.5H11l-4 3v-3H7.5A2.5 2.5 0 0 1 5 15.5v-9Z' />
          <path {...sharedProps} d='M8.5 11.5h7' />
          <path {...sharedProps} d='M8.5 8.5h5' />
        </>
      ) : null}

      {name === 'analysis' ? (
        <>
          <path {...sharedProps} d='M6 18V9.5' />
          <path {...sharedProps} d='M12 18V6' />
          <path {...sharedProps} d='M18 18v-4.5' />
          <path {...sharedProps} d='M4.5 18h15' />
        </>
      ) : null}

      {name === 'settings' ? (
        <>
          <path
            {...sharedProps}
            d='M12 8.75a3.25 3.25 0 1 1 0 6.5 3.25 3.25 0 0 1 0-6.5Z'
          />
          <path
            {...sharedProps}
            d='m19 12 1.45-1.1-1.4-2.42-1.76.33a6.8 6.8 0 0 0-1.28-.74L15.5 6h-3l-.5 2.07c-.46.16-.89.4-1.28.7l-1.75-.3-1.5 2.38L9 12l-1.48 1.15 1.4 2.38 1.82-.34c.38.29.8.52 1.24.68L12.5 18h3l.47-2.13c.45-.16.87-.38 1.25-.67l1.83.3 1.4-2.38L19 12Z'
          />
        </>
      ) : null}

      {name === 'command' ? (
        <>
          <rect {...sharedProps} x='4.5' y='6' width='15' height='12' rx='3' />
          <path {...sharedProps} d='M8 12h8' />
          <path {...sharedProps} d='M12 8v8' />
        </>
      ) : null}
    </svg>
  );
}
