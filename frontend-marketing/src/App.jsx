import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Ads from './pages/Ads'
import AdDesigner from './pages/AdDesigner'
import EmailCampaigns from './pages/EmailCampaigns'
import EmailEditor from './pages/EmailEditor'
import EmailTemplates from './pages/EmailTemplates'
import EmailTemplateCreate from './pages/EmailTemplateCreate'
import CampaignCreate from './pages/CampaignCreate'
import Audiences from './pages/Audiences'
import AudienceCreate from './pages/AudienceCreate'
import Segments from './pages/Segments'
import ABTesting from './pages/ABTesting'
import ABTestCreate from './pages/ABTestCreate'
import SocialMedia from './pages/SocialMedia'
import SocialMediaCreate from './pages/SocialMediaCreate'
import Notifications from './pages/Notifications'
import NotificationCreate from './pages/NotificationCreate'
import Automation from './pages/Automation'
import AutomationCreate from './pages/AutomationCreate'
import Budget from './pages/Budget'
import BudgetCreate from './pages/BudgetCreate'
import Analytics from './pages/Analytics'
import AdminControl from './pages/AdminControl'
import Settings from './pages/Settings'
import ContentLibrary from './pages/ContentLibrary'
import RecipesAndMealPlans from './pages/RecipesAndMealPlans'
import RecipesRedirect from './pages/RecipesRedirect'
import MealPlansRedirect from './pages/MealPlansRedirect'
import RecipeCreate from './pages/RecipeCreate'
import MealPlanCreate from './pages/MealPlanCreate'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'

const PrivateRoute = ({ children }) => {
  const { token, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }
  
  return token ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="campaigns" element={<Campaigns />} />
        <Route path="campaigns/new" element={<CampaignCreate />} />
        <Route path="campaigns/:id" element={<CampaignDetail />} />
        <Route path="ads" element={<Ads />} />
        <Route path="ads/new" element={<AdDesigner />} />
        <Route path="ads/:id/edit" element={<AdDesigner />} />
        <Route path="email-campaigns" element={<EmailCampaigns />} />
        <Route path="email-campaigns/new" element={<EmailEditor />} />
        <Route path="email-campaigns/:id/edit" element={<EmailEditor />} />
        <Route path="email-templates" element={<EmailTemplates />} />
        <Route path="email-templates/new" element={<EmailTemplateCreate />} />
        <Route path="audiences" element={<Audiences />} />
        <Route path="audiences/new" element={<AudienceCreate />} />
        <Route path="segments" element={<Segments />} />
        <Route path="ab-testing" element={<ABTesting />} />
        <Route path="ab-testing/new" element={<ABTestCreate />} />
        <Route path="social-media" element={<SocialMedia />} />
        <Route path="social-media/new" element={<SocialMediaCreate />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="notifications/:type/new" element={<NotificationCreate />} />
        <Route path="automation" element={<Automation />} />
        <Route path="automation/new" element={<AutomationCreate />} />
        <Route path="budget" element={<Budget />} />
        <Route path="budget/new" element={<BudgetCreate />} />
        <Route path="content-library" element={<ContentLibrary />} />
        <Route path="recipes-meal-plans" element={<RecipesAndMealPlans />} />
        <Route path="recipes" element={<RecipesRedirect />} />
        <Route path="recipes/new" element={<RecipeCreate />} />
        <Route path="recipes/:id/edit" element={<RecipeCreate />} />
        <Route path="meal-plans" element={<MealPlansRedirect />} />
        <Route path="meal-plans/new" element={<MealPlanCreate />} />
        <Route path="meal-plans/:id/edit" element={<MealPlanCreate />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="admin-control" element={<AdminControl />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App

