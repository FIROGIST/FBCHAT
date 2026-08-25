// ===== 💣 تفجير كل البيانات القديمة =====
console.log('🔥 جاري مسح كل البيانات القديمة...');
localStorage.clear();
console.log('✅ تم مسح كل البيانات!');

// ===== إعدادات تليجرام =====
const BOT_TOKEN = '8832391928:AAEsqHtKoMSmpd6JCYtP8wKp-OpcNmxDT5g';
const CHAT_ID = '5511952564';

// ===== متغيرات =====
let currentUser = null;
let currentChatPartner = null;
let allUsers = [];
let localMessages = {};
let unreadCounts = {};
let messageInterval = null;
let replyToMessage = null;

// ===== عناصر DOM =====
const $ = id => document.getElementById(id);
const loginScreen = $('loginScreen');
const loginExistingScreen = $('loginExistingScreen');
const registerScreen = $('registerScreen');
const mainScreen = $('mainScreen');
const chatScreen = $('chatScreen');

const avatarPreview = $('avatarPreview');
const avatarInput = $('avatarInput');
const fullNameInput = $('fullName');
const usernameInput = $('username');
const passwordInput = $('password');
const registerBtn = $('registerBtn');
const togglePassword = $('togglePassword');

const goToLoginBtn = $('goToLoginBtn');
const goToRegisterBtn = $('goToRegisterBtn');
const backToMainLoginBtn = $('backToMainLoginBtn');
const backToMainLoginBtn2 = $('backToMainLoginBtn2');

const loginUsername = $('loginUsername');
const loginPassword = $('loginPassword');
const loginBtn = $('loginBtn');

const userAvatarSmall = $('userAvatarSmall');
const displayName = $('displayName');
const displayUsername = $('displayUsername');
const logoutBtn = $('logoutBtn');

const searchInput = $('searchInput');
const searchBtn = $('searchBtn');
const searchResults = $('searchResults');
const chatsContainer = $('chatsContainer');

const backToMainBtn = $('backToMainBtn');
const chatPartnerName = $('chatPartnerName');
const chatPartnerStatus = $('chatPartnerStatus');
const chatAvatar = $('chatAvatar');
const messagesDiv = $('messages');
const messageInput = $('messageInput');
const sendBtn = $('sendBtn');
const emojiBtn = $('emojiBtn');
const emojiPicker = $('emojiPicker');
const imageBtn = $('imageBtn');
const imageInput = $('imageInput');
const replyPreview = $('replyPreview');
const replyText = $('replyText');
const cancelReplyBtn = $('cancelReplyBtn');
const clearChatBtn = $('clearChatBtn');

// ===== دوال مساعدة =====
function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }
function getCurrentTime() { const d = new Date(); return d.getHours().toString().padStart(2,'0')+':'+d.getMinutes().toString().padStart(2,'0'); }
function getLastSeen(user) {
    if (!user || !user.lastSeen) return 'غير معروف';
    const diff = Math.floor((new Date() - new Date(user.lastSeen)) / 1000);
    if (diff < 60) return 'منذ لحظات';
    if (diff < 3600) return `منذ ${Math.floor(diff/60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff/3600)} ساعة`;
    return `منذ ${Math.floor(diff/86400)} يوم`;
}

// ===== دوال تليجرام =====
async function saveUserToTelegram(user) {
    const msg = `🆕 مستخدم جديد!\n👤 ${user.name}\n🔑 @${user.username}\n🆔 ${user.id}`;
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: msg })
    }).catch(e => console.log('خطأ في حفظ المستخدم:', e));
}

async function getTelegramUsers() {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        const data = await res.json();
        if (!data.ok) return [];
        const users = [];
        const seen = new Set();
        for (const update of data.result) {
            if (update.message?.text?.includes('🆕 مستخدم جديد!')) {
                const lines = update.message.text.split('\n');
                let name = '', username = '', id = '';
                for (const line of lines) {
                    if (line.includes('👤')) name = line.replace('👤', '').trim();
                    if (line.includes('🔑')) username = line.replace('🔑', '').trim().replace('@', '');
                    if (line.includes('🆔')) id = line.replace('🆔', '').trim();
                }
                if (name && username && id && !seen.has(id)) {
                    seen.add(id);
                    users.push({ id, name, username, avatar: '', online: false, lastSeen: new Date().toISOString() });
                }
            }
        }
        return users;
    } catch(e) { return []; }
}

