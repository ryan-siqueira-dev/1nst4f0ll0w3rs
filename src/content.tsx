import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import styles from "./styles.css?inline";

const HOST_ID = "instagram-followers-analyzer-root";

if (!document.getElementById(HOST_ID)) {
  const host = document.createElement("div");
  host.id = HOST_ID;
  document.documentElement.append(host);

  const shadowRoot = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;
  const mount = document.createElement("div");
  shadowRoot.append(style, mount);

  createRoot(mount).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
