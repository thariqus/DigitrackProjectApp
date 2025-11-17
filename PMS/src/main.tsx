import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { ThemeProvider } from "./context/ThemeContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AppWrapper>
        <App />
      </AppWrapper>
    </ThemeProvider>
  </StrictMode>,
);



// import { StrictMode } from "react";
// import { createRoot } from "react-dom/client";
// import "./index.css";
// import "swiper/swiper-bundle.css";
// import "flatpickr/dist/flatpickr.css";
// import App from "./App.tsx";
// import { AppWrapper } from "./components/common/PageMeta.tsx";
// import { ThemeProvider } from "./context/ThemeContext.tsx";
// import { QueryClientProvider } from "@tanstack/react-query";
// import { queryClient } from "./utils/query-client.ts";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

// createRoot(document.getElementById("root")!).render(
//   <StrictMode>
//     <QueryClientProvider client={queryClient}>
//       <ThemeProvider>
//         <AppWrapper>
//           <App />
//         </AppWrapper>
//       </ThemeProvider>
//       <ReactQueryDevtools initialIsOpen={false} />
//     </QueryClientProvider>
//   </StrictMode>
// );



// import { StrictMode } from 'react'
// import { createRoot } from 'react-dom/client'
// import './index.css'
// import App from './App.tsx'

// createRoot(document.getElementById('root')!).render(
//   <StrictMode>
//     <App />
//   </StrictMode>,
// )
