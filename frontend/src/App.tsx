import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
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
import { CoursePlayer } from './pages/CoursePlayer/CoursePlayer';
import { ExamCreator } from './pages/Creator/ExamCreator';
import { ExamsCenter } from './pages/Exams/ExamsCenter';
import { ExamReviewer } from './pages/Creator/ExamReviewer';
import { ReportingDashboard } from './pages/Reporting/ReportingDashboard';
import { Leaderboard } from './pages/Leaderboard/Leaderboard';
import './styles/index.css';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';
  const isPlayerPage = location.pathname.startsWith('/course-player');

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAuthPage && !isPlayerPage && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/creator/dashboard" element={<CreatorDashboard />} />
          <Route path="/creator/course/:courseId" element={<CourseSyllabus />} />
          <Route path="/creator/course/:courseId/module/:moduleId" element={<ModuleEditor />} />
          <Route path="/admin/users" element={<UserAdminStudio />} />
          <Route path="/view-courses" element={<ViewCourses />} />
          <Route path="/course-player/:enrollmentId" element={<CoursePlayer />} />
          <Route path="/creator/exams/create" element={<ExamCreator />} />
          <Route path="/creator/exams/review" element={<ExamReviewer />} />
          <Route path="/exams" element={<ExamsCenter />} />
          <Route path="/reporting" element={<ReportingDashboard />} />
          <Route path="/reporting/employees/:userId" element={<ReportingDashboard />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
        </Routes>
      </main>
      {!isAuthPage && !isPlayerPage && <Footer />}
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
