import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_URI = 'mongodb+srv://karthickkumaran06_db_user:saF6HSs8QZVExuH6@aegis.7tscmnk.mongodb.net/aegis_ids?retryWrites=true&w=majority';
const MONGODB_URI = process.env.MONGODB_URI || DEFAULT_URI;
const DB_NAME = process.env.DB_NAME || 'aegis_ids';

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let lastPingMs = 0;

export async function connectMongo(): Promise<Db | null> {
  if (db && isConnected) return db;

  try {
    const start = Date.now();
    client = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 12000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 30000,
      // Required for Node.js v22 + MongoDB Atlas TLS compatibility
      tlsInsecure: true,
    });

    await client.connect();
    lastPingMs = Date.now() - start;
    db = client.db(DB_NAME);
    isConnected = true;
    console.log(`[MongoDB Atlas] Connected successfully to ${DB_NAME} (${lastPingMs}ms ping)`);

    // Setup indexes for high-throughput queries
    await Promise.allSettled([
      db.collection('packets').createIndex({ timestamp: -1 }),
      db.collection('alerts').createIndex({ timestamp: -1 }),
      db.collection('users').createIndex({ email: 1 }, { unique: true }),
      db.collection('auditLogs').createIndex({ timestamp: -1 }),
    ]);

    return db;
  } catch (err: any) {
    isConnected = false;
    console.error(`[MongoDB Atlas] Connection error:`, err.message);
    return null;
  }
}

export function isMongoConnected(): boolean {
  return isConnected;
}

export function getMongoDb(): Db | null {
  return db;
}

export async function getMongoStats() {
  if (!db || !isConnected) {
    return {
      connected: false,
      cluster: 'aegis.7tscmnk.mongodb.net',
      database: DB_NAME,
      pingMs: 0,
      collections: {}
    };
  }

  try {
    const collections = ['users', 'packets', 'alerts', 'incidents', 'threats', 'rules', 'models', 'auditLogs', 'settings'];
    const counts: Record<string, number> = {};

    for (const c of collections) {
      counts[c] = await db.collection(c).countDocuments().catch(() => 0);
    }

    return {
      connected: true,
      cluster: 'aegis.7tscmnk.mongodb.net',
      database: DB_NAME,
      pingMs: lastPingMs,
      collections: counts
    };
  } catch {
    return {
      connected: isConnected,
      cluster: 'aegis.7tscmnk.mongodb.net',
      database: DB_NAME,
      pingMs: lastPingMs,
      collections: {}
    };
  }
}

