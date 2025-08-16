import { Toaster } from "@/components/ui/toaster";
import { useAuthStore } from "@/store/authStore";
import { useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";

// Layouts
import { MainLayout } from "@/components/layout/MainLayout";
import { MainContent } from "@/components/layout/MainContent";

// Public Pages
import { AdminAssignmentOverview } from "@/pages/AdminAssignmentOverview";
import { CommitteeDashboard } from "@/pages/CommitteeDashboard";
import { CommitteeLogin } from "@/pages/CommitteeLogin";
import { CommitteeScorerManagement } from "@/pages/CommitteeScorerManagement";
import { Home } from "@/pages/Home";
import { LiveProgress } from "@/pages/LiveProgress";
import { Login } from "@/pages/Login";
import { ParticipantExam } from "@/pages/ParticipantExam";
import { ParticipantLogin } from "@/pages/ParticipantLogin";
import { ScorerDashboard } from "@/pages/ScorerDashboard";
import { TestCodeLogin } from "@/pages/TestCodeLogin";

// Dashboard Pages
import { Dashboard } from "@/pages/Dashboard";
import { DeliveryManagement } from "@/pages/DeliveryManagement";
import { ExamManagement } from "@/pages/ExamManagement";
import { GroupManagementModular as GroupManagement } from "@/pages/GroupManagementModular";
import { ParticipantManagement } from "@/pages/ParticipantManagement";
import { QuestionCategories } from "@/pages/QuestionCategories";
import { QuestionSets } from "@/pages/QuestionSets";
import { ResultsManagement } from "@/pages/ResultsManagement";
import { ScoringManagement } from "@/pages/ScoringManagement";

// Detail Pages
import { DeliveryDetails } from "@/pages/DeliveryDetails";
import { DetailedResultsView } from "@/pages/DetailedResultsView";
import { ExamDetails } from "@/pages/ExamDetails";
import { GroupDetails } from "@/pages/GroupDetails";
import { QuestionDetail } from "@/pages/QuestionDetail";
import { QuestionScoring } from "@/pages/QuestionScoring";
import { QuestionSearchFilter } from "@/pages/QuestionSearchFilter";
import { QuestionSetDetails } from "@/pages/QuestionSetDetails";
import { ScoringDetails } from "@/pages/ScoringDetails";
import { UserAccessControl } from "@/pages/UserAccessControl";
import { UserProfileSettings } from "@/pages/UserProfileSettings";

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Check authentication status on app load
    checkAuth();
  }, []);

  return (
    <>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/participant/login" element={<ParticipantLogin />} />
          <Route path="/exam/code" element={<TestCodeLogin />} />
          <Route path="/participant/exam" element={<ParticipantExam />} />
          <Route path="/committee/login" element={<CommitteeLogin />} />

          {/* Protected Routes - Back Office */}
          <Route
            path="/back-office"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route
              index
              element={<Navigate to="/back-office/dashboard" replace />}
            />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="assignments" element={<AdminAssignmentOverview />} />
            <Route path="delivery" element={<DeliveryManagement />} />
            <Route
              path="delivery/:id"
              element={<Navigate to="basic" replace />}
            />
            <Route path="delivery/:id/:tab" element={<DeliveryDetails />} />
            <Route path="test" element={<ExamManagement />} />
            <Route path="test/:id" element={<ExamDetails />} />
            <Route path="group" element={<GroupManagement />} />
            <Route path="category" element={<QuestionCategories />} />
            <Route path="question-set" element={<QuestionSets />} />
            <Route path="question-pack" element={<QuestionSearchFilter />} />
            <Route path="question/:id" element={<QuestionDetail />} />
            <Route path="question-set/:id" element={<QuestionSetDetails />} />
            <Route path="group/:id/participants" element={<GroupDetails />} />
            <Route path="scoring/:id" element={<ScoringDetails />} />
            <Route
              path="scoring/:deliveryId/attempt/:attemptId"
              element={<QuestionScoring />}
            />
            <Route path="result/:id" element={<DetailedResultsView />} />
            <Route path="participants" element={<ParticipantManagement />} />
            <Route path="scoring" element={<ScoringManagement />} />
            <Route path="result" element={<ResultsManagement />} />
            <Route path="profile" element={<UserProfileSettings />} />
            <Route path="user" element={<UserAccessControl />} />
            <Route
              path="committee-scorers"
              element={<CommitteeScorerManagement />}
            />
          </Route>

          {/* Committee/Scorer Protected Routes */}
          <Route
            path="/committee"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="deliveries" element={<CommitteeDashboard />} />
            <Route
              path="delivery/:deliveryId/live-progress"
              element={<LiveProgress />}
            />
          </Route>

          <Route
            path="/scorer"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="delivery/:deliveryId/scoring"
              element={<ScorerDashboard />}
            />
          </Route>

          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster />
    </>
  );
}

// Placeholder components for pages not yet implemented

export default App;
