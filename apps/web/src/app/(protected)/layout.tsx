import { PropsWithChildren } from 'react';
import { AuthGate } from '@/components/AuthGate';

export default function ProtectedLayout({ children }: PropsWithChildren) {
  return <AuthGate>{children}</AuthGate>;
}
