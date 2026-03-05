import { PropsWithChildren } from 'react';
import { AppShell } from '@/components/app/AppShell';
import { AuthGate } from '@/components/AuthGate';

export default function AppLayout({ children }: PropsWithChildren) {
  return (
    <AuthGate>
      <AppShell>{children}</AppShell>
    </AuthGate>
  );
}
