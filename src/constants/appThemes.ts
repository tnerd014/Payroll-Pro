export type AppThemeId =
  | 'default'
  | 'emerald'
  | 'stripe-violet'
  | 'wise-lime'
  | 'revolut-blue'
  | 'terminal-amber'
  | 'obsidian'
  | 'navy'
  | 'material-sage'
  | 'egyptian-scarlet'
  | 'sand-mocha'
  | 'olive-butterlight'
  | 'oxblood-shell'
  | 'espresso-celadon';

export type AppThemeCategory = 'default' | 'fintech' | 'editorial';

export interface AppThemePreviewColors {
  shellBg: string;
  headerBg: string;
  headerText: string;
  sidebarBg: string;
  heroBg: string;
  heroText: string;
  heroAccent: string;
  cardBg: string;
  cardBorder: string;
  barFill: string;
  navBg: string;
  navActive: string;
  useM3Pill?: boolean;
}

export interface AppThemeDefinition {
  id: AppThemeId;
  name: string;
  tag: string;
  category: AppThemeCategory;
  lightStatusBar: string;
  darkStatusBar: string;
  swatches: [string, string, string];
  preview: {
    light: AppThemePreviewColors;
    dark: AppThemePreviewColors;
  };
}

export const APP_THEME_STORAGE_KEY = 'PAYROLL_PRO_APP_THEME';
export const LEGACY_THEME_PREF_KEY = 'PAYROLL_PRO_THEME_PREF';

