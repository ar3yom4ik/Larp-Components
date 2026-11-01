import { Component, type ErrorInfo, type ReactNode } from 'react';
import { t } from '../i18n';

/** Keep the workspace usable if the browser cannot create the 3D renderer. */
export class ViewportErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() { return { failed: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('The 3D viewport could not start:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <div role="alert" className="absolute inset-0 flex items-center justify-center bg-[#20272d] p-6 text-white">
      <div className="max-w-md rounded-lg border border-white/20 bg-[#272b30] p-5 shadow-xl">
        <h2 className="text-base font-semibold">{t('3D viewport unavailable')}</h2>
        <p className="mt-2 text-sm leading-relaxed text-white/75">{t('The browser could not start the 3D renderer. Check that WebGL and hardware acceleration are enabled, or try another browser. The rest of the workspace remains available.')}</p>
        <button type="button" onClick={() => this.setState({ failed: false })} className="mt-4 rounded bg-[#287fbc] px-3 py-2 text-sm hover:bg-[#379cdd]">{t('Retry 3D viewport')}</button>
      </div>
    </div>;
  }
}
