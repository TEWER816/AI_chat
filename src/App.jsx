import { useState, useRef, useEffect } from 'react'
import './App.css'

window.onerror = (msg, url, line) => {
  console.error('Global error:', msg, 'line:', line)
}

function Avatar({ name, avatar }) {
  return (
    <div className="message-avatar-wrapper">
      {avatar ? (
        <img src={avatar} alt="" className="message-avatar" />
      ) : (
        <div className="message-avatar">{name?.[0] || '?'}</div>
      )}
    </div>
  )
}

const initialContacts = []

const initialMessages = {}

function App() {
  const [activeContact, setActiveContact] = useState(null)
  const [contacts, setContacts] = useState(initialContacts)
  const [messages, setMessages] = useState(initialMessages)
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [apiProvider, setApiProvider] = useState('zhipu')
  const [apiKeys, setApiKeys] = useState({
    zhipu: '',
    siliconflow: '',
  })
  const [models, setModels] = useState({
    zhipu: '',
    siliconflow: '',
  })
  const [useCustomModels, setUseCustomModels] = useState({
    zhipu: false,
    siliconflow: false,
  })
  const [availableModels, setAvailableModels] = useState([])
  const [showNotification, setShowNotification] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [editingContact, setEditingContact] = useState(null)
  const [newContact, setNewContact] = useState({ name: '', avatar: '', persona: '' })
  const messagesEndRef = useRef(null)
  const avatarInputRef = useRef(null)

  const saveSettings = async () => {
    const settings = {
      apiProvider,
      apiKeys,
      models,
      useCustomModels,
    }
    await window.electronAPI.saveConfig(settings)
    setShowNotification(true)
    setTimeout(() => setShowNotification(false), 2000)
  }

  const loadSettings = async () => {
    const settings = await window.electronAPI.loadConfig()
    setApiProvider(settings.apiProvider || 'zhipu')
    setApiKeys(settings.apiKeys || {
      zhipu: '0b5bed433cf700cfaa45ffc2e13c5e40.PKlMdGAjlyrQkVNV',
      siliconflow: '',
    })
    setModels(settings.models || {
      zhipu: 'glm-4-flash',
      siliconflow: 'deepseek-ai/DeepSeek-V3',
    })
    setUseCustomModels(settings.useCustomModels || {
      zhipu: false,
      siliconflow: false,
    })
  }

  const loadContacts = async () => {
    if (window.electronAPI?.loadContacts) {
      const savedContacts = await window.electronAPI.loadContacts()
      setContacts(savedContacts)
      if (savedContacts.length > 0 && !activeContact) {
        setActiveContact(savedContacts[0].id)
      }
      savedContacts.forEach(contact => {
        if (window.electronAPI?.loadMessages) {
          window.electronAPI.loadMessages(contact.id).then(messages => {
            setMessages(prev => ({
              ...prev,
              [contact.id]: messages,
            }))
          })
        }
      })
    }
  }

  useEffect(() => {
    loadSettings()
    loadContacts()
  }, [])

  const fetchModels = async () => {
    try {
      let apiUrl
      if (apiProvider === 'zhipu') {
        apiUrl = 'https://open.bigmodel.cn/api/paas/v4/models'
      } else if (apiProvider === 'siliconflow') {
        apiUrl = 'https://api.siliconflow.cn/v1/models'
      }

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${apiKeys[apiProvider]}`,
        },
      })

      const data = await response.json()
      const models = data.data || []
      setAvailableModels(models)
      
      if (models.length > 0 && !models[apiProvider]) {
        setModels(prev => ({ ...prev, [apiProvider]: models[0].id }))
      }
    } catch (error) {
      console.error('获取模型列表失败:', error)
    }
  }

  useEffect(() => {
    if (apiKeys[apiProvider]) {
      fetchModels()
    }
  }, [apiProvider, apiKeys])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  useEffect(() => {
    const loadMessages = async () => {
      if (window.electronAPI?.loadMessages) {
        const savedMessages = await window.electronAPI.loadMessages(activeContact)
        setMessages(prev => ({
          ...prev,
          [activeContact]: savedMessages,
        }))
      }
    }
    loadMessages()
  }, [activeContact])

  const saveMessages = (contactId, msgs) => {
    if (window.electronAPI?.saveMessages) {
      window.electronAPI.saveMessages(contactId, msgs)
    }
  }

  const clearMessages = () => {
    if (window.electronAPI?.deleteMessages) {
      window.electronAPI.deleteMessages(activeContact)
      setMessages(prev => ({
        ...prev,
        [activeContact]: [],
      }))
    }
  }

  const clearAllMessages = () => {
    if (window.electronAPI?.deleteAllMessages) {
      window.electronAPI.deleteAllMessages()
      setMessages(initialMessages)
    }
  }

  const handleAddContact = () => {
    setEditingContact(null)
    setNewContact({ name: '', avatar: '', persona: '' })
    setShowContactModal(true)
  }

  const handleEditContact = async (contact) => {
    setEditingContact(contact)
    let avatar = contact.avatar
    if (!avatar && window.electronAPI?.loadAvatar) {
      avatar = await window.electronAPI.loadAvatar(contact.id) || ''
    }
    setNewContact({ name: contact.name, avatar: avatar, persona: contact.persona })
    setShowContactModal(true)
  }

  const handleDeleteContact = async (contactId) => {
    if (window.electronAPI?.deleteMessages) {
      window.electronAPI.deleteMessages(contactId)
    }
    if (window.electronAPI?.deleteAvatar) {
      window.electronAPI.deleteAvatar(contactId)
    }
    const updatedContacts = contacts.filter(c => c.id !== contactId)
    setContacts(updatedContacts)
    setMessages(prev => {
      const newMessages = { ...prev }
      delete newMessages[contactId]
      return newMessages
    })
    if (activeContact === contactId) {
      setActiveContact(updatedContacts[0]?.id || null)
    }
    if (window.electronAPI?.saveContacts) {
      await window.electronAPI.saveContacts(updatedContacts)
    }
  }

  const handleSaveContact = async () => {
    if (!newContact.name.trim()) return

    let contactId
    let updatedContacts
    if (editingContact) {
      contactId = editingContact.id
      updatedContacts = contacts.map(c => 
        c.id === editingContact.id 
          ? { ...c, name: newContact.name, avatar: newContact.avatar, persona: newContact.persona }
          : c
      )
      setContacts(updatedContacts)
      if (newContact.avatar && window.electronAPI?.saveAvatar) {
        window.electronAPI.saveAvatar(contactId, newContact.avatar)
      }
    } else {
      const newId = Date.now()
      contactId = newId
      const contact = {
        id: newId,
        name: newContact.name,
        avatar: newContact.avatar,
        persona: newContact.persona || '你是一个有帮助的AI助手',
        lastMsg: '',
        time: '',
        unread: 0,
      }
      updatedContacts = [...contacts, contact]
      setContacts(updatedContacts)
      setMessages(prev => ({ ...prev, [newId]: [] }))
      if (newContact.avatar && window.electronAPI?.saveAvatar) {
        window.electronAPI.saveAvatar(newId, newContact.avatar)
      }
    }
    
    if (window.electronAPI?.saveContacts) {
      await window.electronAPI.saveContacts(updatedContacts)
    }
    
    setShowContactModal(false)
    setNewContact({ name: '', avatar: '', persona: '' })
    setEditingContact(null)
  }

  const handleAvatarUpload = async (e) => {
    if (window.electronAPI?.selectAvatarFile) {
      const filePath = await window.electronAPI.selectAvatarFile()
      if (filePath) {
        setNewContact(prev => ({ ...prev, avatar: filePath }))
      }
    } else {
      const file = e.target.files[0]
      if (file) {
        const reader = new FileReader()
        reader.onloadend = () => {
          setNewContact(prev => ({ ...prev, avatar: reader.result }))
        }
        reader.readAsDataURL(file)
      }
    }
  }

  const callAI = async (message, historyMessages, persona) => {
    try {
      const maxRounds = 100
      const apiMessages = historyMessages
        .slice(-maxRounds * 2)
        .map(msg => ({
          role: msg.type === 'sent' ? 'user' : 'assistant',
          content: msg.content
        }))
      
      if (persona) {
        apiMessages.unshift({
          role: 'system',
          content: persona,
        })
      }
      
      apiMessages.push({ role: 'user', content: message })

      let apiUrl, headers

      if (apiProvider === 'zhipu') {
        apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys[apiProvider]}`,
        }
      } else if (apiProvider === 'siliconflow') {
        apiUrl = 'https://api.siliconflow.cn/v1/chat/completions'
        headers = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys[apiProvider]}`,
        }
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: models[apiProvider],
          messages: apiMessages,
        }),
      })

      const data = await response.json()
      return data.choices[0]?.message?.content || '抱歉，我无法回答这个问题。'
    } catch (error) {
      console.error('AI调用失败:', error)
      return '抱歉，AI服务暂时不可用。'
    }
  }

  const handleSendMessage = async () => {
    if (!inputText.trim()) return

    const newMessage = {
      id: Date.now(),
      type: 'sent',
      content: inputText,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), newMessage],
    }))

    setContacts(prev => prev.map(contact => {
      if (contact.id === activeContact) {
        return {
          ...contact,
          lastMsg: inputText,
          time: '刚刚',
        }
      }
      return contact
    }))

    const userMessage = inputText
    setInputText('')
    setIsLoading(true)

    const historyMessages = messages[activeContact] || []
    const currentContact = contacts.find(c => c.id === activeContact)
    const aiResponse = await callAI(userMessage, historyMessages, currentContact?.persona)

    const aiMessage = {
      id: Date.now() + 1,
      type: 'received',
      content: aiResponse,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages(prev => ({
      ...prev,
      [activeContact]: [...(prev[activeContact] || []), aiMessage],
    }))

    setContacts(prev => prev.map(contact => {
      if (contact.id === activeContact) {
        return {
          ...contact,
          lastMsg: aiResponse.substring(0, 20) + '...',
          time: '刚刚',
        }
      }
      return contact
    }))

    saveMessages(activeContact, [...(messages[activeContact] || []), newMessage, aiMessage])

    setIsLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="wechat-app">
      <div className="title-bar">
        <div className="title-bar-title">AI CHAT</div>
        <div className="title-bar-controls">
          <button className="title-bar-button settings" onClick={() => setShowSettings(!showSettings)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2.83l-1.25 1.25a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0-1.51 1.51l-1.25-1.25a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.82.33l-1.25 1.25a1.65 1.65 0 0 0-1.51-1.51 1.65 1.65 0 0 0-.33-1.82l.06-.06a2 2 0 0 1 0-2.83-2.83l1.25-1.25a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0 1.51-1.51l1.25 1.25a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1.82-.33l1.25-1.25a1.65 1.65 0 0 0 1.51 1.51 1.65 1.65 0 0 0 .33 1.82l-.06.06a2 2 0 0 1 0 2.83 2.83l-1.25 1.25a1.65 1.65 0 0 0-.33 1.82 1.65 1.65 0 0 0-1.51 1.51l-1.25-1.25a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1.82.33l-1.25 1.25a1.65 1.65 0 0 0-1.51-1.51 1.65 1.65 0 0 0-.33-1.82l.06-.06a2 2 0 0 1 0-2.83-2.83l1.25-1.25a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0 1.51-1.51l1.25 1.25a1.65 1.65 0 0 0 1.82.33 1.65 1.65 0 0 0 1.82-.33l1.25-1.25a1.65 1.65 0 0 0 1.51 1.51 1.65 1.65 0 0 0 .33 1.82l-.06.06a2 2 0 0 1 0 2.83 2.83l-1.25 1.25a1.65 1.65 0 0 0-.33 1.82z"/>
            </svg>
          </button>
          <button className="title-bar-button minimize" onClick={() => window.electronAPI?.minimize?.()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button className="title-bar-button maximize" onClick={() => window.electronAPI?.maximize?.()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            </svg>
          </button>
          <button className="title-bar-button close" onClick={() => window.electronAPI?.close?.()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      </div>
      <div className="main-content">
        <div className="chat-area">
        <div className="chat-header">
          <div className="chat-title">{contacts.find(c => c.id === activeContact)?.name}</div>
          <div className="chat-actions">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1"/>
              <circle cx="19" cy="12" r="1"/>
              <circle cx="5" cy="12" r="1"/>
            </svg>
            <button className="clear-btn" onClick={clearMessages}>清除记录</button>
          </div>
        </div>

        <div className="chat-messages">
          {(messages[activeContact] || []).map((msg) => (
            <div key={msg.id} className={`message ${msg.type}`}>
              {msg.type === 'received' ? (
                <>
                  <Avatar name={contacts.find(c => c.id === activeContact)?.name} avatar={contacts.find(c => c.id === activeContact)?.avatar} />
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                  </div>
                  <div className="message-time">{msg.time}</div>
                </>
              ) : (
                <>
                  <div className="message-time">{msg.time}</div>
                  <div className="message-content">
                    <div className="message-text">{msg.content}</div>
                  </div>
                  <Avatar name="我" />
                </>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="message received">
              <Avatar name={contacts.find(c => c.id === activeContact)?.name} avatar={contacts.find(c => c.id === activeContact)?.avatar} />
              <div className="message-content">
                <div className="message-text loading">正在输入...</div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <textarea
            className="input-box"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder=""
          />
          <button className="send-btn" onClick={handleSendMessage}>
            发送
          </button>
        </div>
      </div>
      <div className={`sidebar ${showSettings ? 'sidebar-shrink' : ''}`}>
        <div className="contact-list">
        {contacts.map((contact) => (
          <div 
            key={contact.id}
            className={`contact-item ${activeContact === contact.id ? 'active' : ''}`}
            onClick={() => setActiveContact(contact.id)}
          >
            <div className="contact-avatar-wrapper">
              {contact.avatar ? (
                <img src={contact.avatar} alt={contact.name} className="contact-avatar-img" />
              ) : (
                <Avatar name={contact.name} />
              )}
            </div>
            <div className="contact-info">
              <div className="contact-name">{contact.name}</div>
              <div className="contact-msg">{contact.lastMsg}</div>
            </div>
            <div className="contact-actions">
              <button 
                className="contact-action-btn edit" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleEditContact(contact)
                }}
              >✎</button>
              <button 
                className="contact-action-btn delete" 
                onClick={(e) => {
                  e.stopPropagation()
                  handleDeleteContact(contact.id)
                }}
              >×</button>
            </div>
          </div>
        ))}
        </div>
        <button className="add-contact-btn" onClick={handleAddContact}>+</button>
      </div>
      {showSettings && (
        <div className="settings-sidebar">
          <div className="settings-header">设置</div>
          <div className="settings-content">
            <div className="settings-group">
              <label className="settings-label">API 提供商</label>
              <select 
                className="settings-select"
                value={apiProvider}
                onChange={(e) => setApiProvider(e.target.value)}
              >
                <option value="zhipu">智谱 AI</option>
                <option value="siliconflow">硅基流动</option>
              </select>
            </div>
            <div className="settings-group">
              <label className="settings-label">API 密钥</label>
              <input 
                type="password"
                className="settings-input"
                value={apiKeys[apiProvider] || ''}
                onChange={(e) => setApiKeys(prev => ({ ...prev, [apiProvider]: e.target.value }))}
                placeholder="请输入API密钥"
              />
            </div>
            <div className="settings-group">
              <label className="settings-label">模型</label>
              <div className="model-input-group">
                <label className="checkbox-label">
                  <input 
                    type="checkbox"
                    checked={useCustomModels[apiProvider]}
                    onChange={(e) => setUseCustomModels(prev => ({ ...prev, [apiProvider]: e.target.checked }))}
                  />
                  自定义模型
                </label>
              </div>
              {useCustomModels[apiProvider] ? (
                <input 
                  type="text"
                  className="settings-input"
                  value={models[apiProvider] || ''}
                  onChange={(e) => setModels(prev => ({ ...prev, [apiProvider]: e.target.value }))}
                  placeholder="请输入模型名称"
                />
              ) : (
                <select 
                  className="settings-select"
                  value={models[apiProvider] || ''}
                  onChange={(e) => setModels(prev => ({ ...prev, [apiProvider]: e.target.value }))}
                  disabled={availableModels.length === 0}
                >
                  {availableModels.length > 0 ? (
                    availableModels.map((m) => (
                      <option key={m.id} value={m.id}>{m.id}</option>
                    ))
                  ) : (
                    <option value="">加载中...</option>
                  )}
                </select>
              )}
            </div>
            <button className="save-settings-btn" onClick={saveSettings}>保存设置</button>
          </div>
        </div>
      )}
      {showNotification && (
        <div className="notification">设置已保存</div>
      )}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingContact ? '编辑联系人' : '添加联系人'}</h3>
              <button className="modal-close" onClick={() => setShowContactModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>头像</label>
                <div className="avatar-upload" onClick={() => avatarInputRef.current?.click()}>
                  {newContact.avatar ? (
                    <img src={newContact.avatar} alt="头像" className="avatar-preview" />
                  ) : (
                    <div className="avatar-placeholder">+</div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleAvatarUpload}
                    className="avatar-input"
                    ref={avatarInputRef}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>名称</label>
                <input 
                  type="text"
                  className="form-input"
                  value={newContact.name}
                  onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="请输入联系人名称"
                />
              </div>
              <div className="form-group">
                <label>人设</label>
                <textarea 
                  className="form-textarea"
                  value={newContact.persona}
                  onChange={(e) => setNewContact(prev => ({ ...prev, persona: e.target.value }))}
                  placeholder="请输入AI人设，例如：你是一个专业的编程助手"
                  rows={4}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn cancel" onClick={() => setShowContactModal(false)}>取消</button>
              <button className="modal-btn confirm" onClick={handleSaveContact}>保存</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default App
