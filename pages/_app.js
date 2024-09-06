import '../styles/globals.css'
import Layout from '../components/Layout';

function MyApp({ Component, pageProps }) {
  console.log('MyApp rendering');
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}

export default MyApp
