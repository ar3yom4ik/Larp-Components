import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { ButtonTooltip } from "./components/ButtonTooltip";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <ButtonTooltip />
  </StrictMode>
);
