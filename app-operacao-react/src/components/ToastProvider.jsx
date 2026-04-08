import { useCallback, useMemo, useState } from "react";
import { FaXmark } from "react-icons/fa6";

import "../styles/toast.css";
import { ToastContext } from "./toastContext";

let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = ++idCounter;

    setToasts((prev) => [...prev, { id, message, type }]);

    window.setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const api = useMemo(() => ({
    success: (message, duration) => showToast(message, "success", duration),
    error: (message, duration) => showToast(message, "error", duration),
    info: (message, duration) => showToast(message, "info", duration),
    warning: (message, duration) => showToast(message, "warning", duration),
  }), [showToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}

      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast--${toast.type}`}>
            <span>{toast.message}</span>

            <button
              type="button"
              className="toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Fechar aviso"
            >
              <FaXmark />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
