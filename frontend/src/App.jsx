import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from "react-router-dom";
import { Bell, Shield, User as UserIcon, LogOut, CheckCircle, AlertCircle, Info } from "lucide-react";
import { api } from "./services/api";
import { Login } from "./pages/Login";
import { UserPortal } from "./pages/UserPortal";
import { AdminDashboard } from "./pages/AdminDashboard";

export function App() {
  const [currentUser, setCurrentUser] = useState(api.getUser());
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    // Check me endpoint on launch if token present
    if (api.getToken()) {
      api.getMe()
        .then((user) => setCurrentUser(user))
        .catch(() => {
          api.clearTokens();
          setCurrentUser(null);
        });
    }
  }, []);

  const showToast = (message, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleLogout = () => {
    api.clearTokens();
    setCurrentUser(null);
  };

  // Protected Route Wrappers
  const ProtectedAdminRoute = ({ children }) => {
    if (!api.getToken()) {
      return <Navigate to="/login" replace />;
    }
    if (currentUser && !currentUser.is_staff && !currentUser.is_superuser) {
      showToast("Access restricted: Administrator privileges required.", "error");
      return <Navigate to="/user" replace />;
    }
    return children;
  };

  const ProtectedUserRoute = ({ children }) => {
    if (!api.getToken()) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  return (
    <BrowserRouter>
      <div className="app-container">
        {/* Navigation Bar */}
        <header className="navbar">
          <Link to="/" className="brand">
            <div className="brand-icon">
              <Bell size={18} />
            </div>
            <span>NotifySync</span>
            <span
              style={{
                fontSize: "0.68rem",
                background: "rgba(99, 102, 241, 0.2)",
                color: "#a5b4fc",
                padding: "2px 6px",
                borderRadius: "4px",
                fontWeight: "500",
              }}
            >
              Matrix Engine
            </span>
          </Link>

          <div className="nav-links">
            {currentUser ? (
              <>
                {currentUser.is_staff && (
                  <Link to="/admin" className="btn btn-outline btn-sm">
                    <Shield size={14} />
                    Admin Matrix
                  </Link>
                )}
                <Link to="/user" className="btn btn-outline btn-sm">
                  <UserIcon size={14} />
                  {currentUser.first_name || currentUser.username}
                </Link>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    await api.logout();
                    showToast("Logged out successfully! (LOGOUT trigger fired)", "info");
                    handleLogout();
                  }}
                  title="Fires the LOGOUT trigger"
                >
                  <LogOut size={13} />
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                Sign In
              </Link>
            )}
          </div>
        </header>

        {/* Route Definitions */}
        <Routes>
          <Route
            path="/login"
            element={
              currentUser ? (
                <Navigate to={currentUser.is_staff ? "/admin" : "/user"} replace />
              ) : (
                <Login showToast={showToast} onLoginSuccess={(u) => setCurrentUser(u)} />
              )
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <AdminDashboard
                  user={currentUser}
                  onLogout={handleLogout}
                  showToast={showToast}
                />
              </ProtectedAdminRoute>
            }
          />

          <Route
            path="/user"
            element={
              <ProtectedUserRoute>
                <UserPortal
                  user={currentUser}
                  onLogout={handleLogout}
                  showToast={showToast}
                />
              </ProtectedUserRoute>
            }
          />

          <Route
            path="/"
            element={
              currentUser ? (
                <Navigate to={currentUser.is_staff ? "/admin" : "/user"} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>

        {/* Global Toast Notifications */}
        <div className="toast-container">
          {toasts.map((toast) => (
            <div key={toast.id} className={`toast toast-${toast.type}`}>
              {toast.type === "success" && <CheckCircle size={16} color="#10b981" />}
              {toast.type === "error" && <AlertCircle size={16} color="#ef4444" />}
              {toast.type === "info" && <Info size={16} color="#38bdf8" />}
              <span>{toast.message}</span>
            </div>
          ))}
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
