const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vPlaycastDesktop', {
  getInfo: () => ipcRenderer.invoke('desktop:get-info'),
  auth: {
    getRemember: () => ipcRenderer.invoke('desktop-auth:get-remember'),
    setRemember: (remember) => ipcRenderer.invoke('desktop-auth:set-remember', remember === true),
    getSession: (key) => ipcRenderer.invoke('desktop-auth:get-session', key),
    setSession: (key, value) => ipcRenderer.invoke('desktop-auth:set-session', key, value),
    clearSession: (key) => ipcRenderer.invoke('desktop-auth:clear-session', key),
  },
  config: {
    get: () => ipcRenderer.invoke('desktop-config:get'),
    validateSite: (siteUrl, slug) => ipcRenderer.invoke('desktop-config:validate-site', siteUrl, slug),
    save: (config, slug) => ipcRenderer.invoke('desktop-config:save', config, slug),
  },
  overlays: {
    list: () => ipcRenderer.invoke('desktop-overlay:list'),
    create: (payload) => ipcRenderer.invoke('desktop-overlay:create', payload),
    update: (id, payload) => ipcRenderer.invoke('desktop-overlay:update', id, payload),
    remove: (id) => ipcRenderer.invoke('desktop-overlay:delete', id),
    saveAsset: (id, name, bytes) => ipcRenderer.invoke('desktop-overlay:save-asset', id, name, bytes),
    getUrl: (id) => ipcRenderer.invoke('desktop-overlay:url', id),
  },
})
