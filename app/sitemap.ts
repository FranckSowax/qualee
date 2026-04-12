import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://qualee.app';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 1 },
    { url: `${baseUrl}/landing`, lastModified: new Date(), changeFrequency: 'weekly' as const, priority: 0.9 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly' as const, priority: 0.7 },
  ];

  // Dynamic merchant pages
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: merchants } = await supabase
      .from('merchants')
      .select('id, updated_at')
      .eq('is_active', true);

    const merchantPages = (merchants || []).flatMap(m => [
      { url: `${baseUrl}/rate/${m.id}`, lastModified: new Date(m.updated_at), changeFrequency: 'daily' as const, priority: 0.8 },
      { url: `${baseUrl}/spin/${m.id}`, lastModified: new Date(m.updated_at), changeFrequency: 'daily' as const, priority: 0.8 },
    ]);

    return [...staticPages, ...merchantPages];
  } catch {
    return staticPages;
  }
}
