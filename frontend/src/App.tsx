import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { Navbar } from './components/Navbar/Navbar';
import { Footer } from './components/Footer/Footer';
import { Landing } from './pages/Landing/Landing';
import { Login } from './pages/Login/Login';
import { Dashboard } from './pages/Dashboard/Dashboard';
import { CreatorDashboard } from './pages/Creator/CreatorDashboard';
import { CourseSyllabus } from './pages/Creator/CourseSyllabus';
import { ModuleEditor } from './pages/Creator/ModuleEditor';
import './styles/index.css';

const AppContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login';

  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {!isAuthPage && <Navbar />}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/creator/dashboard" element={<CreatorDashboard />} />
          <Route path="/creator/course/:courseId" element={<CourseSyllabus />} />
          <Route path="/creator/course/:courseId/module/:moduleId" element={<ModuleEditor />} />
        </Routes>
      </main>
      {!isAuthPage && <Footer />}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;
