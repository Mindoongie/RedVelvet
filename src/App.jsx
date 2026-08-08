import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginScreen from './components/LoginScreen';
import AdminDashboard from './components/AdminDashboard';
import DriverTabletView from './components/DriverTabletView';
import TeacherMonitorView from './components/TeacherMonitorView';
import ParentAppView from './components/ParentAppView';
import AIDevPanel from './components/AIDevPanel';
import SosModal from './components/SosModal';
import GlobalEmergencyBanner from './components/GlobalEmergencyBanner';
import { getSharedSimulations, saveSharedSimulations } from './utils/alertEngine';
import { Sparkles } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null); // null when logged out
  const [devDrawerOpen, setDevDrawerOpen] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);

  // Interactive AI simulation states synced across tabs & components
  const [simulations, setSimulations] = useState(() => getSharedSimulations());

  useEffect(() => {
    const handleSimChange = () => {
      setSimulations(getSharedSimulations());
    };
    window.addEventListener('edusafe_sim_change', handleSimChange);
    window.addEventListener('storage', handleSimChange);
    return () => {
      window.removeEventListener('edusafe_sim_change', handleSimChange);
      window.removeEventListener('storage', handleSimChange);
    };
  }, []);

  const toggleSimulation = (key) => {
    setSimulations(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      saveSharedSimulations(updated);
      return updated;
    });
  };

  const handleLogin = (userInfo) => {
    setCurrentUser(userInfo);
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // If not logged in, display the Login Screen
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
      
      {/* Navbar with Logged-in Profile & Simulation Controls */}
      <Navbar 
        currentUser={currentUser}
        onLogout={handleLogout}
        devDrawerOpen={devDrawerOpen}
        setDevDrawerOpen={setDevDrawerOpen}
        simulations={simulations}
        toggleSimulation={toggleSimulation}
        openSosModal={() => setSosModalOpen(true)}
      />

      {/* Global Real-time Multi-role Emergency Alert Banner */}
      <GlobalEmergencyBanner currentUser={currentUser} />

      {/* Main View Area Rendered based on Logged-in User's Role */}
      <main className="app-container">
        {currentUser.role === 'admin' && <AdminDashboard simulations={simulations} />}
        {currentUser.role === 'driver' && <DriverTabletView simulations={simulations} toggleSimulation={toggleSimulation} />}
        {currentUser.role === 'teacher' && <TeacherMonitorView simulations={simulations} openSosModal={() => setSosModalOpen(true)} />}
        {currentUser.role === 'parent' && <ParentAppView simulations={simulations} />}
      </main>

      {/* Slide-over AI Specs Drawer for Team Members */}
      <AIDevPanel 
        isOpen={devDrawerOpen}
        onClose={() => setDevDrawerOpen(false)}
      />

      {/* Emergency SOS Modal */}
      <SosModal 
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
      />

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '24px', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-card)', marginTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <span className="badge-ai"><Sparkles size={12} /> EduSafe Bus Startup</span>
          <span className="badge-safe">Đã đăng nhập: {currentUser.name}</span>
        </div>
        <p>
          Dự án Khởi Nghiệp: Nền tảng AI bảo đảm an toàn xe đưa đón học sinh &copy; 2026
        </p>
      </footer>

    </div>
  );
}
