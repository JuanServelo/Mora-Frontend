// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import { Navbar } from "../components/navbar/Navbar";

export function AppLayout() {
  return (
    <>
      <Navbar />
      <div className="pt-24">
        <Outlet />
      </div>
    </>
  );
}
