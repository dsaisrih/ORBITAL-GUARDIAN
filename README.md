# ⬡ ORBITAL GUARDIAN – Live Earth Simulation

A sophisticated satellite tracking and collision prediction system with real-time visualization, user authentication, and Cloud Firestore backend integration.

## ✨ New Features

### 1. **User Authentication & Login System**
- Secure login/registration with JWT tokens
- User credentials stored in Firestore with bcrypt hashing
- Session persistence in localStorage
- Demo credentials: `admin` / `admin123`
- Support for multiple user roles (admin, analyst)

### 2. **Earth-Like Transparent Globe**
- Rendered Earth with transparent effects
- Blue-green realistic colors
- Adjustable transparency slider (40-100%)
- Visible land masses and continents
- Atmospheric glow effects
- Cloud layer with rotation

### 3. **Fixed Firestore Backend Connection**
- Firestore initialization with service account support
- Health check endpoint and demo-mode fallback
- Real-time connection status indicator
- Graceful fallback to demo mode when offline

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** (v14+)
- **A Firebase project with Firestore** (service account JSON)
- **npm** (v6+)

### Step 1: Setup Firestore

1. Create a Firebase project in the Firebase Console and enable Cloud Firestore.
2. Create a service account JSON (Project Settings → Service Accounts) and either set it as the `FIREBASE_SERVICE_ACCOUNT` env var or paste it into the app DB config panel.

### Step 2: Start the Backend Server

```bash
# Install dependencies
npm install

# Start in development mode (with auto-reload)
npm run dev

# Or start in production mode
npm start
```

The server will start on `http://localhost:5000`

Backend features:
- ✓ Automatic database connection with retry logic
- ✓ Health check endpoint: `GET /health`
- ✓ Auto-reconnection on failure
- ✓ Connection pooling (10 connections)

### Step 3: Open the Application

1. Open `orbital-guardian-sim.html` in your web browser
2. You'll see the login screen
3. Use credentials: **admin** / **admin123**

---

## 🎮 Features Overview

### Login & Authentication
- **Login Tab**: Enter username and password
- **Register Tab**: Create new user account
- **Logout**: Click user badge in top-right → Logout
- **Demo Mode**: Auto-activates if backend is offline

### Earth Simulation Controls
- **Speed Control**: Adjust simulation speed (0.1x - 50x)
- **Toggle Orbits**: Show/hide satellite orbital paths
- **Toggle Debris**: Show/hide space debris objects
- **Earth Transparency**: Adjust globe transparency from 40% to 100%

### Dashboard Tabs

#### SIM Tab
- Real-time satellite visualization
- Simulation speed control
- Earth transparency settings
- Selected satellite details
- Quick statistics

#### SATS Tab
- Add new satellites to tracking
- Browse satellite catalog
- View satellite properties
- Remove satellites

#### DEBRIS Tab
- Log new debris objects
- View debris catalog
- Risk level indicators (High/Medium/Low)
- Size and velocity data

#### PREDICT Tab
- Compute collision probabilities
- Set time of closest approach
- View prediction history
- Auto-generate critical alerts

#### ALERTS Tab
- Active alert management
- Alert severity levels (High/Medium/Low)
- Resolution tracking
- Historical alert archive

#### DB Tab
- MySQL connection status
- Retry controls
- AI model management
- Simulation execution
- Database schema verification
- Setup instructions

---

## 🔧 Configuration

### `.env` File

Create a `.env` file in the backend directory (or set env vars in your host):

```env
PORT=5000
# Either set the JSON content of your service account here:
FIREBASE_SERVICE_ACCOUNT={...}
# Or set the path to the service account file for the SDK:
GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccountKey.json
JWT_SECRET=orbital_guardian_secret_key_2025
```

---

## 📊 API Endpoints

All endpoints require JWT authentication (except `/health` and auth endpoints).

### Authentication
- `POST /api/auth/login` - Login user
- `POST /api/auth/register` - Register new user

### Satellites
- `GET /api/satellites` - List all satellites
- `POST /api/satellites` - Add new satellite
- `DELETE /api/satellites/:id` - Remove satellite

### Debris
- `GET /api/debris` - List debris objects
- `POST /api/debris` - Log new debris