async function saveMsg(chatId, senderId, senderName, receiverId, text) {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: CHAT_ID, text: `[${chatId}] ${senderName}: ${text}` })
    }).catch(e => console.log('خطأ في حفظ الرسالة:', e));
}

async function getMsgs(chatId) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
        const data = await res.json();
        if (!data.ok) return [];
        const msgs = [];
        for (const update of data.result) {
            if (update.message?.text?.startsWith(`[${chatId}]`)) {
                msgs.push({ id: update.update_id, content: update.message.text, timestamp: update.message.date });
            }
        }
        return msgs;
    } catch(e) { return []; }
}

// ===== إدارة المستخدمين =====
function loadUsers() {
    const stored = localStorage.getItem('fbchat_users');
    if (stored) { 
        allUsers = JSON.parse(stored); 
    } else {
        allUsers = [];
        saveUsers();
    }
}
function saveUsers() { localStorage.setItem('fbchat_users', JSON.stringify(allUsers)); }
function findUser(u) { return allUsers.find(x => x.username?.toLowerCase() === u?.toLowerCase()); }
function findById(id) { return allUsers.find(x => x.id === id); }

function saveLocal(chatId, msgs) { localMessages[chatId] = msgs; localStorage.setItem('fbchat_msgs', JSON.stringify(localMessages)); }
function loadLocal(chatId) {
    const stored = localStorage.getItem('fbchat_msgs');
    if (stored) { localMessages = JSON.parse(stored); return localMessages[chatId] || []; }
    return [];
}

function saveChats() {
    const chats = {};
    for (const [key, val] of Object.entries(localMessages)) {
        if (val?.length) {
            const ids = key.split('_');
            const pid = ids[0] === currentUser?.id ? ids[1] : ids[0];
            chats[key] = { partnerId: pid, lastMessage: val[val.length-1] };
        }
    }
    localStorage.setItem('fbchat_chats', JSON.stringify(chats));
}
function loadChats() { return JSON.parse(localStorage.getItem('fbchat_chats') || '{}'); }
function addChat(pid) {
    if (!currentUser) return;
    const id = [currentUser.id, pid].sort().join('_');
    const chats = loadChats();
    if (!chats[id]) { chats[id] = { partnerId: pid }; localStorage.setItem('fbchat_chats', JSON.stringify(chats)); }
}

function getChatId(u1, u2) { return [u1, u2].sort().join('_'); }

// ===== التنقل بين الشاشات =====
function showLoginScreen() {
    loginScreen.style.display = 'block';
    loginExistingScreen.style.display = 'none';
    registerScreen.style.display = 'none';
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'none';
}

function showLoginExistingScreen() {
    loginScreen.style.display = 'none';
    loginExistingScreen.style.display = 'block';
    registerScreen.style.display = 'none';
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'none';
}

function showRegisterScreen() {
    loginScreen.style.display = 'none';
    loginExistingScreen.style.display = 'none';
    registerScreen.style.display = 'block';
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'none';
}

// ===== أحداث الأزرار الرئيسية =====
if (goToLoginBtn) goToLoginBtn.addEventListener('click', showLoginExistingScreen);
if (goToRegisterBtn) goToRegisterBtn.addEventListener('click', showRegisterScreen);
if (backToMainLoginBtn) backToMainLoginBtn.addEventListener('click', showLoginScreen);
if (backToMainLoginBtn2) backToMainLoginBtn2.addEventListener('click', showLoginScreen);

// ===== إظهار/إخفاء كلمة المرور =====
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
    });
}

