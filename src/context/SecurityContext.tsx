import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Packet, Alert, User, SystemSettings, SystemHealth } from '../types';

interface SecurityContextType {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  packets: Packet[];
  alerts: Alert[];
  stats: {
    totalPackets: number;
    totalAlerts: number;
    blockedCount: number;
    activeScenario: string;
    isSimulating: boolean;
    packetRate: number;
  };
  notifications: string[];
  addNotification: (msg: string) => void;
  clearNotifications: () => void;
  selectedPacket: Packet | null;
  setSelectedPacket: (p: Packet | null) => void;
  changeScenario: (scenario: string) => Promise<void>;
  toggleSimulation: (action: 'start' | 'pause') => Promise<void>;
  updatePacketRate: (rate: number) => Promise<void>;
  refreshStats: () => Promise<void>;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

export const SecurityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('aegis_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('aegis_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [packets, setPackets] = useState<Packet[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState({
    totalPackets: 0,
    totalAlerts: 0,
    blockedCount: 0,
    activeScenario: 'Normal',
    isSimulating: true,
    packetRate: 1.5,
  });

  const [notifications, setNotifications] = useState<string[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const addNotification = (msg: string) => {
    setNotifications(prev => [msg, ...prev].slice(0, 50));
  };

  const clearNotifications = () => setNotifications([]);

  // Fetch initial REST packet list & alert list
  const fetchInitialData = async () => {
    try {
      const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};

      const pRes = await fetch('/api/packets?limit=100', { headers });
      const pData = await pRes.json();
      if (pData.success) setPackets(pData.data);

      const aRes = await fetch('/api/alerts', { headers });
      const aData = await aRes.json();
      if (aData.success) setAlerts(aData.data);

      const sRes = await fetch('/api/dashboard/stats', { headers });
      const sData = await sRes.json();
      if (sData.success) {
        setStats({
          totalPackets: sData.data.traffic.totalPackets,
          totalAlerts: sData.data.traffic.totalAlerts,
          blockedCount: sData.data.traffic.blockedCount,
          activeScenario: stats.activeScenario,
          isSimulating: stats.isSimulating,
          packetRate: sData.data.traffic.packetsPerSec,
        });
      }
    } catch (err) {
      console.error('Failed to load initial metrics from secure backend:', err);
    }
  };

  // Setup Real-time Server-Sent Events (SSE) Channel
  useEffect(() => {
    fetchInitialData();

    // Establish EventSource connection
    const connectSse = () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource('/api/live-stream');
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'packet') {
            setPackets(prev => [data.packet, ...prev].slice(0, 150));
            if (data.stats) {
              setStats(prev => ({
                ...prev,
                totalPackets: data.stats.totalPackets,
                totalAlerts: data.stats.totalAlerts,
                blockedCount: data.stats.blockedIpsCount,
                activeScenario: data.stats.activeScenario,
              }));
            }
          } else if (data.type === 'alert') {
            setAlerts(prev => [data.alert, ...prev].slice(0, 200));
            // Critical alerts or Zero-days notification sound / alert
            if (data.alert.severity === 'Critical') {
              addNotification(`CRITICAL DETECTED: [${data.alert.attackType}] from source IP ${data.alert.sourceIp}`);
            } else if (data.alert.attackType.includes('Zero-Day')) {
              addNotification(`ZERO-DAY EXPLOT BYPASS ALERT: Outlier cluster flagged ${data.alert.sourceIp}`);
            } else {
              addNotification(`Security Alert Triggered: [${data.alert.attackType}] severity:${data.alert.severity}`);
            }
          }
        } catch (err) {
          console.error('Error parsing live stream payload:', err);
        }
      };

      es.onerror = () => {
        console.warn('SSE connection disrupted. Retrying in 4s...');
        es.close();
        setTimeout(connectSse, 4000);
      };
    };

    connectSse();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [token]);

  // Authenticate method
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.success) {
        const userToken = data.data.token;
        const userData = data.data.user;

        setToken(userToken);
        setUser(userData);
        localStorage.setItem('aegis_token', userToken);
        localStorage.setItem('aegis_user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Login action failed:', err);
      return false;
    }
  };

  // De-auth method
  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('aegis_token');
    localStorage.removeItem('aegis_user');
  };

  // Change Scenario
  const changeScenario = async (scenario: string) => {
    try {
      const res = await fetch('/api/simulation/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({
          ...prev,
          activeScenario: data.data.activeScenario
        }));
        addNotification(`Environment Scenario Updated: Active mode is now "${scenario}"`);
      }
    } catch (err) {
      console.error('Failed to change scenario:', err);
    }
  };

  // Toggle Simulating
  const toggleSimulation = async (action: 'start' | 'pause') => {
    try {
      const res = await fetch('/api/simulation/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({
          ...prev,
          isSimulating: data.data.isSimulating
        }));
        addNotification(`Simulation core ${action === 'start' ? 'Active' : 'Paused'}`);
      }
    } catch (err) {
      console.error('Failed to update simulation state:', err);
    }
  };

  // Update packet rates
  const updatePacketRate = async (rate: number) => {
    try {
      const res = await fetch('/api/simulation/control', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ packetRate: rate }),
      });
      const data = await res.json();
      if (data.success) {
        setStats(prev => ({
          ...prev,
          packetRate: data.data.packetRate
        }));
      }
    } catch (err) {
      console.error('Failed to update simulation packet rate:', err);
    }
  };

  const refreshStats = async () => {
    await fetchInitialData();
  };

  return (
    <SecurityContext.Provider value={{
      token,
      user,
      login,
      logout,
      packets,
      alerts,
      stats,
      notifications,
      addNotification,
      clearNotifications,
      selectedPacket,
      setSelectedPacket,
      changeScenario,
      toggleSimulation,
      updatePacketRate,
      refreshStats
    }}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = () => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used inside a SecurityProvider');
  }
  return context;
};
