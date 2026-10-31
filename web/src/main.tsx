import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/login.css';
import './styles/loads.css';
import './styles/alerts.css';
import './styles/onboarding.css';
import './styles/help.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { AuthProvider } from './components/AuthProvider';
import { ComingSoon } from './components/ComingSoon';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './routes/home/Home';
import { Alerts } from './routes/alerts/Alerts';
import { Documents } from './routes/documents/Documents';
import { Help } from './routes/help/Help';
import { Loads } from './routes/loads/Loads';
import { Login } from './routes/login/Login';
import { Onboarding } from './routes/onboarding/Onboarding';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route path="/loads" element={<Loads />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/onboarding" element={<Onboarding />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/help" element={<Help />} />
            </Route>
          </Route>
          <Route
            path="*"
            element={
              <ComingSoon title="Page not found">
                Use the menu to go to a section of the portal.
              </ComingSoon>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
