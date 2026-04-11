import { useState, useEffect, useCallback, createContext, useContext, useRef } from "react";
import { createPortal } from "react-dom";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ─── Individual Toast ─── */
function ToastItem({ id, type, title, message, onRemove }) {
  const [removing, setRemoving] = useState(false);

  const handleRemove = useCallback(() => {
    setRemoving(true);
    setTimeout(() => onRemove(id), 300);
  }, [id, onRemove]);

  // Auto-dismiss after 3.5 seconds
  useEffect(() => {
    const timer = setTimeout(handleRemove, 3500);
    return () => clearTimeout(timer);
  }, [handleRemove]);

  const config = {
    success: {
      icon: <CheckCircle size={20} />,
      bar: "bg-green-400",
      border: "border-green-500",
      iconColor: "text-green-400",
      bg: "bg-gray-900",
    },
    error: {
      icon: <XCircle size={20} />,
      bar: "bg-red-500",
      border: "border-red-500",
      iconColor: "text-red-400",
      bg: "bg-gray-900",
    },
    warning: {
      icon: <AlertTriangle size={20} />,
      bar: "bg-yellow-400",
      border: "border-yellow-500",
      iconColor: "text-yellow-400",
      bg: "bg-gray-900",
    },
    info: {
      icon: <Info size={20} />,
      bar: "bg-blue-400",
      border: "border-blue-500",
      iconColor: "text-blue-400",
      bg: "bg-gray-900",
    },
  };

  const c = config[type] || config.info;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border ${c.border} ${c.bg} shadow-2xl text-white
        transition-all duration-300 ${removing ? "opacity-0 translate-x-10 scale-95" : "opacity-100 animate-popIn"}`}
    >
      <div className="flex items-start gap-3 p-4 pr-10">
        <span className={`mt-0.5 flex-shrink-0 ${c.iconColor}`}>{c.icon}</span>
        <div className="flex-1 min-w-0">
          {title && <p className="text-sm font-semibold text-white mb-0.5">{title}</p>}
          <p className="text-sm text-gray-300 leading-snug">{message}</p>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={handleRemove}
        className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
      >
        <X size={16} />
      </button>

      {/* Progress bar */}
      <div className={`h-0.5 ${c.bar} absolute bottom-0 left-0 animate-progressBar`} />
    </div>
  );
}

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const addToast = useCallback((type, message, title) => {
    const id = ++idRef.current;
    setToasts(prev => [...prev, { id, type, message, title }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (message, title) => addToast("success", message, title),
    error:   (message, title) => addToast("error",   message, title),
    warning: (message, title) => addToast("warning", message, title),
    info:    (message, title) => addToast("info",    message, title),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div id="toast-container">
          {toasts.map(t => (
            <ToastItem key={t.id} {...t} onRemove={removeToast} />
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export default ToastItem;
