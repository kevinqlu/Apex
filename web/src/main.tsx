import '@fontsource/barlow/400.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/shell.css';
import './styles/login.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from './components/AppShell';
import { AuthProvider } from './components/AuthProvider';
import { ComingSoon } from './components/ComingSoon';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Home } from './routes/home/Home';
import { Login } from './routes/login/Login';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/" element={<Home />} />
              <Route
                path="/loads"
                element={
                  <ComingSoon title="Loads">Your assigned loads will show up here.</ComingSoon>
                }
              />
              <Route
                path="/alerts"
                element={
                  <ComingSoon title="Alerts">
                    Announcements and urgent alerts will show up here.
                  </ComingSoon>
                }
              />
              <Route
                path="/onboarding"
                element={
                  <ComingSoon title="Onboarding">
                    Your onboarding checklist will show up here.
                  </ComingSoon>
                }
              />
              <Route
                path="/documents"
                element={
                  <ComingSoon title="Documents">Your documents will show up here.</ComingSoon>
                }
              />
              <Route
                path="/help"
                element={<ComingSoon title="Help">Support contacts will show up here.</ComingSoon>}
              />
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
