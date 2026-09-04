import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider, useAuth } from './contexts/AuthContext.tsx'
import { LoginPage } from './pages/LoginPage.tsx'
import { Loader2 } from 'lucide-react'

function RootApp() {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary, #0f172a)", color: "#fff" }}>
        <Loader2 size={32} className="animate-spin" color="var(--accent, #2563eb)" />
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  // Keying App by currentUser.id guarantees 100% clean state destruction and recreation on user switch!
  return <App key={currentUser.id} />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <RootApp />
    </AuthProvider>
  </StrictMode>,
)
