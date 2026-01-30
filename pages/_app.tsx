import type { AppProps } from "next/app";
import Head from "next/head";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <link rel="icon" href="/Clonet%20app%20logo.png" type="image/png" />
        <link rel="preload" href="/CLONET%20TRANSPARENT%20LOGO.png" as="image" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{ __html: `
          @font-face {
            font-family: 'Undefined Medium';
            src: url('https://raw.githubusercontent.com/andirueckel/undefined-medium/main/fonts/webfonts/undefined-medium.woff2') format('woff2');
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `}} />
      </Head>
      <Component {...pageProps} />
      <style jsx global>{`
        html,
        body,
        #__next {
          height: 100%;
          margin: 0;
          padding: 0;
          background-color: #121212;
          background-image: radial-gradient(ellipse 85% 85% at 50% 50%, #2a2a2a 0%, #202020 30%, #1a1a1a 60%, #121212 100%);
        }
        body {
          color: #f5f5f5;
        }
      `}</style>
    </>
  );
}

