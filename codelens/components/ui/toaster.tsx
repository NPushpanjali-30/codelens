"use client";

import { Toaster as HotToaster } from "react-hot-toast";

export function Toaster() {
  return (
    <HotToaster
      position="bottom-right"
      toastOptions={{
        style: {
          background: "#171B24",
          color: "#E6E9EF",
          border: "1px solid #232838",
          fontSize: "13px",
        },
        success: { iconTheme: { primary: "#5EEAD4", secondary: "#0B0E14" } },
        error: { iconTheme: { primary: "#F87171", secondary: "#0B0E14" } },
      }}
    />
  );
}
