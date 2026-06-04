import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import { DashboardPage } from "@/pages/dashboard";

/**
 * App router skeleton.
 * Feature routes are added in Fase 1+.
 */
function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export { AppRouter };
