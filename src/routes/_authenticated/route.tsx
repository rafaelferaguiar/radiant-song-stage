import { createFileRoute, Outlet } from "@tanstack/react-router";

// RFPresenter Desktop — sem autenticação online.
// O app abre diretamente no estúdio com armazenamento 100% local.
export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    // Usuário local fixo — sem Supabase
    return { user: { id: "local", email: "local@rfpresenter" } };
  },
  component: () => <Outlet />,
});
