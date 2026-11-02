import { Component, type ErrorInfo, type ReactNode } from "react";
import { t } from "../i18n";

/** A render failure outside the 3D viewport must not leave an empty page. */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("The workspace could not start:", error, info.componentStack); }

  render() {
    if (!this.state.failed) return this.props.children;
    return <main role="alert" style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px", background: "#20272d", color: "#eef4f7", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 22 }}>{t("The workspace could not start")}</h1>
        <p>{t("Reload the page or try the downloadable standalone HTML in a current browser. Your saved projects have not been cleared.")}</p>
        <button type="button" onClick={() => window.location.reload()} style={{ marginTop: 16, background: "#287fbc", color: "white", border: 0, borderRadius: 4, padding: "10px 16px", cursor: "pointer" }}>{t("Reload workspace")}</button>
      </div>
    </main>;
  }
}
