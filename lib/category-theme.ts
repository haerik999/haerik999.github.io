export interface CategoryTheme {
  badgeClass: string;
  cardGradientClass: string;
  heroGradientClass: string;
  accentClass: string;
}

const DEFAULT_THEME: CategoryTheme = {
  badgeClass: 'bg-slate-100 text-slate-700',
  cardGradientClass: 'from-slate-100 via-white to-slate-50',
  heroGradientClass: 'from-slate-200 via-slate-100 to-white',
  accentClass: 'text-slate-700',
};

const THEMES: Record<string, CategoryTheme> = {
  Product: {
    badgeClass: 'bg-emerald-100 text-emerald-800',
    cardGradientClass: 'from-emerald-100 via-white to-lime-50',
    heroGradientClass: 'from-emerald-200 via-lime-100 to-white',
    accentClass: 'text-emerald-700',
  },
  Frontend: {
    badgeClass: 'bg-sky-100 text-sky-800',
    cardGradientClass: 'from-sky-100 via-white to-cyan-50',
    heroGradientClass: 'from-sky-200 via-cyan-100 to-white',
    accentClass: 'text-sky-700',
  },
  Backend: {
    badgeClass: 'bg-blue-100 text-blue-800',
    cardGradientClass: 'from-blue-100 via-white to-indigo-50',
    heroGradientClass: 'from-blue-200 via-indigo-100 to-white',
    accentClass: 'text-blue-700',
  },
  Infra: {
    badgeClass: 'bg-orange-100 text-orange-800',
    cardGradientClass: 'from-orange-100 via-white to-amber-50',
    heroGradientClass: 'from-orange-200 via-amber-100 to-white',
    accentClass: 'text-orange-700',
  },
  AI: {
    badgeClass: 'bg-fuchsia-100 text-fuchsia-800',
    cardGradientClass: 'from-fuchsia-100 via-white to-pink-50',
    heroGradientClass: 'from-fuchsia-200 via-pink-100 to-white',
    accentClass: 'text-fuchsia-700',
  },
  Career: {
    badgeClass: 'bg-violet-100 text-violet-800',
    cardGradientClass: 'from-violet-100 via-white to-purple-50',
    heroGradientClass: 'from-violet-200 via-purple-100 to-white',
    accentClass: 'text-violet-700',
  },
  General: DEFAULT_THEME,
};

export function getTopCategory(category?: string): string {
  if (!category) return 'General';
  return category.split('/')[0] || 'General';
}

export function getCategoryTheme(category?: string): CategoryTheme {
  const top = getTopCategory(category);
  return THEMES[top] ?? DEFAULT_THEME;
}
