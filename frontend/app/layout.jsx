import './globals.css';
import { Toaster } from 'react-hot-toast';
import Providers from './providers';

export const metadata = {
  title: 'AI Reception Dashboard',
  description: 'Hotel AI Receptionist Management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Toaster position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
