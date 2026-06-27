import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './components/theme-provider';
import { Toaster } from './components/ui/sonner';
import LoginPage from './modules/login/LoginPage';
import Dashboard from './modules/dashboard/Dashboard';
import ClassList from './modules/classes/ClassList';
import ClassLayout from './modules/classes/ClassLayout';
import ClassDashboard from './modules/classes/ClassDashboard';
import StudentManagement from './modules/students/StudentManagement';
import MarkEntry from './modules/results/MarkEntry';
import ConductAbsent from './modules/results/ConductAbsent';
import ClassAnalysis from './modules/analysis/ClassAnalysis';
import RosterGenerator from './modules/reports/RosterGenerator';
import ReportCardGenerator from './modules/reports/ReportCardGenerator';
import ReportCardImporter from './modules/reports/ReportCardImporter';
import Settings from './modules/settings/Settings';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const session = sessionStorage.getItem('isLoggedIn');
    setIsAuthenticated(session === 'true');
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem('isLoggedIn', 'true');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    setIsAuthenticated(false);
  };

  if (isAuthenticated === null) return null;

  return (
    <ThemeProvider defaultTheme="light" storageKey="school-ui-theme">
      <Router>
        {!isAuthenticated ? (
          <LoginPage onLogin={handleLogin} />
        ) : (
          <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            <Sidebar onLogout={handleLogout} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col min-h-0">
              <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
              <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="mx-auto max-w-7xl">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/classes" element={<ClassList />} />
                    <Route path="/classes/:id" element={<ClassLayout />}>
                      <Route index element={<ClassDashboard />} />
                      <Route path="students" element={<StudentManagement />} />
                      <Route path="marks/:semester" element={<MarkEntry />} />
                      <Route path="conduct" element={<ConductAbsent />} />
                      <Route path="analysis" element={<ClassAnalysis />} />
                      <Route path="roster" element={<RosterGenerator />} />
                      <Route path="reports" element={<ReportCardGenerator />} />
                    </Route>
                    <Route path="/import-reports" element={<ReportCardImporter />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </div>
        )}
        <Toaster position="top-right" />
      </Router>
    </ThemeProvider>
  );
}