### Predictions
- `GET /api/predictions` - List predictions
- `POST /api/predictions` - Create prediction

### Alerts
- `GET /api/alerts` - List alerts
- `PATCH /api/alerts/:id/resolve` - Resolve alert

### Stations & Models
- `GET /api/stations` - List tracking stations
- `GET /api/ai-models` - List AI models
- `POST /api/simulations/run` - Run simulation

---

## 🔌 Connection Troubleshooting

### Backend is Offline
- App automatically falls back to **Demo Mode**
- All features work with sample data
- Status bar shows "Offline — Demo Mode" in red
- Click **RECONNECT** button to retry

### Connection Retry Behavior
1. Initial attempt: Immediate
2. 1st retry: After 3 seconds
3. 2nd retry: After 4.5 seconds
4. 3rd retry: After 6.75 seconds
5. 4th retry: After 10 seconds
6. 5th retry: After 15 seconds
7. After max retries: Demo mode only

### Common Issues

**"Cannot connect to MySQL"**
- Ensure MySQL service is running
- Check credentials in `.env` file
- Verify database exists: `CREATE DATABASE orbital_guardian`

**"Port 3306 already in use"**
- Change `DB_PORT` in `.env`
- Or kill existing MySQL process

**"Connection timeout"**
- Check firewall settings
- Ensure MySQL is listening on the configured port
- Try: `mysql -h localhost -u root -p`

---

## 🗄️ Database Schema

The application uses the following tables:

- **users** - User accounts with roles
- **organizations** - Satellite operators
- **satellites** - Tracked satellites
- **space_debris** - Debris objects
- **collision_predictions** - Computed collision risks
- **alerts** - System alerts
- **tracking_stations** - Ground stations
- **communication_links** - Sat-station links
- **ai_models** - ML models for predictions
- **simulations** - Simulation runs
- **data_logs** - Audit log

---

## 🎨 UI/UX Features

### Earth Visualization
- Rotating Earth with realistic colors
- Adjustable transparency
- Atmospheric glow
- Cloud layer animation
- Grid lines (latitude/longitude)
- Land masses with depth perception

### Satellite Tracking
- Color-coded by orbit type:
  - 🔵 LEO (Low Earth Orbit) - Cyan
  - 🟣 MEO (Medium Earth Orbit) - Purple
  - 🟠 GEO (Geostationary) - Amber
  - 🟢 SSO (Sun-Synchronous) - Green
  - 🔴 HEO (Highly Eccentric) - Red

### Status Indicators
- Connection status dot
- Real-time clock (UTC)
- Satellite count
- Debris count
- Active alerts
- Predictions

---

## 📱 Login Credentials

### Demo User
- **Username**: admin
- **Password**: admin123
- **Role**: admin

### Create New User
1. Click "REGISTER" tab
2. Enter email, username, password
3. Click "CREATE ACCOUNT"
4. Automatically logs in after registration

---

## 🛠️ Development

### Modify Backend
Edit `backend-server.js` and restart with `npm run dev`

### Modify Frontend
Edit `orbital-guardian-sim.html` and refresh browser

### Add New API Endpoints
1. Add route in `backend-server.js`
2. Add frontend function in HTML
3. Call `apiCall()` with new endpoint

### Update Database Schema
1. Modify `schema.sql`
2. Run: `mysql -u root -p orbital_guardian < schema.sql`
3. Restart backend

---

## 📈 Performance Notes

- **60 FPS** canvas rendering (optimized)
- **Connection pool**: 10 concurrent connections
- **JWT expiry**: 24 hours
- **Demo data**: 8 satellites, 5 debris objects
- **Max retries**: 5 attempts with exponential backoff

---

## 🔒 Security

- Passwords hashed with bcrypt
- JWT tokens for API authentication
- CORS enabled for development
- Database connection pooling
- Input validation on all endpoints
- SQL injection prevention (prepared statements)

---

## 📝 License

MIT License - Orbital Guardian 2025

---

## 🤝 Support

For issues or questions:
1. Check `.env` file configuration
2. Verify MySQL is running
3. Check backend console for errors
4. Try manual reconnection (DB tab → RECONNECT)
5. Restart both backend and frontend

**Happy tracking!** 🛰️
