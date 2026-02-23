const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  saveMessages: (contactId, messages) => ipcRenderer.send('save-messages', contactId, messages),
  loadMessages: (contactId) => {
    ipcRenderer.send('load-messages', contactId)
    return new Promise((resolve) => {
      ipcRenderer.once('messages-loaded', (event, id, data) => {
        if (id === contactId) resolve(data)
      })
    })
  },
  deleteMessages: (contactId) => ipcRenderer.send('delete-messages', contactId),
  deleteAllMessages: () => ipcRenderer.send('delete-all-messages'),
  saveConfig: (config) => ipcRenderer.send('save-config', config),
  loadConfig: () => {
    ipcRenderer.send('load-config')
    return new Promise((resolve) => {
      ipcRenderer.once('config-loaded', (event, config) => resolve(config))
    })
  },
  saveContacts: (contacts) => ipcRenderer.send('save-contacts', contacts),
  loadContacts: () => {
    ipcRenderer.send('load-contacts')
    return new Promise((resolve) => {
      ipcRenderer.once('contacts-loaded', (event, contacts) => resolve(contacts))
    })
  },
  saveAvatar: (contactId, base64Data) => ipcRenderer.send('save-avatar', contactId, base64Data),
  loadAvatar: (contactId) => {
    ipcRenderer.send('load-avatar', contactId)
    return new Promise((resolve) => {
      ipcRenderer.once('avatar-loaded', (event, id, data) => {
        if (id === contactId) resolve(data)
      })
    })
  },
  deleteAvatar: (contactId) => ipcRenderer.send('delete-avatar', contactId),
  selectAvatarFile: () => {
    ipcRenderer.send('select-avatar-file')
    return new Promise((resolve) => {
      ipcRenderer.once('avatar-file-selected', (event, filePath) => resolve(filePath))
    })
  },
})