export const APP_THEMES: AppThemeDefinition[] = [
  {
    id: 'default',
    name: 'Default (No Theme)',
    tag: 'Classic Neutral · Pure Zinc',
    category: 'default',
    lightStatusBar: '#ffffff',
    darkStatusBar: '#09090b',
    swatches: ['#ffffff', '#e4e4e7', '#18181b'],
    preview: {
      light: {
        shellBg: '#fbfbfb',
        headerBg: '#ffffff',
        headerText: '#18181b',
        sidebarBg: '#ffffff',
        heroBg: '#ffffff',
        heroText: '#18181b',
        heroAccent: '#18181b',
        cardBg: '#ffffff',
        cardBorder: '#e4e4e7',
        barFill: '#18181b',
        navBg: '#ffffff',
        navActive: '#18181b',
      },
      dark: {
        shellBg: '#09090b',
        headerBg: '#09090b',
        headerText: '#fafafa',
        sidebarBg: '#09090b',
        heroBg: '#121215',
        heroText: '#fafafa',
        heroAccent: '#e4e4e7',
        cardBg: '#121215',
        cardBorder: '#27272a',
        barFill: '#e4e4e7',
        navBg: '#09090b',
        navActive: '#fafafa',
      },
    },
  },
  {
    id: 'stripe-violet',
    name: 'Stripe Blurple',
    tag: 'Blurple · Slate · SaaS Clean',
    category: 'fintech',
    lightStatusBar: '#ffffff',
    darkStatusBar: '#0a0b14',
    swatches: ['#635bff', '#0a2540', '#f6f9fc'],
    preview: {
      light: {
        shellBg: '#f6f9fc',
        headerBg: '#ffffff',
        headerText: '#0a2540',
        sidebarBg: '#ffffff',
        heroBg: 'linear-gradient(145deg, #0a2540 0%, #1c3d5e 100%)',
        heroText: '#ffffff',
        heroAccent: '#635bff',
        cardBg: '#ffffff',
        cardBorder: '#e3e8ee',
        barFill: 'linear-gradient(90deg, #635bff, #00d4ff)',
        navBg: '#ffffff',
        navActive: '#635bff',
      },
      dark: {
        shellBg: '#0a0b14',
        headerBg: '#0f1221',
        headerText: '#f6f9fc',
        sidebarBg: '#0f1221',
        heroBg: 'linear-gradient(145deg, #1a1d38 0%, #111428 100%)',
        heroText: '#ffffff',
        heroAccent: '#7a73ff',
        cardBg: '#131629',
        cardBorder: '#252a47',
        barFill: 'linear-gradient(90deg, #7a73ff, #00d4ff)',
        navBg: '#0f1221',
        navActive: '#7a73ff',
      },
    },
  },
  {
    id: 'wise-lime',
    name: 'Wise Forest & Lime',
    tag: 'Forest Green · Bright Lime · Crisp',
    category: 'fintech',
    lightStatusBar: '#163300',
    darkStatusBar: '#0b1900',
    swatches: ['#163300', '#9fe870', '#f7f9f5'],
    preview: {
      light: {
        shellBg: '#f4f7f2',
        headerBg: '#163300',
        headerText: '#ffffff',
        sidebarBg: '#163300',
        heroBg: 'linear-gradient(145deg, #163300 0%, #234d04 100%)',
        heroText: '#ffffff',
        heroAccent: '#9fe870',
        cardBg: '#ffffff',
        cardBorder: '#dde5d7',
        barFill: 'linear-gradient(90deg, #163300, #7bc948)',
        navBg: '#ffffff',
        navActive: '#163300',
      },
      dark: {
        shellBg: '#091205',
        headerBg: '#0f1d08',
        headerText: '#f4f7f2',
        sidebarBg: '#0f1d08',
        heroBg: 'linear-gradient(145deg, #163300 0%, #0f2103 100%)',
        heroText: '#ffffff',
        heroAccent: '#9fe870',
        cardBg: '#12210b',
        cardBorder: '#243c17',
        barFill: 'linear-gradient(90deg, #9fe870, #c9f7a8)',
        navBg: '#0f1d08',
        navActive: '#9fe870',
      },
    },
  },
  {
    id: 'revolut-blue',
    name: 'Revolut Ocean',
    tag: 'Cobalt Blue · Ice Slate · Banking',
    category: 'fintech',
    lightStatusBar: '#ffffff',
    darkStatusBar: '#070d17',
    swatches: ['#0075eb', '#f2f6fb', '#0b192c'],
    preview: {
      light: {
        shellBg: '#f2f6fb',
        headerBg: '#ffffff',
        headerText: '#0b192c',
        sidebarBg: '#ffffff',
        heroBg: 'linear-gradient(145deg, #0075eb 0%, #0054b8 100%)',
        heroText: '#ffffff',
        heroAccent: '#60b2ff',
        cardBg: '#ffffff',
        cardBorder: '#dbe4f0',
        barFill: 'linear-gradient(90deg, #0075eb, #38bdf8)',
        navBg: '#ffffff',
        navActive: '#0075eb',
      },
      dark: {
        shellBg: '#060b14',
        headerBg: '#0a1220',
        headerText: '#f1f5f9',
        sidebarBg: '#0a1220',
        heroBg: 'linear-gradient(145deg, #0052a8 0%, #0a254d 100%)',
        heroText: '#ffffff',
        heroAccent: '#4da3ff',
        cardBg: '#0e1729',
        cardBorder: '#1d2d4a',
        barFill: 'linear-gradient(90deg, #2589f5, #38bdf8)',
        navBg: '#0a1220',
        navActive: '#4da3ff',
      },
    },
  },
  {
    id: 'terminal-amber',
    name: 'Bloomberg Amber',
    tag: 'Financial Terminal · Amber · Slate',
    category: 'fintech',
    lightStatusBar: '#181a1f',
    darkStatusBar: '#0c0d10',
    swatches: ['#181a1f', '#f59e0b', '#f4f5f7'],
    preview: {
      light: {
        shellBg: '#f3f4f6',
        headerBg: '#181a1f',
        headerText: '#f9fafb',
        sidebarBg: '#181a1f',
        heroBg: 'linear-gradient(145deg, #181a1f 0%, #272b34 100%)',
        heroText: '#ffffff',
        heroAccent: '#f59e0b',
        cardBg: '#ffffff',
        cardBorder: '#e2e5ea',
        barFill: 'linear-gradient(90deg, #d97706, #fbbf24)',
        navBg: '#ffffff',
        navActive: '#b45309',
      },
      dark: {
        shellBg: '#0b0c0f',
        headerBg: '#121418',
        headerText: '#f3f4f6',
        sidebarBg: '#121418',
        heroBg: 'linear-gradient(145deg, #1b1e25 0%, #13151a 100%)',
        heroText: '#ffffff',
        heroAccent: '#fbbf24',
        cardBg: '#14171d',
        cardBorder: '#262b36',
        barFill: 'linear-gradient(90deg, #f59e0b, #fde047)',
        navBg: '#121418',
        navActive: '#fbbf24',
      },
    },
  },
  {
    id: 'emerald',
    name: 'Emerald Executive',
    tag: 'Emerald · Slate · Alabaster',
    category: 'fintech',
    lightStatusBar: '#ffffff',
    darkStatusBar: '#090c0b',
    swatches: ['#059669', '#f6f8fa', '#0f172a'],
    preview: {
      light: {
        shellBg: '#f6f8fa',
        headerBg: '#ffffff',
        headerText: '#0f172a',
        sidebarBg: '#ffffff',
        heroBg: '#ffffff',
        heroText: '#0f172a',
        heroAccent: '#10b981',
        cardBg: '#ffffff',
        cardBorder: '#e2e8f0',
        barFill: 'linear-gradient(90deg, #059669, #10b981)',
        navBg: '#ffffff',
        navActive: '#059669',
      },
      dark: {
        shellBg: '#080b0a',
        headerBg: '#0c110f',
        headerText: '#ecfdf5',
        sidebarBg: '#0c110f',
        heroBg: 'linear-gradient(145deg, #0f1f1a 0%, #0b1411 100%)',
        heroText: '#ecfdf5',
        heroAccent: '#34d399',
        cardBg: '#111715',
        cardBorder: '#1f2d28',
        barFill: 'linear-gradient(90deg, #059669, #34d399)',
        navBg: '#0c110f',
        navActive: '#34d399',
      },
    },
  },
  {
    id: 'obsidian',
    name: 'Midnight Indigo',
    tag: 'Indigo · Cyan · Obsidian',
    category: 'fintech',
    lightStatusBar: '#ffffff',
    darkStatusBar: '#090b12',
    swatches: ['#6366f1', '#22d3ee', '#090b12'],
    preview: {
      light: {
        shellBg: '#f3f5fc',
        headerBg: '#ffffff',
        headerText: '#1e1b4b',
        sidebarBg: '#ffffff',
        heroBg: 'linear-gradient(145deg, #312e81 0%, #4338ca 100%)',
        heroText: '#ffffff',
        heroAccent: '#22d3ee',
        cardBg: '#ffffff',
        cardBorder: '#dde3f4',
        barFill: 'linear-gradient(90deg, #4f46e5, #06b6d4)',
        navBg: '#ffffff',
        navActive: '#4f46e5',
      },
      dark: {
        shellBg: '#07080d',
        headerBg: '#090b12',
        headerText: '#f8fafc',
        sidebarBg: '#090b12',
        heroBg: 'linear-gradient(155deg, #15192c 0%, #0e111f 100%)',
        heroText: '#ffffff',
        heroAccent: '#22d3ee',
        cardBg: '#111420',
        cardBorder: '#272c42',
        barFill: 'linear-gradient(90deg, #6366f1, #22d3ee)',
        navBg: '#090b12',
        navActive: '#818cf8',
      },
    },
  },
  {
    id: 'navy',
    name: 'Royal Navy & Gold',
    tag: 'Royal Navy · Ivory · Gold',
    category: 'fintech',
    lightStatusBar: '#0b1d36',
    darkStatusBar: '#071222',
    swatches: ['#0b1d36', '#d4a03a', '#f5f3ee'],
    preview: {
      light: {
        shellBg: '#f5f3ee',
        headerBg: '#0b1d36',
        headerText: '#ffffff',
        sidebarBg: '#0b1d36',
        heroBg: 'linear-gradient(140deg, #0b1d36 0%, #16345e 100%)',
        heroText: '#ffffff',
        heroAccent: '#eab308',
        cardBg: '#ffffff',
        cardBorder: '#ddd6c7',
        barFill: 'linear-gradient(90deg, #0f294d, #d4a03a)',
        navBg: '#ffffff',
        navActive: '#0b1d36',
      },
      dark: {
        shellBg: '#060e1a',
        headerBg: '#091629',
        headerText: '#f8fafc',
        sidebarBg: '#091629',
        heroBg: 'linear-gradient(140deg, #0e2240 0%, #16335c 100%)',
        heroText: '#ffffff',
        heroAccent: '#f5c451',
        cardBg: '#0d1b30',
        cardBorder: '#1e3352',
        barFill: 'linear-gradient(90deg, #d4a03a, #fde08d)',
        navBg: '#091629',
        navActive: '#f5c451',
      },
    },
  },
  {
    id: 'material-sage',
    name: 'Material You Sage',
    tag: 'Sage · Forest · Terracotta',
    category: 'editorial',
    lightStatusBar: '#eff4ef',
    darkStatusBar: '#101813',
    swatches: ['#2d6a4f', '#d8e8dc', '#c86d51'],
    preview: {
      light: {
        shellBg: '#eff4ef',
        headerBg: '#eff4ef',
        headerText: '#16281e',
        sidebarBg: '#e6efe7',
        heroBg: '#d8e8dc',
        heroText: '#10261b',
        heroAccent: '#2d6a4f',
        cardBg: '#fafcfa',
        cardBorder: '#d3e1d6',
        barFill: '#2d6a4f',
        navBg: '#e6efe7',
        navActive: '#10261b',
        useM3Pill: true,
      },
      dark: {
        shellBg: '#0d1410',
        headerBg: '#121b16',
        headerText: '#e6f2e9',
        sidebarBg: '#121b16',
        heroBg: 'linear-gradient(145deg, #1a2d22 0%, #15241b 100%)',
        heroText: '#e6f2e9',
        heroAccent: '#74c69d',
        cardBg: '#141f19',
        cardBorder: '#24382c',
        barFill: 'linear-gradient(90deg, #52b788, #e08d72)',
        navBg: '#121b16',
        navActive: '#95d5b2',
        useM3Pill: true,
      },
    },
  },
  {
    id: 'egyptian-scarlet',
    name: 'Egyptian & Scarlet',
    tag: 'Egyptian Blue · Stone Blue · Scarlet Red',
    category: 'editorial',
    lightStatusBar: '#1034A6',
    darkStatusBar: '#091744',
    swatches: ['#1034A6', '#6B8299', '#E02D2D'],
    preview: {
      light: {
        shellBg: '#EAEFF4',
        headerBg: '#1034A6',
        headerText: '#ffffff',
        sidebarBg: '#1034A6',
        heroBg: 'linear-gradient(145deg, #1034A6 0%, #1C47C7 100%)',
        heroText: '#ffffff',
        heroAccent: '#FF5A5A',
        cardBg: '#ffffff',
        cardBorder: '#D4DEE8',
        barFill: 'linear-gradient(90deg, #1034A6, #E02D2D)',
        navBg: '#ffffff',
        navActive: '#1034A6',
      },
      dark: {
        shellBg: '#081024',
        headerBg: '#0C1A42',
        headerText: '#F0F5FF',
        sidebarBg: '#0C1A42',
        heroBg: 'linear-gradient(145deg, #1034A6 0%, #152A6E 100%)',
        heroText: '#ffffff',
        heroAccent: '#FF5A5A',
        cardBg: '#101B38',
        cardBorder: '#223563',
        barFill: 'linear-gradient(90deg, #3B6EF6, #FF5252)',
        navBg: '#0C1A42',
        navActive: '#FF6B6B',
      },
    },
  },
  {
    id: 'sand-mocha',
    name: 'Sand & Mocha',
    tag: 'Soft Sand · Mocha Green · Watermelon Pink',
    category: 'editorial',
    lightStatusBar: '#F3ECE1',
    darkStatusBar: '#171C15',
    swatches: ['#F3ECE1', '#4A5743', '#F05A78'],
    preview: {
      light: {
        shellBg: '#F3ECE1',
        headerBg: '#F3ECE1',
        headerText: '#2A3326',
        sidebarBg: '#ECE3D3',
        heroBg: 'linear-gradient(145deg, #4A5743 0%, #3A4535 100%)',
        heroText: '#FAF6F0',
        heroAccent: '#F05A78',
        cardBg: '#FAF7F2',
        cardBorder: '#E5DAC8',
        barFill: 'linear-gradient(90deg, #4A5743, #F05A78)',
        navBg: '#FAF7F2',
        navActive: '#4A5743',
      },
      dark: {
        shellBg: '#121610',
        headerBg: '#181E16',
        headerText: '#F3ECE1',
        sidebarBg: '#181E16',
        heroBg: 'linear-gradient(145deg, #2B3527 0%, #1E251B 100%)',
        heroText: '#FAF6F0',
        heroAccent: '#FF7592',
        cardBg: '#1B2118',
        cardBorder: '#2E382A',
        barFill: 'linear-gradient(90deg, #7A9170, #FF7592)',
        navBg: '#181E16',
        navActive: '#FF7592',
      },
    },
  },
  {
    id: 'olive-butterlight',
    name: 'Black Olive & Butterlight',
    tag: '#282c20 · #e8e5d8 · #e8ca78',
    category: 'editorial',
    lightStatusBar: '#282c20',
    darkStatusBar: '#141710',
    swatches: ['#282c20', '#e8e5d8', '#e8ca78'],
    preview: {
      light: {
        shellBg: '#e8e5d8',
        headerBg: '#282c20',
        headerText: '#F7F5EE',
        sidebarBg: '#282c20',
        heroBg: 'linear-gradient(145deg, #282c20 0%, #343929 100%)',
        heroText: '#F9F7F0',
        heroAccent: '#e8ca78',
        cardBg: '#F6F4EC',
        cardBorder: '#D5D1C1',
        barFill: 'linear-gradient(90deg, #282c20, #C8A54B)',
        navBg: '#F6F4EC',
        navActive: '#282c20',
      },
      dark: {
        shellBg: '#131610',
        headerBg: '#1C2017',
        headerText: '#e8e5d8',
        sidebarBg: '#1C2017',
        heroBg: 'linear-gradient(145deg, #282c20 0%, #1E2218 100%)',
        heroText: '#F7F5EE',
        heroAccent: '#e8ca78',
        cardBg: '#1D2118',
        cardBorder: '#323828',
        barFill: 'linear-gradient(90deg, #e8ca78, #f5dfa0)',
        navBg: '#1C2017',
        navActive: '#e8ca78',
      },
    },
  },
  {
    id: 'oxblood-shell',
    name: 'Oxblood & Shell Pink',
    tag: 'Shell Pink · Oxblood · Lacquer Red',
    category: 'editorial',
    lightStatusBar: '#4E0F1B',
    darkStatusBar: '#1E070C',
    swatches: ['#F9E6E1', '#4E0F1B', '#C81D32'],
    preview: {
      light: {
        shellBg: '#F9E6E1',
        headerBg: '#4E0F1B',
        headerText: '#FFF6F4',
        sidebarBg: '#4E0F1B',
        heroBg: 'linear-gradient(145deg, #4E0F1B 0%, #7A1628 100%)',
        heroText: '#ffffff',
        heroAccent: '#FF4D63',
        cardBg: '#FFF9F7',
        cardBorder: '#EED2CB',
        barFill: 'linear-gradient(90deg, #4E0F1B, #C81D32)',
        navBg: '#FFF9F7',
        navActive: '#4E0F1B',
      },
      dark: {
        shellBg: '#14060A',
        headerBg: '#220910',
        headerText: '#FBECE8',
        sidebarBg: '#220910',
        heroBg: 'linear-gradient(145deg, #4E0F1B 0%, #2E0912 100%)',
        heroText: '#FFF6F4',
        heroAccent: '#FF5C72',
        cardBg: '#200B11',
        cardBorder: '#3E1721',
        barFill: 'linear-gradient(90deg, #E12D44, #F7B6A8)',
        navBg: '#220910',
        navActive: '#FF6B7F',
      },
    },
  },
  {
    id: 'espresso-celadon',
    name: 'Espresso & Celadon',
    tag: 'Espresso · Linen · Celadon',
    category: 'editorial',
    lightStatusBar: '#2E1F18',
    darkStatusBar: '#18100C',
    swatches: ['#2E1F18', '#F5EFE6', '#88B496'],
    preview: {
      light: {
        shellBg: '#F5EFE6',
        headerBg: '#2E1F18',
        headerText: '#FAF6F0',
        sidebarBg: '#2E1F18',
        heroBg: 'linear-gradient(145deg, #2E1F18 0%, #3F2C22 100%)',
        heroText: '#FAF6F0',
        heroAccent: '#88B496',
        cardBg: '#FCF9F4',
        cardBorder: '#E4D9C9',
        barFill: 'linear-gradient(90deg, #2E1F18, #74A684)',
        navBg: '#FCF9F4',
        navActive: '#2E1F18',
      },
      dark: {
        shellBg: '#140E0B',
        headerBg: '#1E1511',
        headerText: '#F5EFE6',
        sidebarBg: '#1E1511',
        heroBg: 'linear-gradient(145deg, #2E1F18 0%, #221712 100%)',
        heroText: '#FAF6F0',
        heroAccent: '#9BC8A9',
        cardBg: '#1E1612',
        cardBorder: '#362821',
        barFill: 'linear-gradient(90deg, #88B496, #C2E0CB)',
        navBg: '#1E1511',
        navActive: '#9BC8A9',
      },
    },
  },
];

