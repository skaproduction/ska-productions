'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** Sends one anonymous page-view beacon per page (no cookies). Respects Do Not Track; skips the admin. */
export default function Tracker() {
  const path = usePathname();

  useEffect(() => {
    if (path.startsWith('/admin') || navigator.doNotTrack === '1') return;
    let landing = false;
    try {
      landing = !sessionStorage.getItem('ska-landed');
      sessionStorage.setItem('ska-landed', '1');
    } catch {}
    let ref = '';
    if (landing && document.referrer) {
      try {
        const host = new URL(document.referrer).host;
        if (host !== location.host) ref = host;
      } catch {}
    }
    const body = JSON.stringify({ path, ref, landing });
    if (!navigator.sendBeacon?.('/api/track', body)) {
      fetch('/api/track', { method: 'POST', body, keepalive: true }).catch(() => {});
    }
  }, [path]);

  return null;
}
