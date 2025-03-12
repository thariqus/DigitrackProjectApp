import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/utils/query-client";
import AuthProvider from "./components/auth";
import { BrowserRouter } from "react-router";
import AppRoutes from "./router";
import { Toaster } from "@/components/toaster";
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster position="top-right" closeButton/>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
