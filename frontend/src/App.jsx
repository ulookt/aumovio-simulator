import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  MapPin,
  Cpu,
  BarChart3,
  Shield,
  Lightbulb,
  Menu,
  X
} from 'lucide-react';
import ScenarioBuilder from './pages/ScenarioBuilder';
import SceneSimulation from './pages/SceneSimulation';
import JobDashboard from './pages/JobDashboard';
import MetricsAnalytics from './pages/MetricsAnalytics';
import SafetyRisk from './pages/SafetyRisk';
import InsightPanel from './pages/InsightPanel';

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();

  const navigation = [
    { name: 'Scenario Builder', path: '/', icon: MapPin },
    { name: 'Scene Simulation', path: '/simulation', icon: LayoutDashboard },
    { name: 'Jobs Dashboard', path: '/jobs', icon: Cpu },
    { name: 'Metrics & Analytics', path: '/metrics', icon: BarChart3 },
    { name: 'Safety Risk', path: '/risk', icon: Shield },
    { name: 'AI Insights', path: '/insights', icon: Lightbulb },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 bg-card border-r border-border flex flex-col`}>
        {sidebarOpen && (
          <div className="p-6">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Aumovio
            </h1>
            <p className="text-sm text-gray-400 mt-1">AI Compute Platform</p>
          </div>
        )}

        {sidebarOpen && (
          <nav className="flex-1 px-4 space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:bg-card-hover'
                    }`}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center px-6 gap-4 bg-card/30 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-card-hover rounded-lg transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1"></div>
          <div className="flex items-center gap-2 px-3 py-1 bg-success/20 text-success rounded-full text-sm">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            System Online
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

function App() {
  const location = useLocation();

  return (
    <Layout>
      <Routes location={location}>
        <Route path="/" element={<ScenarioBuilder key="scenario" />} />
        <Route path="/simulation" element={<SceneSimulation key={location.pathname} />} />
        <Route path="/jobs" element={<JobDashboard key={location.pathname} />} />
        <Route path="/metrics" element={<MetricsAnalytics key={location.pathname} />} />
        <Route path="/risk" element={<SafetyRisk key={location.pathname} />} />
        <Route path="/insights" element={<InsightPanel key={location.pathname} />} />
      </Routes>
    </Layout>
  );
}

export default App;
