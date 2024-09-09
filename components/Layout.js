import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { setupConfig } from './config';

export default function Layout({ children }) {
  const router = useRouter();


  useEffect(() => {
    const env = router.query.env || router.pathname.split('/')[1];
    if (['mainnet', 'testnet'].includes(env)) {
      setupConfig(env);
    } else {
      console.log('No valid environment detected for FCL setup');
    }
  }, [router.pathname, router.query.env]);

  return <>{children}</>;
}