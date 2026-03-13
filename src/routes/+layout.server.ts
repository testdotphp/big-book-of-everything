import type { LayoutServerLoad } from './$types';
import { getPortalConfig } from '$lib/server/config';
import { isBookEnabled, getDb } from '$lib/server/db';
import { categories, sections, settings } from '$lib/server/schema';
import { eq } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export const load: LayoutServerLoad = async (event) => {
  const session = await event.locals.auth?.();
  const bookMode = env.PORTAL_MODE === 'book';
  const bookEnabled = isBookEnabled();

  // In book mode, use a simplified config
  const config = bookMode
    ? { name: 'Big Book of Everything', icon: 'book-open', theme: '#4CAF50', items: [] }
    : getPortalConfig();

  // Determine auth mode
  const localAuthMode = env.LOCAL_AUTH?.toLowerCase() || null;
  const isLocalAuth = localAuthMode === 'password' || localAuthMode === 'users';

  // Protect routes
  const isPublicPath = event.url.pathname.startsWith('/auth')
    || event.url.pathname.startsWith('/api/auth')
    || event.url.pathname === '/login'
    || /^\/book\/emergency\/[^/]+/.test(event.url.pathname);
  if (!bookMode && !session?.user && !isPublicPath) {
    throw redirect(302, '/login');
  }
  // In book mode with local auth, still require login (except public paths)
  if (bookMode && isLocalAuth && !session?.user && !isPublicPath) {
    throw redirect(302, '/login');
  }

  // Load book categories with sections for sidebar navigation
  let bookCategories: { id: number; name: string; slug: string; icon: string | null; seeded: number; sections: { id: number; name: string; slug: string; type: string; seeded: number }[] }[] = [];
  if (bookEnabled) {
    const db = getDb();
    const cats = db.select().from(categories).orderBy(categories.sortOrder).all();
    bookCategories = cats.map((cat) => {
      const sects = db.select({
        id: sections.id,
        name: sections.name,
        slug: sections.slug,
        type: sections.type,
        seeded: sections.seeded
      }).from(sections).where(eq(sections.categoryId, cat.id)).orderBy(sections.sortOrder).all();
      return { ...cat, sections: sects };
    });
  }

  // Load theme and icon pack preferences
  const db2 = bookEnabled || bookMode ? getDb() : null;
  const themeRow = db2?.select().from(settings).where(eq(settings.key, 'theme')).get();
  const theme = themeRow?.value || 'dark';

  const fontSizeRow = db2?.select().from(settings).where(eq(settings.key, 'font_size')).get();
  const fontSize = fontSizeRow?.value || 'medium';

  const iconPackRow = db2?.select().from(settings).where(eq(settings.key, 'icon_pack')).get();
  const iconPack = iconPackRow?.value || 'lucide';

  // Load icon pack SVG data if not using built-in Lucide
  let iconPackIcons: Record<string, string> | null = null;
  if (iconPack !== 'lucide' && db2) {
    const dataRow = db2.select().from(settings).where(eq(settings.key, `icon_pack_data:${iconPack}`)).get();
    if (dataRow?.value) {
      try {
        const parsed = JSON.parse(dataRow.value);
        iconPackIcons = parsed.icons || null;
      } catch { /* invalid data, fall back to lucide */ }
    }
  }

  return {
    session,
    config,
    bookEnabled,
    bookMode,
    bookCategories,
    localAuth: isLocalAuth ? localAuthMode : null,
    theme,
    fontSize,
    iconPack,
    iconPackIcons
  };
};
