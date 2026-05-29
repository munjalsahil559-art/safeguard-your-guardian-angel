import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./lib/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

// Defer SW registration until the browser is idle so it doesn't compete with first paint.
const deferSW = () => registerServiceWorker();
const w = window as any;
if (typeof w.requestIdleCallback === "function") {
  w.requestIdleCallback(deferSW, { timeout: 4000 });
} else {
  w.addEventListener("load", () => setTimeout(deferSW, 1500), { once: true });
}