const VALID_THEME_IDS = new Set<string>(APP_THEMES.map((t) => t.id));

export function isValidAppThemeId(value: string | null | undefined): value is AppThemeId {
  return Boolean(value && VALID_THEME_IDS.has(value));
}

export function getAppThemeDefinition(themeId: AppThemeId): AppThemeDefinition {
  return APP_THEMES.find((t) => t.id === themeId) || APP_THEMES[0];
}

export function getSavedAppTheme(): AppThemeId {
  try {
    const saved = localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (isValidAppThemeId(saved)) {
      return saved;
    }
  } catch {
    // Ignore storage errors
  }
  return 'default';
}

export function getSavedDarkMode(): boolean {
  try {
    const legacy = localStorage.getItem(LEGACY_THEME_PREF_KEY);
    if (legacy === 'dark') return true;
    if (legacy === 'light') return false;
  } catch {
    // Ignore storage errors
  }
  return false;
}

export function saveAppTheme(themeId: AppThemeId): void {
  try {
    localStorage.setItem(APP_THEME_STORAGE_KEY, themeId);
  } catch {
    // Ignore storage errors
  }
}

export function saveDarkMode(isDark: boolean): void {
  try {
    localStorage.setItem(LEGACY_THEME_PREF_KEY, isDark ? 'dark' : 'light');
  } catch {
    // Ignore storage errors
  }
}

export function applyAppThemeToDocument(themeId: AppThemeId, isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const def = getAppThemeDefinition(themeId);

  document.documentElement.setAttribute('data-app-theme', def.id);
  document.body.setAttribute('data-app-theme', def.id);

  if (isDark) {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
    document.body.classList.remove('dark');
  }

  let metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (!metaThemeColor) {
    metaThemeColor = document.createElement('meta');
    metaThemeColor.setAttribute('name', 'theme-color');
    document.head.appendChild(metaThemeColor);
  }
  metaThemeColor.setAttribute('content', isDark ? def.darkStatusBar : def.lightStatusBar);
}
