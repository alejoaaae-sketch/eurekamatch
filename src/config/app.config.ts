// App configuration - can be overridden by environment variables
export type AppType = 'love' | 'plan' | 'sex';

// BETA MODE: Set to false to enable payments
export const BETA_MODE = true;

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
  sex: {
    appType: 'sex',
    appName: 'EUREKA SEX',
    maxPicks: 2,
    primaryColor: 'hsl(0, 84%, 50%)', // Red
    accentColor: 'hsl(0, 84%, 60%)',
    tagline: 'Descubre la atracción mutua',
  },
};

// Get app type from URL parameter, environment, or default to 'love'
const getAppType = (): AppType => {
  // Check URL parameter first (e.g., ?app=love, ?app=plan, ?app=sex)
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlAppType = urlParams.get('app');
    if (urlAppType && ['love', 'plan', 'sex'].includes(urlAppType)) {
      // Store in sessionStorage to persist during navigation
      sessionStorage.setItem('eureka_app_type', urlAppType);
      return urlAppType as AppType;
    }
    // Check sessionStorage for previously set app type
    const storedAppType = sessionStorage.getItem('eureka_app_type');
    if (storedAppType && ['love', 'plan', 'sex'].includes(storedAppType)) {
      return storedAppType as AppType;
    }
  }
  // Fall back to environment variable
  const envAppType = import.meta.env.VITE_APP_TYPE as string;
  if (envAppType && ['love', 'plan', 'sex'].includes(envAppType)) {
    return envAppType as AppType;
  }
  return 'love';
};

export const currentAppType = getAppType();
export const appConfig = appConfigs[currentAppType];

export const getAppConfig = (type?: AppType): AppConfig => {
  return appConfigs[type || currentAppType];
};
