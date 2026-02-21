import React from "react";
import { useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";
import { ErrorBoundary } from "../ErrorBoundary";

export const PageWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const location = useLocation();
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="app-main__content">
          <ErrorBoundary level="page" key={location.pathname}>
            {children}
          </ErrorBoundary>
        </div>
      </div>
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};