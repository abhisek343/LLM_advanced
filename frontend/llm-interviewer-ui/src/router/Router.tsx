import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import LoginPage from '../pages/LoginPage';
import RegistrationPage from '../pages/RegistrationPage';
import ForgotPasswordPage from '../pages/ForgotPasswordPage'; // Import ForgotPasswordPage
import ResetPasswordPage from '../pages/ResetPasswordPage'; // Import ResetPasswordPage
import MainLayout from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import CandidateDashboardPage from '../features/candidate/pages/CandidateDashboardPage';
import CandidateProfilePage from '../features/candidate/pages/CandidateProfilePage';
import CandidateMessagesPage from '../features/candidate/pages/CandidateMessagesPage';
import CandidateInterviewsPage from '../features/candidate/pages/CandidateInterviewsPage';
import CandidateInterviewResultsPage from '../features/candidate/pages/CandidateInterviewResultsPage'; // Import new page
import PracticeQuestionsPage from '../features/candidate/pages/PracticeQuestionsPage'; // Import PracticeQuestionsPage
import InterviewTakingPage from '../features/interview/pages/InterviewTakingPage'; // Import new page
import SettingsPage from '../pages/common/SettingsPage'; // Import SettingsPage

// Placeholder Dashboard/Home Pages
const HomePage: React.FC = () => <div><MainLayout><h1>Welcome!</h1><p>You are logged in.</p></MainLayout></div>;
// const CandidateDashboard: React.FC = () => <div><MainLayout><h1>Candidate Dashboard</h1></MainLayout></div>; // Replaced
// const HRDashboard: React.FC = () => <div><MainLayout><h1>HR Dashboard</h1></MainLayout></div>; // To be replaced
import HRDashboardPage from '../features/hr/pages/HRDashboardPage'; 
// const AdminDashboard: React.FC = () => <div><MainLayout><h1>Admin Dashboard</h1></MainLayout></div>; // To be replaced
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage';
// import UserManagementPage from '../features/admin/pages/UserManagementPage'; // Renamed to CandidateManagementPage
import CandidateManagementPage from '../features/admin/pages/CandidateManagementPage'; // New import
import AdminUserDetailPage from '../features/admin/pages/AdminUserDetailPage';
// import AdminSearchHRPage from '../features/admin/pages/AdminSearchHRPage'; // Replaced by AdminHRManagementPage
import AdminHRManagementPage from '../features/admin/pages/AdminHRManagementPage'; // Import new page
import CandidateAssignmentPage from '../features/admin/pages/CandidateAssignmentPage';
import AdminCreateUserPage from '../features/admin/pages/AdminCreateUserPage'; // Import new page
import AdminStatsPage from '../features/admin/pages/AdminStatsPage'; // Import AdminStatsPage
import AdminInterviewsOverviewPage from '../features/admin/pages/AdminInterviewsOverviewPage'; // Import new page
import NotFoundPage from '../pages/NotFoundPage'; // Import NotFoundPage
// const CandidateProfilePage: React.FC = () => <div><MainLayout><h1>Candidate Profile</h1></MainLayout></div>; // Replaced
// const HRProfilePage: React.FC = () => <div><MainLayout><h1>HR Profile</h1></MainLayout></div>; // To be replaced
import HRProfilePage from '../features/hr/pages/HRProfilePage';
import ManageAdminConnectionsPage from '../features/hr/pages/ManageAdminConnectionsPage';
import CandidateSearchPage from '../features/hr/pages/CandidateSearchPage';
import ScheduleInterviewPage from '../features/hr/pages/ScheduleInterviewPage';
import InterviewReviewPage from '../features/hr/pages/InterviewReviewPage';
import HRMessagesPage from '../features/hr/pages/HRMessagesPage'; // Import new page
import HRAssignedCandidatesPage from '../features/hr/pages/HRAssignedCandidatesPage'; // Import new page


