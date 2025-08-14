import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

// Layouts
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// Public Pages
import { Home } from '@/pages/Home'
import { Login } from '@/pages/Login'

// Dashboard Pages
import { Dashboard } from '@/pages/Dashboard'
import { DeliveryManagement } from '@/pages/DeliveryManagement'
import { ExamManagement } from '@/pages/ExamManagement'
import { GroupManagement } from '@/pages/GroupManagement'
import { QuestionCategories } from '@/pages/QuestionCategories'
import { QuestionSets } from '@/pages/QuestionSets'
import { CandidateManagement } from '@/pages/CandidateManagement'
import { ScoringManagement } from '@/pages/ScoringManagement'
import { ResultsManagement } from '@/pages/ResultsManagement'

// Detail Pages
import { QuestionSetDetails } from '@/pages/QuestionSetDetails'
import { GroupDetails } from '@/pages/GroupDetails'
import { ScoringDetails } from '@/pages/ScoringDetails'
import { DetailedResultsView } from '@/pages/DetailedResultsView'
import { QuestionSearchFilter } from '@/pages/QuestionSearchFilter'
import { QuestionDetail } from '@/pages/QuestionDetail'
import { UserProfileSettings } from '@/pages/UserProfileSettings'
import { UserAccessControl } from '@/pages/UserAccessControl'
import { ExamDetails } from '@/pages/ExamDetails'
import { DeliveryDetails } from '@/pages/DeliveryDetails'

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route
          path="/back-office"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/back-office/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="delivery" element={<DeliveryManagement />} />
          <Route path="delivery/:id" element={<DeliveryDetails />} />
          <Route path="test" element={<ExamManagement />} />
          <Route path="test/:id" element={<ExamDetails />} />
          <Route path="group" element={<GroupManagement />} />
          <Route path="category" element={<QuestionCategories />} />
          <Route path="question-set" element={<QuestionSets />} />
          <Route path="question-pack" element={<QuestionSearchFilter />} />
          <Route path="question/:id" element={<QuestionDetail />} />
          <Route path="question-set/:id" element={<QuestionSetDetails />} />
          <Route path="group/:id/takers" element={<GroupDetails />} />
          <Route path="scoring/:id" element={<ScoringDetails />} />
          <Route path="result/:id" element={<DetailedResultsView />} />
          <Route path="test-taker" element={<CandidateManagement />} />
          <Route path="scoring" element={<ScoringManagement />} />
          <Route path="result" element={<ResultsManagement />} />
          <Route path="profile" element={<UserProfileSettings />} />
          <Route path="user" element={<UserAccessControl />} />
        </Route>
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

// Placeholder components for pages not yet implemented

export default App