// Initial Sync & Seeding: populate collections if empty
export async function syncMongoInitialData(seeds: {
  users: any[];
  packets: any[];
  alerts: any[];
  incidents: any[];
  threats: any[];
  rules: any[];
  models: any[];
  settings: any;
}) {
  if (!db || !isConnected) return null;

  try {
    // 1. Users
    const userCount = await db.collection('users').countDocuments();
    if (userCount === 0 && seeds.users.length > 0) {
      await db.collection('users').insertMany(seeds.users.map(u => ({ ...u, _id: u.id })));
    }

    // 2. Rules
    const ruleCount = await db.collection('rules').countDocuments();
    if (ruleCount === 0 && seeds.rules.length > 0) {
      await db.collection('rules').insertMany(seeds.rules.map(r => ({ ...r, _id: r.id })));
    }

    // 3. Threats
    const threatCount = await db.collection('threats').countDocuments();
    if (threatCount === 0 && seeds.threats.length > 0) {
      await db.collection('threats').insertMany(seeds.threats.map(t => ({ ...t, _id: t.id })));
    }

    // 4. Models
    const modelCount = await db.collection('models').countDocuments();
    if (modelCount === 0 && seeds.models.length > 0) {
      await db.collection('models').insertMany(seeds.models.map(m => ({ ...m, _id: m.id })));
    }

    // 5. Incidents
    const incCount = await db.collection('incidents').countDocuments();
    if (incCount === 0 && seeds.incidents.length > 0) {
      await db.collection('incidents').insertMany(seeds.incidents.map(i => ({ ...i, _id: i.id })));
    }

    // 6. Settings
    const settingsDoc = await db.collection('settings').findOne({ _id: 'global_settings' as any });
    if (!settingsDoc && seeds.settings) {
      await db.collection('settings').insertOne({ _id: 'global_settings' as any, ...seeds.settings });
    }

    // 7. Load all current data from MongoDB into in-memory structure
    const [users, packets, alerts, incidents, threats, rules, models, settingsList, auditLogs] = await Promise.all([
      db.collection('users').find().toArray(),
      db.collection('packets').find().sort({ timestamp: -1 }).limit(500).toArray(),
      db.collection('alerts').find().sort({ timestamp: -1 }).limit(200).toArray(),
      db.collection('incidents').find().toArray(),
      db.collection('threats').find().toArray(),
      db.collection('rules').find().toArray(),
      db.collection('models').find().toArray(),
      db.collection('settings').find().toArray(),
      db.collection('auditLogs').find().sort({ timestamp: -1 }).limit(300).toArray(),
    ]);

    const activeSettings = settingsList.length > 0
      ? { ...seeds.settings, ...settingsList[0] }
      : seeds.settings;

    delete activeSettings._id;

    console.log(`[MongoDB Atlas] Synced state: ${users.length} users, ${packets.length} packets, ${alerts.length} alerts, ${rules.length} rules.`);

    return {
      users: users.map(u => ({ id: u._id || u.id, email: u.email, passwordHash: u.passwordHash, role: u.role, name: u.name })),
      packets: packets.map(p => { const { _id, ...rest } = p; return { id: _id || p.id, ...rest }; }),
      alerts: alerts.map(a => { const { _id, ...rest } = a; return { id: _id || a.id, ...rest }; }),
      incidents: incidents.map(i => { const { _id, ...rest } = i; return { id: _id || i.id, ...rest }; }),
      threats: threats.map(t => { const { _id, ...rest } = t; return { id: _id || t.id, ...rest }; }),
      rules: rules.map(r => { const { _id, ...rest } = r; return { id: _id || r.id, ...rest }; }),
      models: models.map(m => { const { _id, ...rest } = m; return { id: _id || m.id, ...rest }; }),
      auditLogs: auditLogs.map(l => { const { _id, ...rest } = l; return { id: _id || l.id, ...rest }; }),
      settings: activeSettings
    };
  } catch (err: any) {
    console.error('[MongoDB Atlas] Error syncing initial data:', err.message);
    return null;
  }
}

// Asynchronous Document Persisters (Non-blocking background saves to MongoDB)
export function persistPacketToMongo(packet: any) {
  if (!db || !isConnected) return;
  const doc = { ...packet, _id: packet.id };
  db.collection('packets').insertOne(doc).catch(err => console.warn('Mongo packet insert notice:', err.message));
}

export function persistAlertToMongo(alert: any) {
  if (!db || !isConnected) return;
  const doc = { ...alert, _id: alert.id };
  db.collection('alerts').updateOne(
    { _id: alert.id as any },
    { $set: doc },
    { upsert: true }
  ).catch(err => console.warn('Mongo alert upsert notice:', err.message));
}

export function persistAuditToMongo(audit: any) {
  if (!db || !isConnected) return;
  const doc = { ...audit, _id: audit.id };
  db.collection('auditLogs').insertOne(doc).catch(err => console.warn('Mongo audit insert notice:', err.message));
}

export function persistIncidentToMongo(incident: any) {
  if (!db || !isConnected) return;
  const doc = { ...incident, _id: incident.id };
  db.collection('incidents').updateOne(
    { _id: incident.id as any },
    { $set: doc },
    { upsert: true }
  ).catch(err => console.warn('Mongo incident upsert notice:', err.message));
}

export function persistRuleToMongo(rule: any) {
  if (!db || !isConnected) return;
  const doc = { ...rule, _id: rule.id };
  db.collection('rules').updateOne(
    { _id: rule.id as any },
    { $set: doc },
    { upsert: true }
  ).catch(err => console.warn('Mongo rule upsert notice:', err.message));
}

export function deleteRuleFromMongo(ruleId: string) {
  if (!db || !isConnected) return;
  db.collection('rules').deleteOne({ _id: ruleId as any }).catch(err => console.warn('Mongo rule delete notice:', err.message));
}

export function persistSettingsToMongo(settings: any) {
  if (!db || !isConnected) return;
  db.collection('settings').updateOne(
    { _id: 'global_settings' as any },
    { $set: settings },
    { upsert: true }
  ).catch(err => console.warn('Mongo settings update notice:', err.message));
}

export function persistUserToMongo(user: any) {
  if (!db || !isConnected) return;
  const doc = { ...user, _id: user.id };
  db.collection('users').updateOne(
    { _id: user.id as any },
    { $set: doc },
    { upsert: true }
  ).catch(err => console.warn('Mongo user upsert notice:', err.message));
}

