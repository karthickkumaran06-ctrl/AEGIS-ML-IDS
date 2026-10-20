export interface User {
  email: string;
  role: 'Admin' | 'Security Analyst' | 'Viewer';
  name: string;
}

export interface Packet {
  id: string;
  timestamp: string;
  sourceIp: string;
  destIp: string;
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'DNS' | 'HTTP';
  sourcePort: number;
  destPort: number;
  size: number;
  payload: string;
  classification: 'Benign' | 'SQL Injection' | 'SYN Flood' | 'Port Scan' | 'Zero-Day Alpha' | 'Zero-Day Beta';
  classicalIds: {
    detected: boolean;
    ruleId?: string;
    confidence: number;
  };
  metaIds: {
    detected: boolean;
    confidence: number;
    adapted: boolean;
    label: string;
  };
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  action: 'Alert' | 'Block' | 'Log' | 'Monitor';
}

export interface Alert {
  id: string;
  packetId: string;
  timestamp: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  sourceIp: string;
  destIp: string;
  attackType: string;
  engine: 'Classical IDS' | 'Meta-Learning IDS' | 'Dual Engine';
  confidence: number;
  status: 'New' | 'Investigating' | 'Confirmed' | 'False Positive' | 'Resolved' | 'Suppressed';
  assignedTo?: string;
  notes?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Investigating' | 'Contained' | 'Resolved' | 'Closed';
  assignedTo: string;
  affectedAssets: string[];
  sourceIps: string[];
  relatedAlertIds: string[];
  createdDate: string;
  updatedDate: string;
  timeline: {
    timestamp: string;
    message: string;
    author: string;
  }[];
  resolution?: string;
}

export interface Threat {
  id: string;
  name: string;
  category: string;
  description: string;
  attackTechnique: string;
  affectedServices: string[];
  indicators: string[];
  detectionStatus: 'Unprotected' | 'Classical Rule Active' | 'Meta-Learning Protected' | 'Dual Protection';
  confidence: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  firstSeen: string;
  lastSeen: string;
  cves: string[];
}

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  protocol: 'TCP' | 'UDP' | 'ICMP' | 'ANY';
  pattern: string;
  action: 'Alert' | 'Block' | 'Log' | 'Monitor';
  status: 'Active' | 'Disabled';
  createdBy: string;
  createdDate: string;
  matchedCount: number;
}

export interface ModelVersion {
  version: string;
  date: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  adaptations: string[];
  status: 'Active' | 'Standby';
}

export interface AIAnalysis {
  id: string;
  refId: string;
  refType: 'packet' | 'alert' | 'incident';
  timestamp: string;
  summary: string;
  classification: string;
  evidence: string;
  behavior: string;
  explanation: string;
  risk: string;
  actions: string[];
  ruleRecommendation: string;
  metaLearningRecommendation?: string;
}

export interface AuditLog {
  id: string;
  user: string;
  action: string;
  resource: string;
  timestamp: string;
  ip: string;
  result: 'Success' | 'Failed';
}

export interface SystemHealth {
  frontend: string;
  backend: string;
  api: string;
  database: string;
  aiService: string;
  simulationEngine: string;
  latency: number;
  requestCount: number;
  uptime: number;
  hostInfo?: {
    hostname: string;
    platform: string;
    osRelease: string;
    arch: string;
    cpuModel: string;
    cpuCores: number;
    totalMemGB: number;
    freeMemGB: number;
    usedMemGB: number;
    usedMemPct: number;
    uptimeSeconds: number;
    uptimeFormatted: string;
    networkInterfaces: any[];
    processMemoryMB: number;
  };
}

export interface SystemSettings {
  appName: string;
  timezone: string;
  refreshInterval: number;
  packetRate: number;
  retention: number;
  confidenceThreshold: number;
  alertThreshold: number;
  autoBlocking: boolean;
  learningRate: number;
  supportShots: number;
  adaptationSteps: number;
  optimizer: string;
  enableAI: boolean;
  notifications: {
    criticalAlerts: boolean;
    zeroDayAlerts: boolean;
    modelAdaptationAlerts: boolean;
  };
}
