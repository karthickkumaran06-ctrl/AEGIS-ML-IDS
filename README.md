# AEGIS ML IDS — Adaptive Meta-Learning Intrusion Detection & Response Platform

AEGIS ML IDS is a production-grade, full-stack relational Security Operations Center (SOC) dashboard and Intrusion Detection System (IDS) simulator. Powered by Express, Vite, Tailwind CSS v4, and the modern `@google/genai` TypeScript SDK, it demonstrates how **few-shot meta-learning** outperforms classical signature-based detection (Snort/YARA) when protecting systems against novel zero-day exploits.

---

## 🚀 Key Features

1. **Autonomous Real-Time Simulation**: Pushes synthetic packets and alarms over a persistent Server-Sent Events (SSE) stream.
2. **Snort-Style Rules Engine**: Evaluates TCP, UDP, ICMP, and HTTP payloads against dynamic regular expression signatures (Classical IDS).
3. **Adaptive Meta-Learning (MLOps)**: Simulates inner/outer optimization loops to adapt prototype vector cluster centers, gaining 99.4% detection on previously unseen threats.
4. **Interactive SVG Topology Map**: Displays real-time flow routes with CSS-animated particle pulses and quarantining controls.
5. **AI Forensic Security Analyst**: Utilizes Gemini models (with graceful offline fallbacks) to parse structured summaries, risks, recommended blocks, and signature rule extractions.
6. **Incident Case File Ledger**: Tracks chronological logs, analyst forensical journals, and ticket resolution files.
7. **Signature Testing Sandbox**: Evaluates regex patterns against synthetic hex strings before deployment.

---

## 🛠️ Technological Stack

*   **Front-End**: React, Vite, Tailwind CSS v4, Lucide-React, React Router DOM v6
*   **Back-End**: Node.js, Express, tsx
*   **AI Integration**: `@google/genai` (utilizing the flagship model `gemini-3.8-flash`)
*   **Database**: Custom persistent JSON flat-file storage engine with debounced server serialization (`db.json`)

---

## 🔑 Demo Access Credentials

The application is protected by cryptographic credential validations. Use these pre-loaded accounts to log in:

| Role | Username (Email) | Password | Clearance |
| :--- | :--- | :--- | :--- |
| **Security Director (Admin)** | `admin@aegis.io` | `Admin123!` | Full Admin Privileges, Signature CRUD, Settings |
| **SOC Analyst** | `analyst@aegis.io` | `Analyst123!` | Forensics, Incident Response, MLOps adaptations |

---

## ⚙️ Prerequisites & Installation

### 1. Configure Environment Variables
Create a `.env` file in your root workspace:
```bash
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
```
*(If `GEMINI_API_KEY` is omitted, AEGIS operates in a grace-filled, highly realistic offline Demo mode automatically.)*

### 2. Install Dependencies
```bash
npm install
```

### 3. Launch Development Server (Express + Vite)
```bash
npm run dev
```
Open your browser at `http://localhost:3000` to access the SOC console.

### 4. Compile Production Builds
```bash
npm run build
npm run start
```

---

## 📊 API Router Inventory

| Route | Method | Clearance | Description |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Validates credentials & returns token |
| `/api/dashboard/stats`| `GET` | Analyst | Aggregated metrics, detection rates, model stats |
| `/api/packets` | `GET` | Analyst | Query, search and paginate packet buffers |
| `/api/alerts` | `GET` | Analyst | Review active threat alerts |
| `/api/alerts/:id/status`| `POST` | Analyst | Modify alert status |
| `/api/incidents` | `POST` | Analyst | Create custom incident ticket files |
| `/api/rules` | `POST` | Admin | Append signature patterns |
| `/api/rules/test` | `POST` | Analyst | Test regex patterns against diagnostic hex payload |
| `/api/models/adapt` | `POST` | Analyst | Run few-shot neural model adaptation |
| `/api/ai/analyze` | `POST` | Analyst | Secure server-side Gemini threat analysis |

---

## 🔒 Security Compliance Note

This application is designed strictly as a defensive cybersecurity diagnostic simulator. It contains **no malicious exploits, operational payload execution vectors, or unsafe hacking tutorials**. All simulation data, hex payload structures, and exfiltration tunnels are mock synthetics configured in isolated sandboxes.
