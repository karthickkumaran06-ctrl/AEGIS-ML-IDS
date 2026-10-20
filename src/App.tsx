import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SecurityProvider, useSecurity } from './context/SecurityContext';

// Views - Blue Team SOC
import { LoginView } from './views/LoginView';
import { DashboardView } from './views/DashboardView';
import { LiveMonitoringView } from './views/LiveMonitoringView';
import { NetworkMapView } from './views/NetworkMapView';
import { AlertsView } from './views/AlertsView';

import { DetectionRulesView } from './views/DetectionRulesView';
import { MetaLearningOpsView } from './views/MetaLearningOpsView';
import { AiSecurityAnalystView } from './views/AiSecurityAnalystView';
import { SimulationLabView } from './views/SimulationLabView';
import { AnalyticsView } from './views/AnalyticsView';
import { ReportsView } from './views/ReportsView';
import { SystemHealthView } from './views/SystemHealthView';
import { SettingsView } from './views/SettingsView';
import { ThreatSensorView } from './views/ThreatSensorView';

// Views - Red Team (Completely Separate Hacker Login & Standalone Console)
import { RedTeamLoginView } from './views/RedTeamLoginView';
import { RedTeamConsoleView } from './views/RedTeamConsoleView';

// Components
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { PacketDrawer } from './components/PacketDrawer';

const BlueTeamLayout: React.FC = () => {
  const { token, selectedPacket, setSelectedPacket } = useSecurity();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Protected Gatekeeper: redirect unauthenticated analysts to blue login portal
  if (!token) {
    return <LoginView />;
  }

  return (
    <div className="flex bg-slate-950 text-slate-100 min-h-screen">
      {/* Collapsible Left Side Navigation */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Container Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Dynamic Nav-header */}
        <Topbar onMenuToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />

        {/* Dynamic Route views */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-[1440px] w-full mx-auto">
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/monitoring" element={<LiveMonitoringView />} />
            <Route path="/network" element={<NetworkMapView />} />
            <Route path="/alerts" element={<AlertsView />} />
            <Route path="/rules" element={<DetectionRulesView />} />
            <Route path="/sensors" element={<ThreatSensorView />} />
            <Route path="/meta-learning" element={<MetaLearningOpsView />} />
            <Route path="/ai-analyst" element={<AiSecurityAnalystView />} />
            <Route path="/simulation" element={<SimulationLabView />} />
            <Route path="/analytics" element={<AnalyticsView />} />
            <Route path="/reports" element={<ReportsView />} />
            <Route path="/system" element={<SystemHealthView />} />
            <Route path="/settings" element={<SettingsView />} />
            {/* Catch-all fallback redirect to overview */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* Global Interactive Packet forensically drawer overlay */}
      {selectedPacket && (
        <PacketDrawer 
          packet={selectedPacket} 
          onClose={() => setSelectedPacket(null)} 
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <SecurityProvider>
      <Router>
        <Routes>
          {/* Completely Separate Red Team (Hacker) Routes */}
          <Route path="/redteam/login" element={<RedTeamLoginView />} />
          <Route path="/redteam" element={<RedTeamConsoleView />} />
          <Route path="/hacker/login" element={<Navigate to="/redteam/login" replace />} />
          <Route path="/hacker" element={<Navigate to="/redteam" replace />} />

          {/* Blue Team / SOC Admin Portal Routes */}
          <Route path="/*" element={<BlueTeamLayout />} />
        </Routes>
      </Router>
    </SecurityProvider>
  );
}
