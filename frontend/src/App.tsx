import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { RootLayout } from './components/layout/RootLayout'
import { LoginPage } from './pages/auth/LoginPage'
import { OAuthCallbackPage } from './pages/auth/OAuthCallbackPage'
import { AnalyticsPage } from './pages/analytics/AnalyticsPage'
import { CreatorProfilePage } from './pages/creator/CreatorProfilePage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ExplorePage } from './pages/explore/ExplorePage'
import { ProfilePage } from './pages/profile/ProfilePage'
import { ProjectsPage } from './pages/projects/ProjectsPage'
import { SettingsPage } from './pages/settings/SettingsPage'
import { TutorialPage } from './pages/tutorial/TutorialPage'
import { AppProviders } from './providers/AppProviders'

function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<RootLayout />}>
              <Route index element={<DashboardPage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/creator/:userId" element={<CreatorProfilePage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/tutorial" element={<TutorialPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProviders>
  )
}

export default App
