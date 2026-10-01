// 3Dmol.js ships as a browser global (not a clean ESM package), so it's
// loaded once via a <script> tag and cached, the same way pdf.js's worker
// is wired up in lib/pdf.ts.
declare global {
  interface Window {
    $3Dmol?: {
      createViewer: (el: HTMLElement, opts?: Record<string, unknown>) => Mol3DViewer;
    };
  }
}

export type Mol3DViewer = {
  addModel: (data: string, format: string) => void;
  setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void;
  zoomTo: () => void;
  render: () => void;
  resize: () => void;
};

let loadPromise: Promise<void> | null = null;

export function load3Dmol(): Promise<void> {
  if (window.$3Dmol) return Promise.resolve();
  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/3Dmol/2.4.2/3Dmol-min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Could not load the 3D viewer"));
      document.head.appendChild(script);
    });
  }
  return loadPromise;
}
