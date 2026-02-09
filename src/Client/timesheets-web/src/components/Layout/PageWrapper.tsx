import React from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { MobileBottomNav } from "./MobileBottomNav";

export const PageWrapper = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <Topbar />
        <div className="app-main__content">{children}</div>
      </div>
      {/* Mobile bottom navigation */}
      <MobileBottomNav />
    </div>
  );
};