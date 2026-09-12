# NotifySync - Multichannel Notification Management System

NotifySync is a full-stack notification management system featuring a unified single-screen Admin Matrix, real user authentication triggers (Login/Logout), and isolated delivery across **WhatsApp**, **Email**, and **Web Push**.

---

## ⚡ Quick Start

### 1. Backend (Django)
```bash
cd backend
# Activate virtual environment
..\venv\Scripts\activate  # or venv\Scripts\activate
python manage.py migrate
python manage.py seed_data
python manage.py runserver 8000
```
Backend runs at: **`http://127.0.0.1:8000`**

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
Frontend runs at: **`http://localhost:5173`**

---

## 🔑 Demo Credentials

| Role | Username | Password | Email | Features |
|---|---|---|---|---|
| **Admin** | `admin` | `admin123` | `ayush.kansal321@gmail.com` | Full Admin Matrix, Templates, Toggles, Logs |
| **Demo User** | `ayush` | `user123` | `ayush.kansal321@gmail.com` | User Portal, Push Subscriber, Triggers Notifications |

---

## 🛠️ Tech Stack & Channels

- **Backend**: Python 3.13, Django 5.1, Django REST Framework, SimpleJWT, SQLite / Supabase PostgreSQL.
- **Frontend**: React 19, Vite, React Router, Lucide Icons, Modern Dark Glassmorphism CSS.
- **Delivery Channels**:
  - **WhatsApp**: Twilio WhatsApp Sandbox (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`) / Meta Cloud API.
  - **Email**: Resend API (`RESEND_API_KEY`).
  - **Web Push**: OneSignal Browser Push Notifications (`ONESIGNAL_APP_ID`).
  - **Fallback**: Automatic Sandbox / Mock Delivery mode (`MOCK_DELIVERED`) if credentials are not configured.

---

## ⚙️ Environment Configuration (`.env`)

Create a `.env` file in the project root:

```env
# Django
SECRET_KEY=your-secret-key-12345
DEBUG=True
FRONTEND_URL=http://localhost:5173

# WhatsApp (Twilio Sandbox - Recommended)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
WHATSAPP_TEST_RECIPIENT=+918433055349

# Email (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev

# Web Push (OneSignal)
ONESIGNAL_APP_ID=your_onesignal_app_id
ONESIGNAL_REST_API_KEY=your_onesignal_rest_key
```

---

## 🌟 Key Features

1. **Admin Matrix Table**:
   - 2D grid: Rows = Triggers (`Login`, `Logout`), Columns = Channels (`WhatsApp`, `Email`, `Web Push`).
   - Live ON/OFF toggle switches per cell.
   - Dynamic template editor with variable placeholders: `{{user_name}}`, `{{user_email}}`, `{{timestamp}}`.
   - In-cell `[Test Send]` button for instant verification.
2. **Real Lifecycle Triggers**:
   - Notifications fire automatically on actual user **Login** and **Logout** events.
3. **Provider Isolation**:
   - If one provider fails or hits rate limits, other channels deliver without interruption.
4. **Audit Logs & Payload Inspector**:
   - Real-time audit log viewer with status badges (`SENT`, `FAILED`, `MOCK_DELIVERED`) and inspectable JSON payloads.

---

## 🧪 Running Tests

Run the complete 14-test suite:
```bash
cd backend
python manage.py test notifications
```
All 14 tests validate model constraints, template interpolation, test dispatches, permission security, and mock fallbacks.

---

## 📁 Project Structure

```text
notification-system/
├── backend/
│   ├── manage.py
│   ├── requirements.txt
│   ├── notification_core/              # Django core configuration
│   │   ├── settings.py                 # JWT, CORS, Database & Provider credentials
│   │   ├── urls.py                     # Root URL routing
│   │   └── wsgi.py
│   └── notifications/                  # Core application
│       ├── models.py                   # Trigger, ChannelTemplate, WebPushSubscription, NotificationLog
│       ├── serializers.py              # DRF serializers
│       ├── views.py                    # Auth, Matrix, Template & Log ViewSets
│       ├── urls.py                     # API route endpoints
│       ├── seed_data.py                # Initial triggers, templates, & demo accounts
│       ├── tests.py                    # 14-test verification suite
│       └── services/                   # Multichannel delivery providers
│           ├── notification_service.py # Core dispatcher & dynamic template interpolator
│           ├── whatsapp.py             # Twilio Sandbox & Meta Cloud API
│           ├── email.py                # Resend API integration
│           └── webpush.py              # OneSignal REST API integration
├── frontend/
│   ├── package.json
│   ├── vite.config.js                  # Vite dev server (port 5173)
│   ├── index.html                      # OneSignal SDK initialization
│   ├── public/
│   │   └── OneSignalSDKWorker.js       # Browser push notification service worker
│   └── src/
│       ├── main.jsx                    # React application entry
│       ├── App.jsx                     # Layout, navigation & notifications
│       ├── index.css                   # Dark glassmorphic design system
│       ├── pages/
│       │   ├── Login.jsx               # Auth portal with 1-click demo logins
│       │   ├── AdminDashboard.jsx      # Admin Matrix & channel status cards
│       │   └── UserPortal.jsx          # Profile overview & push subscriber
│       ├── components/
│       │   ├── AdminTable.jsx          # 2D interactive matrix with live toggles & test sends
│       │   ├── TemplateModal.jsx       # Dynamic variable insertion & template editor
│       │   ├── NotificationLogs.jsx    # Filterable audit logs & payload inspector
│       │   └── PushSubscriber.jsx      # Push permission opt-in handler
│       └── services/
│           └── api.js                  # Centralized Axios/fetch client
├── .env.example                        # Configuration template
├── .gitignore
└── README.md
```

