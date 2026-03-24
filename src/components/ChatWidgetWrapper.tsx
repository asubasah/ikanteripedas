'use client';

import { usePathname } from 'next/navigation';
import ChatWidget from './ChatWidget';

export default function ChatWidgetWrapper() {
  const pathname = usePathname();

  // Do not render the chat widget on the dashboard
  if (pathname?.startsWith('/dashboard')) {
    return null;
  }

  return <ChatWidget />;
}
