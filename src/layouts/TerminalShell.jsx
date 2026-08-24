import { Outlet } from "react-router-dom";
import AppTopBar from "../components/nav/AppTopBar";

export default function TerminalShell() {
  return (
    <div className="nx-dark flex h-screen flex-col overflow-hidden">
      <AppTopBar dense />
      <div className="min-h-0 flex-1">
        <Outlet />
      </div>
    </div>
  );
}
