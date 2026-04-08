import { useEffect } from "react";

export default function useBodyScrollLock(ativo) {
  useEffect(() => {
    if (!ativo || typeof document === "undefined") {
      return undefined;
    }

    const { body } = document;
    const overflowAnterior = body.style.overflow;

    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = overflowAnterior;
    };
  }, [ativo]);
}
