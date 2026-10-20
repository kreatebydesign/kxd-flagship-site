"use client";

import { createContext, useContext } from "react";

const StaffNavContext = createContext({ showSalesDevelopmentNav: false });

export function StaffNavProvider({
  showSalesDevelopmentNav,
  children,
}: {
  showSalesDevelopmentNav: boolean;
  children: React.ReactNode;
}) {
  return (
    <StaffNavContext.Provider value={{ showSalesDevelopmentNav }}>
      {children}
    </StaffNavContext.Provider>
  );
}

export function useStaffNavContext(): { showSalesDevelopmentNav: boolean } {
  return useContext(StaffNavContext);
}
