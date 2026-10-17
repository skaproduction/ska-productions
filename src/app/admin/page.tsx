import type { Metadata } from 'next';
import { AdminDashboard, AdminLogin } from '@/components/ska/Admin';
import { adminConfigured, isAdmin } from '@/lib/ska-auth';
import { getSettings, getShows, usesBlobStorage } from '@/lib/ska-store';
import { translateConfigured } from '@/lib/ska-translate';

export const metadata: Metadata = {
  title: 'Admin — SKA PRODUCTIONS',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin configured={adminConfigured()} />;
  const [shows, settings] = await Promise.all([getShows({ fresh: true }), getSettings({ fresh: true })]);
  return <AdminDashboard shows={shows} settings={settings} canTranslate={translateConfigured()} blobUploads={usesBlobStorage()} />;
}
