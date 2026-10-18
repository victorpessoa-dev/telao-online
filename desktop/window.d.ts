interface Window {
  vPlaycastDesktop?: {
    getInfo(): Promise<{ isDesktop: boolean; version: string; platform: string }>
    auth: {
      getRemember(): Promise<boolean>
      setRemember(remember: boolean): Promise<void>
      getSession(key: string): Promise<string | null>
      setSession(key: string, value: string): Promise<void>
      clearSession(key: string): Promise<void>
    }
    config: {
      get(): Promise<{ theme: "light" | "dark"; siteUrl: string }>
      validateSite(siteUrl: string, slug: string): Promise<{ valid: boolean; status: number; routeUrl: string }>
      save(config: { theme: "light" | "dark"; siteUrl: string }, slug: string): Promise<{ theme: "light" | "dark"; siteUrl: string; routeUrl: string }>
    }
    overlays: {
      list(): Promise<unknown[]>
      create(payload: { name: string; width: number; height: number }): Promise<unknown>
      update(id: string, payload: unknown): Promise<unknown>
      remove(id: string): Promise<void>
      saveAsset(id: string, name: string, bytes: ArrayBuffer): Promise<string>
      getUrl(id: string): Promise<string>
    }
  }
}
