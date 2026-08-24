import { Outlet } from "react-router-dom";
import AppTopBar from "../components/nav/AppTopBar";

export default function AppShell() {
  return (
    <div className="nx-dark min-h-screen">
      <AppTopBar />
      <main className="mx-auto max-w-[1400px] px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
