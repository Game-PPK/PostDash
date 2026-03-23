import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Topbar from './components/Topbar';
import Overview from './pages/Overview';
import CustomerInfo from './pages/CustomerInfo';
import BranchReport from './pages/BranchReport';
import Login from './pages/Login';
import { ArrowUp } from 'lucide-react';
import { fetchDashboardData } from './services/dataService';
import './App.css';

const Dashboard = () => {
  const [currentTab, setCurrentTab] = useState('overview');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const result = await fetchDashboardData();
        setData(result);
        setLoading(false);
      } catch (error) {
        console.error("Failed to load data", error);
        setLoading(false);
      }
    };
    loadData();

    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#fdfaf6] text-gray-900 font-sans relative">
      <Topbar currentTab={currentTab} setCurrentTab={setCurrentTab} data={data} />
      <main className="p-8 max-w-[1600px] mx-auto">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="animate-fade-in text-left">
            {currentTab === 'overview' && <Overview data={data} />}
            {currentTab === 'customers' && <CustomerInfo data={data} />}
            {currentTab === 'reporting' && <BranchReport data={data} />}
          </div>
        )}
      </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <button 
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-4 bg-white/80 backdrop-blur-md border border-indigo-100 text-indigo-600 rounded-full shadow-xl hover:bg-indigo-600 hover:text-white transition-all z-50 group active:scale-95"
          title="Scroll to Top"
        >
          <ArrowUp size={24} className="group-hover:-translate-y-1 transition-transform" />
        </button>
      )}
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;

