import './globals.css';
import { Toaster } from 'react-hot-toast';
import Providers from './providers';
import CookieConsent from '../components/CookieConsent';

export const metadata = {
  title: 'Rehema AI Dashboard',
  description: 'Hotel AI Receptionist Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 bg-blue-600 text-white px-3 py-1 rounded z-50">
          Skip to main content
        </a>
        <Providers>
          <main id="main-content">
            {children}
          </main>
          <Toaster position="top-right" />
          <CookieConsent />
        </Providers>
        <footer className="py-4 text-center text-xs text-gray-500 space-x-4">
          <a href="/privacy" className="hover:text-gray-300">Privacy Policy</a>
          <a href="/terms" className="hover:text-gray-300">Terms of Use</a>
          <a href="/cookies" className="hover:text-gray-300">Cookie Policy</a>
          <a href="/dpa" className="hover:text-gray-300">DPA</a>
        </footer>
      </body>
    </html>
  );
}
