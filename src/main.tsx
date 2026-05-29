import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

// Defer SW registration until the browser is idle so it doesn't compete with first paint.
const deferSW = () => registerServiceWorker();
if ("requestIdleCallback" in window) {
  (window as any).requestIdleCallback(deferSW, { timeout: 4000 });
} else {
  window.addEventListener("load", () => setTimeout(deferSW, 1500), { once: true });
}
