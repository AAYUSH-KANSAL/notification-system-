const API_BASE = import.meta.env.VITE_API_URL || "";

export const api = {
  // Token management
  getToken() {
    return localStorage.getItem("access_token");
  },
  setTokens(access, refresh) {
    if (access) localStorage.setItem("access_token", access);
    if (refresh) localStorage.setItem("refresh_token", refresh);
  },
  clearTokens() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
  },
  getUser() {
    const raw = localStorage.getItem("user_info");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem("user_info", JSON.stringify(user));
  },

  // HTTP Request Helper
  async request(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    const token = this.getToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${endpoint}`;
    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        // If unauthorized on protected endpoint, clear local storage
        if (!endpoint.includes("/auth/login/")) {
          this.clearTokens();
          if (window.location.pathname !== "/login") {
            window.location.href = "/login";
          }
        }
      }

      if (!response.ok) {
        const error = new Error(data.detail || data.message || `HTTP ${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    } catch (err) {
      throw err;
    }
  },

  // Auth endpoints
  async login(username, password) {
    const res = await this.request("/api/auth/login/", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (res.tokens) {
      this.setTokens(res.tokens.access, res.tokens.refresh);
    }
    if (res.user) {
      this.setUser(res.user);
    }
    return res;
  },

  async logout() {
    const refreshToken = localStorage.getItem("refresh_token");
    let res = null;
    try {
      res = await this.request("/api/auth/logout/", {
        method: "POST",
        body: JSON.stringify({ refresh: refreshToken }),
      });
    } catch (e) {
      console.warn("Logout endpoint error:", e);
    } finally {
      this.clearTokens();
    }
    return res;
  },

  async register(userData) {
    const res = await this.request("/api/auth/register/", {
      method: "POST",
      body: JSON.stringify(userData),
    });
    if (res.tokens) {
      this.setTokens(res.tokens.access, res.tokens.refresh);
    }
    if (res.user) {
      this.setUser(res.user);
    }
    return res;
  },

  async getMe() {
    const user = await this.request("/api/auth/me/");
    this.setUser(user);
    return user;
  },

  // Notification Matrix
  async getMatrix() {
    return await this.request("/api/notification-matrix/");
  },

  // Templates
  async updateTemplate(id, data) {
    return await this.request(`/api/templates/${id}/`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async toggleTemplate(id) {
    return await this.request(`/api/templates/${id}/toggle/`, {
      method: "PATCH",
    });
  },

  async testTemplate(id, context = {}) {
    return await this.request(`/api/templates/${id}/test/`, {
      method: "POST",
      body: JSON.stringify({ context }),
    });
  },

  async syncWhatsAppTemplate(id) {
    return await this.request(`/api/templates/${id}/sync-whatsapp/`, {
      method: "POST",
    });
  },

  // Triggers
  async fireTrigger(triggerKey, context = {}) {
    return await this.request(`/api/triggers/${triggerKey}/fire/`, {
      method: "POST",
      body: JSON.stringify({ context }),
    });
  },

  // Logs
  async getLogs(params = {}) {
    const searchParams = new URLSearchParams(params);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : "";
    return await this.request(`/api/notification-logs/${qs}`);
  },

  // Web Push Subscription
  async subscribePush(subscriptionData) {
    return await this.request("/api/push/subscribe/", {
      method: "POST",
      body: JSON.stringify({ subscription_data: subscriptionData }),
    });
  },
};
