import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ChatProvider } from './contexts/ChatContext';
import ChatWidget from './components/ChatWidget';
import { Toaster } from './components/ui/sonner';
import { router } from './routes';

export default function App() {
  return (
    <AuthProvider>
      <ChatProvider>
        <RouterProvider router={router} />
        <ChatWidget />
        <Toaster position="top-right" />
      </ChatProvider>
    </AuthProvider>
  );
}
