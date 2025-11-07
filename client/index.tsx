import ReactDOM from 'react-dom/client';
import App from './App';
import { HeroUIProvider, ToastProvider } from '@heroui/react';

const rootEl = document.getElementById('root');
if (rootEl) {
  const root = ReactDOM.createRoot(rootEl);
  root.render(
    <HeroUIProvider>
      <ToastProvider placement='top-center' maxVisibleToasts={1} />
      <App />
    </HeroUIProvider>
  );
}
