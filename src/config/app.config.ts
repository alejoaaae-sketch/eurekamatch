// App configuration - can be overridden by environment variables
export type AppType = 'love' | 'plan' | 'mude' | 'sport';

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
  plan: {
    appType: 'plan',
    appName: 'EUREKA FRIENDS',
    maxPicks: 5,
    primaryColor: 'hsl(25, 95%, 53%)', // Orange/amber
    accentColor: 'hsl(25, 95%, 63%)',
    tagline: 'Amigos con los que puedes contar. Porque es mutuo.',
  },
  mude: {
    appType: 'mude',
    appName: 'EUREKA MUDE (MUtual DEsire)',
    maxPicks: 2,
    primaryColor: 'hsl(0, 84%, 50%)', // Red
    accentColor: 'hsl(0, 84%, 60%)',
    tagline: 'Descubre la atracción mutua',
  },
  sport: {
    appType: 'sport',
    appName: 'EUREKA SPORT',
    maxPicks: 5,
    primaryColor: 'hsl(142, 71%, 45%)', // Green
    accentColor: 'hsl(142, 71%, 55%)',
    tagline: 'Descubre si quiere hacer deporte contigo',
  },
};

// Get app type from URL parameter, environment, or default to 'love'
const getAppType = (): AppType => {
  // Check URL parameter first (e.g., ?app=love, ?app=plan, ?app=sex)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlAppType = urlParams.get('app');
    if (urlAppType && ['love', 'plan', 'mude', 'sport'].includes(urlAppType)) {
      // Store in sessionStorage to persist during navigation
      sessionStorage.setItem('eureka_app_type', urlAppType);
      return urlAppType as AppType;
    }
    // Check sessionStorage for previously set app type
    const storedAppType = sessionStorage.getItem('eureka_app_type');
    if (storedAppType && ['love', 'plan', 'mude', 'sport'].includes(storedAppType)) {
      return storedAppType as AppType;
    }
  }
  // Fall back to environment variable
  const envAppType = import.meta.env.VITE_APP_TYPE as string;
  if (envAppType && ['love', 'plan', 'mude', 'sport'].includes(envAppType)) {
    return envAppType as AppType;
  }
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