// ProtectedRoute component
const ProtectedRoute: React.FC = () => {
  const { currentUser, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading application...</div>; // Or a spinner component
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Outlet will render the child route element if authenticated
  return <Outlet />; 
};

// RoleSpecificRoute component
interface RoleSpecificRouteProps {
  allowedRoles: Array<'candidate' | 'hr' | 'admin'>;
}

const RoleSpecificRoute: React.FC<RoleSpecificRouteProps> = ({ allowedRoles }) => {
  const { currentUser } = useAuth(); // isLoading is handled by ProtectedRoute

  if (!currentUser || !allowedRoles.includes(currentUser.role)) {
    // Redirect to a generic home page or an unauthorized page if role doesn't match
    // Or simply don't render, letting a catch-all route handle it
    return <Navigate to="/" replace />; 
  }

  return <Outlet />; // Render child component for this route
};


const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Unauthenticated routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Protected Routes: User must be logged in */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<MainLayout><SettingsPage /></MainLayout>} />
          <Route path="/interview/:interviewId/take" element={<InterviewTakingPage />} /> 
          
          {/* Candidate specific routes */}
          <Route element={<RoleSpecificRoute allowedRoles={['candidate']} />}>
            <Route path="/candidate/dashboard" element={<CandidateDashboardPage />} />
            <Route path="/candidate/profile" element={<CandidateProfilePage />} />
            <Route path="/candidate/messages" element={<CandidateMessagesPage />} />
            <Route path="/candidate/interviews" element={<CandidateInterviewsPage />} />
            <Route path="/candidate/interviews/:interviewId/results" element={<CandidateInterviewResultsPage />} />
            <Route path="/candidate/practice-questions" element={<PracticeQuestionsPage />} />
          </Route>

          {/* HR specific routes */}
          <Route element={<RoleSpecificRoute allowedRoles={['hr']} />}>
            <Route path="/hr/dashboard" element={<MainLayout><HRDashboardPage /></MainLayout>} />
            <Route path="/hr/profile" element={<MainLayout><HRProfilePage /></MainLayout>} />
            <Route path="/hr/admin-connections" element={<MainLayout><ManageAdminConnectionsPage /></MainLayout>} />
            <Route path="/hr/search-candidates" element={<MainLayout><CandidateSearchPage /></MainLayout>} />
            <Route path="/hr/schedule-interview" element={<MainLayout><ScheduleInterviewPage /></MainLayout>} />
            <Route path="/hr/interviews/:interviewId/review" element={<MainLayout><InterviewReviewPage /></MainLayout>} />
            <Route path="/hr/messages" element={<MainLayout><HRMessagesPage /></MainLayout>} />
            <Route path="/hr/assigned-candidates" element={<MainLayout><HRAssignedCandidatesPage /></MainLayout>} />
            {/* Add other HR routes here, wrapped with MainLayout */}
          </Route>

          {/* Admin specific routes */}
          <Route element={<RoleSpecificRoute allowedRoles={['admin']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            {/* <Route path="/admin/users" element={<UserManagementPage />} /> Path changed from /admin/user-management */}
            <Route path="/admin/candidate-management" element={<CandidateManagementPage />} /> {/* New route */}
            <Route path="/admin/users/:userId" element={<AdminUserDetailPage />} /> {/* This detail route might need adjustment if it's only for candidates now, or a new one for candidates */}
            <Route path="/admin/hr-management" element={<AdminHRManagementPage />} />
            <Route path="/admin/stats" element={<AdminStatsPage />} />
            <Route path="/admin/candidates/assign" element={<CandidateAssignmentPage />} /> {/* Path changed from /admin/assign-hr */}
            <Route path="/admin/create-user" element={<AdminCreateUserPage />} /> 
            <Route path="/admin/interviews-overview" element={<AdminInterviewsOverviewPage />} /> {/* Added route */}
            {/* Add other admin routes here */}
          </Route>
        </Route>
        
        {/* Catch-all for undefined routes */}
        <Route path="*" element={<NotFoundPage />} /> 
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