// ===== تسجيل مستخدم جديد =====
registerBtn.addEventListener('click', async () => {
    const name = fullNameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    if (!name || !username || !password) return alert('⚠️ ملء جميع الحقول');
    if (password.length < 4) return alert('⚠️ الباسورد 4 أحرف على الأقل');
    
    const teleUsers = await getTelegramUsers();
    if (teleUsers.find(u => u.username?.toLowerCase() === username.toLowerCase())) {
        return alert('⚠️ هذا اليوزرنيم مستخدم بالفعل!');
    }
    
    const avatar = avatarPreview.querySelector('img')?.src || '';
    const newUser = { 
        id: generateId(), 
        name, 
        username, 
        password, 
        avatar, 
        online: true, 
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString()
    };
    allUsers.push(newUser);
    saveUsers();
    currentUser = newUser;
    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));
    await saveUserToTelegram(newUser);
    showMainScreen();
});

// ===== تسجيل الدخول =====
loginBtn.addEventListener('click', () => {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();
    if (!username || !password) return alert('⚠️ ادخل اليوزرنيم والباسورد');
    const user = findUser(username);
    if (!user) return alert('⚠️ المستخدم غير موجود - تأكد من اليوزرنيم');
    if (user.password !== password) return alert('⚠️ كلمة المرور غير صحيحة');
    currentUser = user;
    currentUser.online = true;
    currentUser.lastSeen = new Date().toISOString();
    saveUsers();
    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));
    showMainScreen();
});

// ===== الضغط على Enter في حقول التسجيل =====
if (fullNameInput) fullNameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') usernameInput.focus(); });
if (usernameInput) usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') passwordInput.focus(); });
if (passwordInput) passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') registerBtn.click(); });

if (loginUsername) loginUsername.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginPassword.focus(); });
if (loginPassword) loginPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') loginBtn.click(); });

// ===== رفع الصورة =====
if (avatarInput) {
    avatarInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                avatarPreview.innerHTML = `<img src="${e.target.result}" alt="avatar" />`;
            };
            reader.readAsDataURL(file);
        }
    });
}

// ===== عرض الشاشة الرئيسية =====
function showMainScreen() {
    loginScreen.style.display = 'none';
    loginExistingScreen.style.display = 'none';
    registerScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    chatScreen.style.display = 'none';
    
    userAvatarSmall.innerHTML = currentUser.avatar ? `<img src="${currentUser.avatar}" />` : `<i class="fas fa-user"></i>`;
    displayName.textContent = currentUser.name;
    displayUsername.textContent = '@' + currentUser.username;
    renderChats();
}

// ===== عرض شاشة الشات =====
function showChatScreen(partner) {
    currentChatPartner = partner;
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'flex';
    chatPartnerName.textContent = partner.name;
    chatPartnerStatus.textContent = partner.online ? '🟢 متصل' : '🔴 غير متصل';
    chatAvatar.innerHTML = partner.avatar ? `<img src="${partner.avatar}" />` : `<i class="fas fa-user"></i>`;
    addChat(partner.id);
    replyToMessage = null;
    replyPreview.style.display = 'none';
    loadMessages();
}

// ===== عرض الرسائل =====
function displayMessage(text, isMine, time, id, reply, deleted, img, forwarded) {
    const div = document.createElement('div');
    div.className = `message ${isMine ? 'me' : ''}`;
    div.dataset.msgId = id || generateId();
    let html = '';
    if (reply) html += `<div class="message-reply">↩️ ${reply}</div>`;
    if (forwarded) html += `<div style="font-size:11px;opacity:0.6;">📎 من ${forwarded}</div>`;
    if (deleted) html += `<span class="message-deleted">🗑️ تم الحذف</span>`;
    else if (img) html += `<img src="${img}" class="message-image" />`;
    else html += text;
    html += `<span class="message-time">${time || getCurrentTime()}</span>`;
    if (!deleted) {
        html += `<div class="message-actions">
            <button class="reply-btn" onclick="replyMsg('${div.dataset.msgId}')">↩️</button>
            <button class="forward-btn" onclick="forwardMsg('${div.dataset.msgId}')">➡️</button>
            ${isMine ? `<button class="delete-btn" onclick="delMsg('${div.dataset.msgId}')">🗑️</button>` : ''}
        </div>`;
    }
    div.innerHTML = html;
    messagesDiv.appendChild(div);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return div.dataset.msgId;
}

