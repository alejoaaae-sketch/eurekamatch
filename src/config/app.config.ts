// App configuration - can be overridden by environment variables
export type AppType = 'love' | 'friends' | 'sex' | 'hobby';

// BETA MODE: Set to false to enable payments
export const BETA_MODE = true;

// VERIFY MOBILE: Set to false (0) to skip SMS verification during testing
export const VERIFY_MOBILE = false;

export interface AppConfig {
  appType: AppType;
  appName: string;
  maxPicks: number;
  primaryColor: string;
  accentColor: string;
  tagline: string;
}

const appConfigs: Record<AppType, AppConfig> = {
  love: {
    appType: 'love',
    appName: 'EUREKA LOVE',
    maxPicks: 2,
    primaryColor: 'hsl(346, 77%, 49%)', // Rose/pink
    accentColor: 'hsl(346, 77%, 59%)',
    tagline: 'Descubre si el amor es mutuo',
  },
  friends: {
    appType: 'friends',
    appName: 'EUREKA FRIENDS',
    maxPicks: 5,
    primaryColor: 'hsl(25, 95%, 53%)', // Orange/amber
    accentColor: 'hsl(25, 95%, 63%)',
    tagline: 'Amigos con los que puedes contar. Porque es mutuo.',
  },
  sex: {
    appType: 'sex',
    appName: 'EUREKA SEX',
    maxPicks: 2,
    primaryColor: 'hsl(0, 84%, 50%)', // Red
    accentColor: 'hsl(0, 84%, 60%)',
    tagline: 'Descubre la atracción mutua',
  },
  hobby: {
    appType: 'hobby',
    appName: 'EUREKA HOBBY',
    maxPicks: 5,
    primaryColor: 'hsl(142, 71%, 45%)', // Green
    accentColor: 'hsl(142, 71%, 55%)',
    tagline: 'Descubre si quiere compartir hobby contigo',
  },
};

const VALID_APP_TYPES: AppType[] = ['love', 'friends', 'sex', 'hobby'];

// Backwards-compatibility map for old URL parameters / sessionStorage values
const LEGACY_APP_TYPE_MAP: Record<string, AppType> = {
  plan: 'friends',
  mude: 'sex',
  sport: 'hobby',
};

const normalizeAppType = (value: string | null | undefined): AppType | null => {
  if (!value) return null;
  if ((VALID_APP_TYPES as string[]).includes(value)) return value as AppType;
  if (LEGACY_APP_TYPE_MAP[value]) return LEGACY_APP_TYPE_MAP[value];
  return null;
};

// Get app type from URL parameter, environment, or default to 'love'
const getAppType = (): AppType => {
  // Check URL parameter first (e.g., ?app=love, ?app=friends, ?app=sex, ?app=hobby)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlAppType = normalizeAppType(urlParams.get('app'));
    if (urlAppType) {
      sessionStorage.setItem('eureka_app_type', urlAppType);
      return urlAppType;
    }
    // Check sessionStorage for previously set app type
    const storedAppType = normalizeAppType(sessionStorage.getItem('eureka_app_type'));
    if (storedAppType) {
      // If a legacy value was stored, normalize it
      sessionStorage.setItem('eureka_app_type', storedAppType);
      return storedAppType;
    }
  }
  // Fall back to environment variable
  const envAppType = normalizeAppType(import.meta.env.VITE_APP_TYPE as string);
  if (envAppType) return envAppType;
  return 'love';
};

export const currentAppType = getAppType();

// Use a Proxy so appConfig always reflects the current app type (which may
// change via sessionStorage during SPA navigation between app modes).
export const appConfig: AppConfig = new Proxy({} as AppConfig, {
  get(_, prop: string) {
    return appConfigs[getAppType()][prop as keyof AppConfig];
  },
});

export const getAppConfig = (type?: AppType): AppConfig => {
  return appConfigs[type || currentAppType];
};
