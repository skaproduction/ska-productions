import type { Metadata } from 'next';
import { AdminDashboard, AdminLogin } from '@/components/ska/Admin';
import { adminConfigured, isAdmin } from '@/lib/ska-auth';
import { getShows } from '@/lib/ska-store';
import { translateConfigured } from '@/lib/ska-translate';

export const metadata: Metadata = {
  title: 'Admin — SKA PRODUCTIONS',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  if (!(await isAdmin())) return <AdminLogin configured={adminConfigured()} />;
  return <AdminDashboard shows={await getShows()} canTranslate={translateConfigured()} />;
}
