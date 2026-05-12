// Safely register the PWA service worker — never in iframes or Lovable preview hosts.
export function registerServiceWorker() {
  if (typeof window === "undefined") return;

  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") ||
    host.includes("preview--") ||
    host.endsWith("lovableproject.com") ||
    host.endsWith("lovableproject-dev.com");

  if (isInIframe || isPreviewHost) {
    // Clean up any SW that may have been registered previously in these contexts.
    navigator.serviceWorker?.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  if (!("serviceWorker" in navigator)) return;

  // Lazy-load workbox-window so it doesn't bloat the main bundle.
  import("workbox-window").then(({ Workbox }) => {
    const wb = new Workbox("/sw.js");
    wb.addEventListener("waiting", () => {
      wb.messageSkipWaiting();
    });
    wb.addEventListener("controlling", () => {
      window.location.reload();
    });
    wb.register().catch(() => {
      /* ignore */
    });
  });
}
