declare module 'pannellum' {
  interface PannellumViewer {
    destroy(): void
    loadScene(sceneId: string): void
    getScene(): string
  }
  interface ViewerConfig {
    type: string
    panorama?: string
    autoLoad?: boolean
    hfov?: number
    showControls?: boolean
    mouseZoom?: boolean
    gyroscope?: boolean
    scenes?: Record<string, SceneConfig>
    default?: { firstScene: string }
  }
  interface SceneConfig {
    type: string
    panorama: string
    title?: string
    autoLoad?: boolean
  }
  function viewer(container: HTMLElement, config: ViewerConfig): PannellumViewer
}
