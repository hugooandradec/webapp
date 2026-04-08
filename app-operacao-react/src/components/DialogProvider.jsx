import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import useBodyScrollLock from "../hooks/useBodyScrollLock";
import "../styles/buttons.css";
import "../styles/dialog.css";
import { DialogContext } from "./dialogContext";

const DEFAULTS = {
  alert: {
    title: "Aviso",
    confirmLabel: "Entendi",
    cancelLabel: "",
  },
  confirm: {
    title: "Confirmacao",
    confirmLabel: "Confirmar",
    cancelLabel: "Cancelar",
  },
  prompt: {
    title: "Informacao",
    confirmLabel: "Salvar",
    cancelLabel: "Cancelar",
    placeholder: "",
    defaultValue: "",
  },
};

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const resolverRef = useRef(null);
  const inputRef = useRef(null);

  useBodyScrollLock(Boolean(dialog));

  const resolverAtual = useCallback((resultado) => {
    if (resolverRef.current) {
      resolverRef.current(resultado);
      resolverRef.current = null;
    }
  }, []);

  const fecharDialogo = useCallback((resultado) => {
    resolverAtual(resultado);
    setDialog(null);
    setInputValue("");
  }, [resolverAtual]);

  const abrirDialogo = useCallback((tipo, message, options = {}) => new Promise((resolve) => {
    resolverAtual(tipo === "prompt" ? null : false);
    resolverRef.current = resolve;

    const configuracao = {
      type: tipo,
      message,
      ...DEFAULTS[tipo],
      ...options,
    };

    setDialog(configuracao);
    setInputValue(configuracao.defaultValue || "");
  }), [resolverAtual]);

  useEffect(() => {
    if (dialog?.type === "prompt") {
      window.setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 0);
    }
  }, [dialog]);

  useEffect(() => () => resolverAtual(null), [resolverAtual]);

  useEffect(() => {
    if (!dialog) return undefined;

    function handleWindowKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (dialog.type === "alert") {
          fecharDialogo(true);
        } else if (dialog.type === "confirm") {
          fecharDialogo(false);
        } else {
          fecharDialogo(null);
        }
        return;
      }

      if (event.key === "Enter" && dialog.type === "prompt") {
        event.preventDefault();
        fecharDialogo(inputValue);
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown);

    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown);
    };
  }, [dialog, fecharDialogo, inputValue]);

  const api = useMemo(() => ({
    alert: (message, options) => abrirDialogo("alert", message, options),
    confirm: (message, options) => abrirDialogo("confirm", message, options),
    prompt: (message, options) => abrirDialogo("prompt", message, options),
  }), [abrirDialogo]);

  function confirmar() {
    if (!dialog) return;

    if (dialog.type === "prompt") {
      fecharDialogo(inputValue);
      return;
    }

    fecharDialogo(true);
  }

  function cancelar() {
    if (!dialog) return;

    if (dialog.type === "alert") {
      fecharDialogo(true);
      return;
    }

    if (dialog.type === "confirm") {
      fecharDialogo(false);
      return;
    }

    fecharDialogo(null);
  }

  function handleOverlayClick(event) {
    if (event.target === event.currentTarget) {
      cancelar();
    }
  }

  return (
    <DialogContext.Provider value={api}>
      {children}

      {dialog ? (
        <div
          className="dialog-overlay"
          role="presentation"
          onMouseDown={handleOverlayClick}
        >
          <div
            className="dialog-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="dialog-header">
              <h2 id="dialog-title">{dialog.title}</h2>
            </div>

            <div className="dialog-body">
              <p>{dialog.message}</p>

              {dialog.type === "prompt" ? (
                <input
                  ref={inputRef}
                  type="text"
                  className="dialog-input"
                  value={inputValue}
                  placeholder={dialog.placeholder}
                  onChange={(event) => setInputValue(event.target.value)}
                />
              ) : null}
            </div>

            <div className="dialog-actions">
              {dialog.cancelLabel ? (
                <button
                  type="button"
                  className="btn btn-claro"
                  onClick={cancelar}
                >
                  {dialog.cancelLabel}
                </button>
              ) : null}

              <button
                type="button"
                className="btn btn-roxo"
                onClick={confirmar}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </DialogContext.Provider>
  );
}
