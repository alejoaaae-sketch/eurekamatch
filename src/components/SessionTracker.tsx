import { useSessionTracking } from '@/hooks/useSessionTracking';
import { ReactNode } from 'react';

const SessionTracker = ({ children }: { children: ReactNode }) => {
  useSessionTracking();
  return <>{children}</>;
};

export default SessionTracker;
