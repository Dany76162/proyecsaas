/**
 * Canvas layout — overrides the default platform main padding
 * so the canvas can stretch edge-to-edge within the content area.
 */
export default function CanvasLayout({ children }: { children: React.ReactNode }) {
  return <div className="-m-4 sm:-m-6 lg:-m-8">{children}</div>;
}
