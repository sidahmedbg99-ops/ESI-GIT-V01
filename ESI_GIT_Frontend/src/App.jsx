import { Toaster } from 'react-hot-toast';
import AppRoutes from './routes/AppRoutes';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  return (
    <LanguageProvider>
      <ThemeProvider>
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            },
          }}
        />
        <AppRoutes />
      </ThemeProvider>
    </LanguageProvider>
  );
}
