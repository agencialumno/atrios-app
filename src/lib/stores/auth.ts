import { writable } from "svelte/store";

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  papel: string;
  pode_hospedar: boolean;
}

interface EstadoAuth {
  usuario: Usuario | null;
  carregando: boolean;
}

function criarAuthStore() {
  const { subscribe, set, update } = writable<EstadoAuth>({
    usuario: null,
    carregando: true,
  });

  return {
    subscribe,
    login(usuario: Usuario, token: string) {
      localStorage.setItem("atrios_token", token);
      set({ usuario, carregando: false });
    },
    logout() {
      localStorage.removeItem("atrios_token");
      set({ usuario: null, carregando: false });
    },
    atualizarUsuario(usuario: Usuario) {
      update((estado) => ({ ...estado, usuario }));
    },
    definirCarregando(valor: boolean) {
      set({ usuario: null, carregando: valor });
    },
  };
}

export const auth = criarAuthStore();
