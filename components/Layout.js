import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { setupConfig } from './config';

export default function Layout({ children }) {
  const router = useRouter();

  console.log('Layout rendering, pathname:', router.pathname);

  useEffect(() => {
    console.log('Layout useEffect running, pathname:', router.pathname);
    const env = router.query.env || router.pathname.split('/')[1];
    console.log('Detected env:', env);  
    if (['mainnet', 'testnet'].includes(env)) {
      console.log('Setting up FCL configuration for:', env);
      setupConfig(env);
    } else {
      console.log('No valid environment detected for FCL setup');
    }
  }, [router.pathname, router.query.env]);

  return <>{children}</>;
}