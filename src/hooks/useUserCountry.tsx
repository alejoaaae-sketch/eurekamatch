import { useState, useEffect } from 'react';

export const useUserCountry = () => {
  const [country, setCountry] = useState<string | null>(() => {
    return sessionStorage.getItem('user_country');
  });
  const [loading, setLoading] = useState(!sessionStorage.getItem('user_country'));

  useEffect(() => {
    const cached = sessionStorage.getItem('user_country');
    if (cached) {
      setCountry(cached);
      setLoading(false);
      return;
    }

    const detect = async () => {
      try {
        const res = await fetch('https://ip-api.com/json/?fields=countryCode', {
          signal: AbortSignal.timeout(3000),
        });
        const data = await res.json();
        const code = data?.countryCode as string;
        if (code) {
          sessionStorage.setItem('user_country', code);
          setCountry(code);
        }
      } catch {
        // fallback: no country detected
      } finally {
        setLoading(false);
      }
    };

    detect();
  }, []);

  return { country, loading };
};
