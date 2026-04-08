import { createContext, useContext } from "react";

export const DialogContext = createContext(null);

export function useDialog() {
  const context = useContext(DialogContext);

  if (!context) {
    throw new Error("useDialog precisa estar dentro de DialogProvider.");
  }

  return context;
}
