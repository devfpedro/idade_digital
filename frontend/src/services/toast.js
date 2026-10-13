import { createContext, useContext } from "react";

// Contexto simples de notificações (toast): qualquer tela pode exibir mensagens
// flutuantes. Ainda não há backend de notificações; a infraestrutura fica pronta.
export const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}
