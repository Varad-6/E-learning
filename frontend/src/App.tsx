import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/Navbar/Navbar';
import { Footer } from './components/Footer/Footer';
import { Landing } from './pages/Landing/Landing';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { CreatorDashboard } from './pages/Creator/CreatorDashboard';
import { CourseSyllabus } from './pages/Creator/CourseSyllabus';
import { ModuleEditor } from './pages/Creator/ModuleEditor';
import { UserAdminStudio } from './pages/Admin/UserAdminStudio';
import { ViewCourses } from './pages/ViewCourses/ViewCourses';
import { CoursesPage } from './pages/Courses/CoursesPage';
import { CoursePlayer } from './pages/CoursePlayer/CoursePlayer';
import { ExamCreator } from './pages/Creator/ExamCreator';
import { ExamsCenter } from './pages/Exams/ExamsCenter';
import { ExamReviewer } from './pages/Creator/ExamReviewer';
import { ReportingDashboard } from './pages/Reporting/ReportingDashboard';
import { Leaderboard } from './pages/Leaderboard/Leaderboard';
import './styles/index.css';

// Clear old credentials on fresh session loads (tab/browser restarts)
// We use a session cookie instead of sessionStorage because sessionStorage is isolated per tab.
// This prevents logging the user out in all tabs when they open a new tab.
const hasSessionCookie = typeof document !== 'undefined' && document.cookie.includes('kaizen_session_active=true');
if (typeof window !== 'undefined' && !hasSessionCookie) {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('isLoggedInEmail');
  localStorage.removeItem('isLoggedInRole');
  localStorage.removeItem('isLoggedInDept');
  localStorage.removeItem('profileName');
  localStorage.removeItem('profileEmpId');
  document.cookie = "kaizen_session_active=true; path=/";
}

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: string[];
  redirectPath?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  redirectPath = '/dashboard'
}) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const role = typeof window !== 'undefined' ? (localStorage.getItem('isLoggedInRole') || 'Employee') : 'Employee';

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const isAllowed = allowedRoles.some(r => r.toLowerCase() === role.toLowerCase());
    if (!isAllowed) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return children;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';
  const isPlayerPage = location.pathname.startsWith('/course-player');
  const isLandingPage = location.pathname === '/';

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAuthPage && !isPlayerPage && !isLandingPage && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route 
            path="/login" 
            element={
              (localStorage.getItem('access_token') && localStorage.getItem('isLoggedInEmail'))
                ? <Navigate to="/dashboard" replace />
                : <Login />
            } 
          />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route 
            path="/creator/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <CreatorDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/creator/course/:courseId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <CourseSyllabus />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/creator/course/:courseId/module/:moduleId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <ModuleEditor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/users" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin']}>
                <UserAdminStudio />
              </ProtectedRoute>
            } 
          />
          <Route path="/courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
          <Route path="/courses/:courseId" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
          <Route path="/catalog" element={<Navigate to="/courses?tab=available" replace />} />
          <Route path="/my-courses" element={<Navigate to="/courses?tab=in_progress" replace />} />
          <Route path="/view-courses" element={<ProtectedRoute><CoursesPage /></ProtectedRoute>} />
          <Route path="/course-player/:enrollmentId" element={<ProtectedRoute><CoursePlayer /></ProtectedRoute>} />
          <Route 
            path="/creator/exams/create" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <ExamCreator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/creator/exams/review" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <ExamReviewer />
              </ProtectedRoute>
            } 
          />
          <Route path="/exams" element={<ProtectedRoute><ExamsCenter /></ProtectedRoute>} />
          <Route 
            path="/reporting" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <ReportingDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reporting/employees/:userId" 
            element={
              <ProtectedRoute allowedRoles={['Admin', 'HR Admin', 'HR Manager', 'Manager']}>
                <ReportingDashboard />
              </ProtectedRoute>
            } 
          />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
        </Routes>
      </main>
      {!isAuthPage && !isPlayerPage && !isLandingPage && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <Router>
          <AppContent />
        </Router>
      </ToastProvider>
    </ThemeProvider>
  );
};

export default App;
