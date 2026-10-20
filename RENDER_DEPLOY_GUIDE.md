# 🚀 AEGIS ML IDS – Render Deployment Guide

This project is fully configured and ready for 1-click deployment on **[Render](https://render.com/)**.

---

## 🛠️ Deployment Configuration Overview

The application includes:
- **`render.yaml`**: Pre-configured Blueprint for zero-friction setup.
- **`package.json`**:
  - **Build Command**: `npm install && npm run build` (builds React Vite bundle + Node.js production server)
  - **Start Command**: `npm start` (runs `node server.js` on port `10000` or `$PORT`)
- **MongoDB Atlas**: Pre-wired to cluster `aegis.7tscmnk.mongodb.net` (database: `aegis_ids`).

---

## 📋 Step-by-Step Instructions

### Option A: Deploy via GitHub (Recommended)

1. **Push your repository to GitHub**:
   Create a new GitHub repository (e.g. `aegis-ml-ids`) and push this local repo:
   ```bash
   git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/aegis-ml-ids.git
   git push -u origin main
   ```

2. **Login to Render**:
   - Go to **[https://dashboard.render.com/](https://dashboard.render.com/)**
   - Sign in with your GitHub account.

3. **Deploy using Blueprint (Instant)**:
   - In Render Dashboard, click **New +** (top right) ➔ **Blueprint**.
   - Select your repository `aegis-ml-ids`.
   - Render will automatically read `render.yaml` and configure:
     - **Name**: `aegis-ml-ids`
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npm run build`
     - **Start Command**: `npm start`
     - **Environment Variables**:
       - `NODE_ENV`: `production`
       - `MONGODB_URI`: `mongodb+srv://karthickkumaran06_db_user:saF6HSs8QZVExuH6@aegis.7tscmnk.mongodb.net/aegis_ids?retryWrites=true&w=majority`
       - `DB_NAME`: `aegis_ids`
       - `PORT`: `10000`
   - Click **Apply**.

---

### Option B: Deploy Manually as a Web Service

If you prefer to configure manually without Blueprint:

1. Click **New +** ➔ **Web Service**.
2. Connect your GitHub repository.
3. Fill in the following settings:
   - **Name**: `aegis-ml-ids`
   - **Region**: Choose nearest region (e.g., `Singapore` or `Frankfurt` or `Oregon`)
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
4. Add **Environment Variables** under the *Environment* tab:
   | Key | Value |
   | :--- | :--- |
   | `NODE_ENV` | `production` |
   | `PORT` | `10000` |
   | `DB_NAME` | `aegis_ids` |
   | `MONGODB_URI` | `mongodb+srv://karthickkumaran06_db_user:saF6HSs8QZVExuH6@aegis.7tscmnk.mongodb.net/aegis_ids?retryWrites=true&w=majority` |
   | `GEMINI_API_KEY` | *(Optional: your Gemini API key)* |
5. Click **Create Web Service**.

---

## 🌐 Post-Deployment Verification

Once Render finishes building:
1. Open your live service URL: `https://aegis-ml-ids.onrender.com`
2. **Blue Team SOC Portal**:
   - URL: `/`
   - Email: `admin@aegis.io`
   - Password: `Admin123!`
3. **Red Team Hacker Console**:
   - URL: `/redteam`
   - Email: `redteam@aegis.io`
   - Password: `RedTeam123!`
4. **Database & Health Check**:
   - Health status: `https://aegis-ml-ids.onrender.com/api/system/health`
   - MongoDB status: `https://aegis-ml-ids.onrender.com/api/database/status`
