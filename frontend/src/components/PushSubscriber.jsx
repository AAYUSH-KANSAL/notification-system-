import React, { useState, useEffect } from "react";
import { Bell, CheckCircle, AlertCircle, ShieldAlert } from "lucide-react";
import { api } from "../services/api";

export const PushSubscriber = ({ showToast }) => {
  const [permission, setPermission] = useState("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if ("Notification" in window) {
      setPermission(Notification.permission);
      if (Notification.permission === "granted") {
        setIsSubscribed(true);
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function (OneSignal) {
            try {
              const subId = OneSignal.User?.PushSubscription?.id;
              if (subId) {
                await api.subscribePush({
                  userAgent: navigator.userAgent,
                  subscribedAt: new Date().toISOString(),
                  type: "browser_push",
                  player_id: subId,
                });
              }
            } catch (err) {
              console.warn("OneSignal auto-sync error:", err);
            }
          });
        }
      }
    }
  }, []);

  const handleSubscribe = async () => {
    if (!("Notification" in window)) {
      showToast("This browser does not support desktop push notifications.", "error");
      return;
    }

    setIsProcessing(true);
    try {
      // Trigger OneSignal Web SDK v16 permission
      if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push(async function (OneSignal) {
          try {
            await OneSignal.Notifications.requestPermission();
          } catch (e) {
            console.warn("OneSignal prompt error:", e);
          }
        });
      }

      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "granted") {
        let subscriptionData = {
          userAgent: navigator.userAgent,
          subscribedAt: new Date().toISOString(),
          type: "browser_push",
        };

        // Capture OneSignal subscription ID if available
        if (window.OneSignalDeferred) {
          window.OneSignalDeferred.push(async function (OneSignal) {
            try {
              const subId = OneSignal.User?.PushSubscription?.id;
              if (subId) {
                subscriptionData.player_id = subId;
                await api.subscribePush(subscriptionData);
              }
            } catch (err) {
              console.warn("OneSignal subId capture:", err);
            }
          });
        }

        // Send subscription to backend
        await api.subscribePush(subscriptionData);
        setIsSubscribed(true);
        showToast("Browser push notifications successfully enabled!", "success");

        // Display sample confirmation notification
        new Notification("Web Push Enabled", {
          body: "You will now receive automated browser notifications from the system.",
          icon: "/favicon.ico",
        });
      } else if (perm === "denied") {
        showToast("Notification permission was denied in your browser settings.", "error");
      }
    } catch (err) {
      showToast(err.message || "Push subscription failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      style={{
        background: "rgba(168, 85, 247, 0.08)",
        border: "1px solid rgba(168, 85, 247, 0.25)",
        borderRadius: "10px",
        padding: "16px 20px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "24px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <div
          style={{
            background: "rgba(168, 85, 247, 0.2)",
            color: "#c084fc",
            width: "40px",
            height: "40px",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Bell size={20} />
        </div>
        <div>
          <h4 style={{ fontSize: "0.95rem", fontWeight: "600", color: "#f3f4f6" }}>
            Browser Web Push Notifications (OneSignal)
          </h4>
          <p style={{ fontSize: "0.8rem", color: "#9ca3af", marginTop: "2px" }}>
            Status:{" "}
            {permission === "granted" ? (
              <span style={{ color: "#34d399", fontWeight: "600" }}>Active & Subscribed</span>
            ) : permission === "denied" ? (
              <span style={{ color: "#f87171", fontWeight: "600" }}>Blocked by Browser</span>
            ) : (
              <span style={{ color: "#fbbf24", fontWeight: "600" }}>Permission Not Yet Granted</span>
            )}
          </p>
        </div>
      </div>

      <div>
        {permission === "granted" ? (
          <span className="badge badge-success" style={{ padding: "6px 12px" }}>
            <CheckCircle size={14} /> Subscribed
          </span>
        ) : (
          <button
            className="btn btn-primary"
            style={{ background: "#9333ea", borderColor: "#a855f7" }}
            onClick={handleSubscribe}
            disabled={isProcessing}
          >
            <Bell size={15} />
            {isProcessing ? "Requesting..." : "Enable Push Notifications"}
          </button>
        )}
      </div>
    </div>
  );
};