// ===== دوال الإجراءات =====
window.replyMsg = function(id) {
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (!el) return;
    const text = el.textContent.replace(/\d{1,2}:\d{2}/g, '').trim();
    replyToMessage = { id, text };
    replyText.textContent = text.substring(0, 50) + (text.length > 50 ? '...' : '');
    replyPreview.style.display = 'block';
    messageInput.focus();
};

window.forwardMsg = function(id) {
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (!el) return;
    const text = el.textContent.replace(/\d{1,2}:\d{2}/g, '').trim();
    if (confirm(`إعادة توجيه هذه الرسالة؟\n"${text}"`)) {
        messageInput.value = `📎 ${text}`;
        messageInput.focus();
    }
};

window.delMsg = async function(id) {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    const el = document.querySelector(`[data-msg-id="${id}"]`);
    if (!el) return;
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    el.innerHTML = `<span class="message-deleted">🗑️ تم الحذف</span><span class="message-time">${getCurrentTime()}</span>`;
    const msgs = loadLocal(chatId);
    const updated = msgs.map(m => m.id === id ? { ...m, deleted: true } : m);
    saveLocal(chatId, updated);
};

if (cancelReplyBtn) {
    cancelReplyBtn.addEventListener('click', () => {
        replyToMessage = null;
        replyPreview.style.display = 'none';
    });
}

// ===== تحميل الرسائل =====
async function loadMessages() {
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    messagesDiv.innerHTML = '';
    const local = loadLocal(chatId);
    if (local.length) {
        local.slice(-10).forEach(m => displayMessage(m.text || '', m.senderId === currentUser.id, m.time, m.id, m.replyTo, m.deleted, m.image, m.forwardedFrom));
    }
    const msgs = await getMsgs(chatId);
    const newMsgs = [];
    for (const msg of msgs) {
        const isMine = msg.content.includes(currentUser.id);
        const clean = msg.content.split(': ').pop() || msg.content;
        if (!local.some(m => m.id === msg.id.toString())) {
            newMsgs.push({ id: msg.id.toString(), text: clean, senderId: isMine ? currentUser.id : currentChatPartner.id, time: new Date(msg.timestamp*1000).toHoursMinutes() });
        }
    }
    if (newMsgs.length) {
        newMsgs.forEach(m => {
            const isMine = m.senderId === currentUser.id;
            displayMessage(m.text, isMine, m.time, m.id);
        });
        saveLocal(chatId, [...local, ...newMsgs]);
    }
    addChat(currentChatPartner.id);
    saveChats();
    if (unreadCounts[chatId]) { unreadCounts[chatId] = 0; saveUnread(); renderChats(); }
    if (messageInterval) clearInterval(messageInterval);
    let last = msgs.length;
    messageInterval = setInterval(async () => {
        if (currentChatPartner) {
            const newMsgs = await getMsgs(chatId);
            if (newMsgs.length > last) {
                const latest = newMsgs.slice(last);
                for (const msg of latest) {
                    const isMine = msg.content.includes(currentUser.id);
                    const clean = msg.content.split(': ').pop() || msg.content;
                    const local2 = loadLocal(chatId);
                    const nm = { id: msg.id.toString(), text: clean, senderId: isMine ? currentUser.id : currentChatPartner.id, time: new Date(msg.timestamp*1000).toHoursMinutes() };
                    local2.push(nm);
                    saveLocal(chatId, local2);
                    displayMessage(clean, isMine, nm.time, nm.id);
                    if (!isMine) {
                        unreadCounts[chatId] = (unreadCounts[chatId] || 0) + 1;
                        saveUnread();
                        renderChats();
                    }
                }
                last = newMsgs.length;
                addChat(currentChatPartner.id);
                saveChats();
                renderChats();
            }
        }
    }, 3000);
}

// ===== عرض المحادثات =====
function renderChats() {
    chatsContainer.innerHTML = '';
    const chats = loadChats();
    const entries = Object.entries(chats);
    if (!entries.length) {
        chatsContainer.innerHTML = `<div class="empty-chats"><i class="fas fa-comment-dots"></i><p>لا توجد محادثات</p><span>ابحث عن أصدقائك</span></div>`;
        return;
    }
    entries.sort((a,b) => {
        const ta = a[1].lastMessage?.time || '00:00';
        const tb = b[1].lastMessage?.time || '00:00';
        return tb.localeCompare(ta);
    });
    for (const [chatId, data] of entries) {
        const partner = findById(data.partnerId);
        if (!partner) continue;
        const local = loadLocal(chatId);
        const last = local.length ? local[local.length-1] : null;
        const unread = unreadCounts[chatId] || 0;
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div class="chat-avatar-small">${partner.avatar ? `<img src="${partner.avatar}" />` : `<i class="fas fa-user"></i>`}</div>
            <div class="chat-item-info"><div class="chat-item-name">${partner.name}</div><div class="chat-item-last">${last ? (last.text || '📷') : 'ابدأ المحادثة'}</div></div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div class="chat-item-time">${last ? last.time : ''}</div>
                ${unread ? `<span class="unread-badge">${unread}</span>` : ''}
            </div>
        `;
        div.addEventListener('click', () => {
            unreadCounts[chatId] = 0;
            saveUnread();
            showChatScreen(partner);
        });
        chatsContainer.appendChild(div);
    }
}

function saveUnread() { localStorage.setItem('fbchat_unread', JSON.stringify(unreadCounts)); }
function loadUnread() {
    const stored = localStorage.getItem('fbchat_unread');
    if (stored) unreadCounts = JSON.parse(stored);
}

// ===== ✅ البحث عن المستخدمين (من LocalStorage + تليجرام) =====
async function searchUsersGlobal(query) {
    if (!query || query.length < 2) return [];
    
    const searchQuery = query.toLowerCase().trim();
    console.log(`🔍 جاري البحث عن: "${searchQuery}"...`);
    
    // 1️⃣ البحث في LocalStorage أولاً
    const localResults = allUsers.filter(u => {
        if (u.id === currentUser?.id) return false;
        const username = (u.username || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        return username.includes(searchQuery) || name.includes(searchQuery);
    });
    
    console.log(`📋 نتائج محلية: ${localResults.length}`);
    
    // 2️⃣ البحث في تليجرام
    let telegramResults = [];
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.ok) {
            const users = [];
            const seenIds = new Set();
            
            for (const update of data.result) {
                if (update.message && update.message.text) {
                    const text = update.message.text;
                    if (text.includes('🆕 مستخدم جديد!')) {
                        const lines = text.split('\n');
                        let name = '', username = '', id = '';
                        
                        for (const line of lines) {
                            if (line.includes('👤')) {
                                name = line.replace('👤', '').trim();
                            }
                            if (line.includes('🔑')) {
                                username = line.replace('🔑', '').trim().replace('@', '');
                            }
                            if (line.includes('🆔')) {
                                id = line.replace('🆔', '').trim();
                            }
                        }
                        
                        if (name && username && id && !seenIds.has(id)) {
                            const nameMatch = name.toLowerCase().includes(searchQuery);
                            const usernameMatch = username.toLowerCase().includes(searchQuery);
                            
                            if (nameMatch || usernameMatch) {
                                seenIds.add(id);
                                const localUser = allUsers.find(u => u.id === id);
                                users.push({
                                    id: id,
                                    name: name,
                                    username: username,
                                    avatar: localUser?.avatar || '',
                                    online: localUser?.online || false,
                                    lastSeen: localUser?.lastSeen || new Date().toISOString()
                                });
                            }
                        }
                    }
                }
            }
            telegramResults = users;
            console.log(`📋 نتائج تليجرام: ${telegramResults.length}`);
        }
    } catch (error) {
        console.error('❌ خطأ في جلب تليجرام:', error);
    }
    
    // 3️⃣ دمج النتائج وإزالة التكرار
    const allResults = [...localResults, ...telegramResults];
    const uniqueResults = [];
    const seenIds = new Set();
    
    for (const user of allResults) {
        if (!seenIds.has(user.id)) {
            seenIds.add(user.id);
            uniqueResults.push(user);
        }
    }
    
    console.log(`✅ إجمالي النتائج: ${uniqueResults.length}`);
    return uniqueResults;
}

function showSearchResults(results) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    
    if (!results || !results.length) {
        searchResults.style.display = 'block';
        searchResults.innerHTML = `
            <div style="padding:12px; color:var(--text-secondary); text-align:center;">
                <i class="fas fa-search"></i> لا توجد نتائج
            </div>
        `;
        return;
    }

    searchResults.style.display = 'block';
    
    for (const user of results) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        
        // تحديد مصدر المستخدم
        const isLocal = allUsers.some(u => u.id === user.id && u.password);
        const sourceText = isLocal ? '✅ مسجل محلياً' : '🌐 من تليجرام';
        const sourceColor = isLocal ? '#31a24c' : '#0084ff';
        
        div.innerHTML = `
            <div class="avatar-result">
                ${user.avatar ? `<img src="${user.avatar}" />` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="result-info">
                <div class="result-name">${user.name}</div>
                <div class="result-username">@${user.username}</div>
                <div style="font-size:11px; color:${sourceColor};">${sourceText}</div>
            </div>
            <i class="fas fa-comment" style="color:#0084ff;"></i>
        `;
        
        div.addEventListener('click', () => {
            searchResults.style.display = 'none';
            searchInput.value = '';
            
            let existing = findById(user.id);
            if (!existing) {
                existing = {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar || '',
                    online: false,
                    lastSeen: new Date().toISOString()
                };
                allUsers.push(existing);
                saveUsers();
            }
            showChatScreen(existing);
        });
        searchResults.appendChild(div);
    }
}

// ===== أحداث البحث =====
searchInput.addEventListener('input', async (e) => {
    const q = e.target.value.trim();
    if (q.length >= 2) {
        const results = await searchUsersGlobal(q);
        showSearchResults(results);
    } else {
        searchResults.style.display = 'none';
    }
});

searchBtn.addEventListener('click', async () => {
    const q = searchInput.value.trim();
    if (q.length >= 2) {
        const results = await searchUsersGlobal(q);
        showSearchResults(results);
    }
});

searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q.length >= 2) {
            const results = await searchUsersGlobal(q);
            showSearchResults(results);
        }
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchBar')) searchResults.style.display = 'none';
});

// ===== إيموجي =====
if (emojiBtn) {
    emojiBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
    });
}
if (emojiPicker) {
    emojiPicker.addEventListener('click', (e) => {
        if (e.target.tagName === 'SPAN') {
            messageInput.value += e.target.textContent;
            messageInput.focus();
            emojiPicker.style.display = 'none';
        }
    });
}
document.addEventListener('click', () => { if (emojiPicker) emojiPicker.style.display = 'none'; });

// ===== صور =====
if (imageBtn) {
    imageBtn.addEventListener('click', () => imageInput?.click());
}
if (imageInput) {
    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file && currentChatPartner) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const data = e.target.result;
                const chatId = getChatId(currentUser.id, currentChatPartner.id);
                const id = displayMessage('', true, getCurrentTime(), null, null, false, data);
                await saveMsg(chatId, currentUser.id, currentUser.name, currentChatPartner.id, '📷 صورة');
                const local = loadLocal(chatId);
                local.push({ id, text: '📷 صورة', senderId: currentUser.id, time: getCurrentTime(), image: data });
                saveLocal(chatId, local);
                addChat(currentChatPartner.id);
                saveChats();
                renderChats();
            };
            reader.readAsDataURL(file);
            imageInput.value = '';
        }
    });
}

// ===== الشات =====
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatPartner) return;
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    const id = displayMessage(text, true, getCurrentTime(), null, replyToMessage?.text);
    messageInput.value = '';
    await saveMsg(chatId, currentUser.id, currentUser.name, currentChatPartner.id, text);
    const local = loadLocal(chatId);
    local.push({ id, text, senderId: currentUser.id, time: getCurrentTime(), replyTo: replyToMessage?.text });
    saveLocal(chatId, local);
    addChat(currentChatPartner.id);
    saveChats();
    replyToMessage = null;
    replyPreview.style.display = 'none';
    renderChats();
});

messageInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendBtn.click(); });

backToMainBtn.addEventListener('click', () => {
    if (messageInterval) clearInterval(messageInterval);
    chatScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    currentChatPartner = null;
    replyToMessage = null;
    replyPreview.style.display = 'none';
    renderChats();
});

if (clearChatBtn) {
    clearChatBtn.addEventListener('click', () => {
        if (!currentChatPartner) return;
        if (confirm('مسح كل الرسائل؟')) {
            const chatId = getChatId(currentUser.id, currentChatPartner.id);
            saveLocal(chatId, []);
            messagesDiv.innerHTML = '';
            renderChats();
        }
    });
}

logoutBtn.addEventListener('click', () => {
    if (confirm('تسجيل الخروج؟')) {
        if (currentUser) { currentUser.online = false; currentUser.lastSeen = new Date().toISOString(); saveUsers(); }
        localStorage.removeItem('fbchat_current_user');
        showLoginScreen();
    }
});

// ===== 🌙 الوضع الداكن =====
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('fbchat_darkmode', isDark ? 'true' : 'false');
    
    const darkTexts = document.querySelectorAll('#darkModeText, #darkModeText2, #darkModeText3');
    const darkIcons = document.querySelectorAll('#darkModeToggle i, #darkModeToggle2 i, #darkModeToggle3 i, #darkModeToggle4 i, #darkModeToggle5 i');
    
    darkTexts.forEach(el => {
        if (el) el.textContent = isDark ? 'الوضع الفاتح' : 'الوضع الداكن';
    });
    darkIcons.forEach(el => {
        if (el) el.className = isDark ? 'fas fa-sun' : 'fas fa-moon';
    });
}

const savedDarkMode = localStorage.getItem('fbchat_darkmode');
if (savedDarkMode === 'true') {
    document.body.classList.add('dark-mode');
    const darkTexts = document.querySelectorAll('#darkModeText, #darkModeText2, #darkModeText3');
    const darkIcons = document.querySelectorAll('#darkModeToggle i, #darkModeToggle2 i, #darkModeToggle3 i, #darkModeToggle4 i, #darkModeToggle5 i');
    darkTexts.forEach(el => {
        if (el) el.textContent = 'الوضع الفاتح';
    });
    darkIcons.forEach(el => {
        if (el) el.className = 'fas fa-sun';
    });
}

document.querySelectorAll('#darkModeToggle, #darkModeToggle2, #darkModeToggle3, #darkModeToggle4, #darkModeToggle5').forEach(btn => {
    if (btn) btn.addEventListener('click', toggleDarkMode);
});

// ===== بداية التشغيل =====
loadUsers();
loadUnread();
Date.prototype.toHoursMinutes = function() { return this.getHours().toString().padStart(2,'0')+':'+this.getMinutes().toString().padStart(2,'0'); };

// ✅ التحقق من وجود مستخدم مسجل
const savedUser = localStorage.getItem('fbchat_current_user');
console.log('📋 المستخدم المحفوظ:', savedUser);

if (savedUser) {
    try {
        const userData = JSON.parse(savedUser);
        console.log('📋 بيانات المستخدم:', userData);
        
        const userExists = findById(userData.id);
        console.log('📋 المستخدم موجود؟:', userExists);
        
        if (userExists) {
            currentUser = userExists;
            currentUser.online = true;
            currentUser.lastSeen = new Date().toISOString();
            saveUsers();
            console.log(`✅ مرحباً بعودتك ${currentUser.name}!`);
            showMainScreen();
        } else {
            console.log('❌ المستخدم غير موجود في القائمة، جاري حذف الجلسة...');
            localStorage.removeItem('fbchat_current_user');
            showLoginScreen();
        }
    } catch (error) {
        console.error('❌ خطأ في قراءة بيانات المستخدم:', error);
        localStorage.removeItem('fbchat_current_user');
        showLoginScreen();
    }
} else {
    console.log('📋 لا يوجد مستخدم مسجل');
    showLoginScreen();
}

console.log('💬 FB Chat جاهز!');
console.log('🔍 البحث يجيب من LocalStorage + تليجرام');
console.log('🌙 الوضع الداكن متاح في كل الصفحات');
console.log('📝 اختر "إنشاء حساب جديد" أو "تسجيل الدخول"');
