// ===== إعدادات تليجرام =====
const BOT_TOKEN = '8832391928:AAEsqHtKoMSmpd6JCYtP8wKp-OpcNmxDT5g';
const CHAT_ID = '5511952564';

// ===== متغيرات عامة =====
let currentUser = null;
let currentChatPartner = null;
let messageInterval = null;
let allUsers = [];
let replyToMessage = null;
let forwardMessage = null;
let localMessages = {};
let unreadCounts = {};
let lastMessageId = 0;

// ===== عناصر DOM =====
const loginScreen = document.getElementById('loginScreen');
const loginExistingScreen = document.getElementById('loginExistingScreen');
const mainScreen = document.getElementById('mainScreen');
const chatScreen = document.getElementById('chatScreen');

const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const togglePassword = document.getElementById('togglePassword');
const goToLoginBtn = document.getElementById('goToLoginBtn');

const loginUsername = document.getElementById('loginUsername');
const loginPassword = document.getElementById('loginPassword');
const loginBtn = document.getElementById('loginBtn');
const goToRegisterBtn = document.getElementById('goToRegisterBtn');

const userAvatarSmall = document.getElementById('userAvatarSmall');
const displayName = document.getElementById('displayName');
const displayUsername = document.getElementById('displayUsername');
const logoutBtn = document.getElementById('logoutBtn');

const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');
const chatsContainer = document.getElementById('chatsContainer');

const backToMainBtn = document.getElementById('backToMainBtn');
const chatPartnerName = document.getElementById('chatPartnerName');
const chatPartnerStatus = document.getElementById('chatPartnerStatus');
const chatAvatar = document.getElementById('chatAvatar');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');
const imageBtn = document.getElementById('imageBtn');
const imageInput = document.getElementById('imageInput');
const replyPreview = document.getElementById('replyPreview');
const replyText = document.getElementById('replyText');
const cancelReplyBtn = document.getElementById('cancelReplyBtn');
const clearChatBtn = document.getElementById('clearChatBtn');

// ===== دوال مساعدة =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

function getFullTime() {
    return new Date().toISOString();
}

function getLastSeen(user) {
    if (!user || !user.lastSeen) return 'غير معروف';
    const now = new Date();
    const last = new Date(user.lastSeen);
    const diff = Math.floor((now - last) / 1000);
    if (diff < 60) return 'منذ لحظات';
    if (diff < 3600) return `منذ ${Math.floor(diff / 60)} دقيقة`;
    if (diff < 86400) return `منذ ${Math.floor(diff / 3600)} ساعة`;
    return `منذ ${Math.floor(diff / 86400)} يوم`;
}

// ===== حفظ المحادثات محلياً =====
function saveChats() {
    const chats = {};
    for (const [key, value] of Object.entries(localMessages)) {
        if (value && value.length > 0) {
            const ids = key.split('_');
            const partnerId = ids[0] === currentUser?.id ? ids[1] : ids[0];
            chats[key] = {
                partnerId: partnerId,
                lastMessage: value[value.length - 1],
                count: value.length
            };
        }
    }
    localStorage.setItem('fbchat_chats', JSON.stringify(chats));
}

function loadChats() {
    const stored = localStorage.getItem('fbchat_chats');
    if (stored) {
        return JSON.parse(stored);
    }
    return {};
}

function addChat(partnerId) {
    if (!currentUser) return;
    const chatId = getChatId(currentUser.id, partnerId);
    const chats = loadChats();
    if (!chats[chatId]) {
        chats[chatId] = {
            partnerId: partnerId,
            lastMessage: null,
            count: 0
        };
        localStorage.setItem('fbchat_chats', JSON.stringify(chats));
    }
}

// ===== ✅ دوال تليجرام لتخزين المستخدمين =====

// حفظ مستخدم جديد في تليجرام
async function saveUserToTelegram(user) {
    const message = `🆕 مستخدم جديد!\n\n👤 الاسم: ${user.name}\n🔑 اليوزرنيم: @${user.username}\n🆔 المعرف: ${user.id}\n🌍 الدولة: ${user.country || 'غير معروف'}\n📅 الوقت: ${new Date().toLocaleString('ar-EG')}`;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
        console.log('✅ تم حفظ المستخدم في تليجرام');
    } catch (error) {
        console.error('خطأ في حفظ المستخدم:', error);
    }
}

// جلب كل المستخدمين من تليجرام
async function fetchAllUsersFromTelegram() {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
    
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.ok) {
            console.log('❌ خطأ في جلب المستخدمين');
            return [];
        }
        
        const users = [];
        const uniqueIds = new Set();
        
        for (const update of data.result) {
            if (update.message && update.message.text) {
                const text = update.message.text;
                // البحث عن رسائل تسجيل المستخدمين الجدد
                if (text.includes('🆕 مستخدم جديد!')) {
                    const lines = text.split('\n');
                    let name = '', username = '', id = '';
                    for (const line of lines) {
                        if (line.includes('👤 الاسم:')) {
                            name = line.replace('👤 الاسم:', '').trim();
                        }
                        if (line.includes('🔑 اليوزرنيم:')) {
                            username = line.replace('🔑 اليوزرنيم:', '').trim().replace('@', '');
                        }
                        if (line.includes('🆔 المعرف:')) {
                            id = line.replace('🆔 المعرف:', '').trim();
                        }
                    }
                    if (name && username && id && !uniqueIds.has(id)) {
                        uniqueIds.add(id);
                        // البحث عن المستخدم في localStorage عشان نجيب الصورة
                        const localUser = allUsers.find(u => u.id === id);
                        users.push({
                            id: id,
                            name: name,
                            username: username,
                            avatar: localUser?.avatar || '',
                            online: false,
                            lastSeen: new Date().toISOString()
                        });
                    }
                }
            }
        }
        
        console.log(`📋 تم جلب ${users.length} مستخدم من تليجرام`);
        return users;
    } catch (error) {
        console.error('خطأ في جلب المستخدمين:', error);
        return [];
    }
}

// ===== دوال تليجرام الأساسية =====
async function notifyNewUser(user) {
    const message = `🆕 مستخدم جديد سجل في FB Chat!\n\n👤 الاسم: ${user.name}\n🔑 اليوزرنيم: @${user.username}\n🆔 المعرف: ${user.id}\n📅 الوقت: ${new Date().toLocaleString('ar-EG')}`;
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });
    } catch (error) {
        console.error('خطأ في إرسال إشعار المستخدم:', error);
    }
}

async function saveMessageToTelegram(chatId, senderId, senderName, receiverId, msgText, msgType = 'text', replyTo = null, forwardedFrom = null) {
    let fullText = `[CHAT_${chatId}] ${senderName} (${senderId}) ➜ ${receiverId}: `;
    
    if (replyTo) {
        fullText += `[رد على: "${replyTo}"] `;
    }
    if (forwardedFrom) {
        fullText += `[معاد توجيهه من ${forwardedFrom}] `;
    }
    
    fullText += msgText;
    
    if (msgType === 'image') {
        fullText = `[CHAT_${chatId}] ${senderName} (${senderId}) ➜ ${receiverId}: 📷 [صورة]`;
    }
    
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: fullText,
                parse_mode: 'HTML'
            })
        });
        return await response.json();
    } catch (error) {
        console.error('خطأ في الإرسال:', error);
        return false;
    }
}

async function deleteMessageFromTelegram(chatId, messageId) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: `[CHAT_${chatId}] [تم حذف رسالة]`,
                parse_mode: 'HTML'
            })
        });
        return true;
    } catch (error) {
        console.error('خطأ في حذف الرسالة:', error);
        return false;
    }
}

async function fetchMessagesFromTelegram(chatId) {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (!data.ok) return [];

        const messages = [];
        for (const update of data.result) {
            if (update.message && update.message.text) {
                const text = update.message.text;
                if (text.startsWith(`[CHAT_${chatId}]`)) {
                    const content = text.substring(text.indexOf(']') + 1).trim();
                    messages.push({
                        id: update.update_id,
                        content: content,
                        timestamp: update.message.date
                    });
                }
            }
        }
        return messages;
    } catch (error) {
        console.error('خطأ في الجلب:', error);
        return [];
    }
}

// ===== إدارة المستخدمين =====
function loadUsers() {
    const stored = localStorage.getItem('fbchat_users');
    if (stored) {
        allUsers = JSON.parse(stored);
        if (currentUser) {
            allUsers.forEach(u => {
                if (u.id !== currentUser.id) {
                    u.online = false;
                }
            });
            saveUsers();
        }
    } else {
        // مستخدمين تجريبيين للبداية
        allUsers = [
            { 
                id: 'demo1_' + Date.now(), 
                name: 'أحمد محمد', 
                username: 'ahmed_123', 
                password: '1234', 
                avatar: '', 
                online: true,
                lastSeen: new Date().toISOString(),
                createdAt: new Date().toISOString()
            },
            { 
                id: 'demo2_' + Date.now(), 
                name: 'سارة علي', 
                username: 'sara_456', 
                password: '1234', 
                avatar: '', 
                online: true,
                lastSeen: new Date().toISOString(),
                createdAt: new Date().toISOString()
            }
        ];
        saveUsers();
    }
}

function saveUsers() {
    localStorage.setItem('fbchat_users', JSON.stringify(allUsers));
}

function findUserByUsername(username) {
    return allUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
}

function findUserById(id) {
    return allUsers.find(u => u.id === id);
}

// ===== حفظ محلي للرسائل =====
function saveLocalMessages(chatId, messages) {
    localMessages[chatId] = messages;
    localStorage.setItem('fbchat_local_messages', JSON.stringify(localMessages));
}

function loadLocalMessages(chatId) {
    const stored = localStorage.getItem('fbchat_local_messages');
    if (stored) {
        localMessages = JSON.parse(stored);
        return localMessages[chatId] || [];
    }
    return [];
}

// ===== عدد غير مقروء =====
function saveUnreadCounts() {
    localStorage.setItem('fbchat_unread', JSON.stringify(unreadCounts));
}

function loadUnreadCounts() {
    const stored = localStorage.getItem('fbchat_unread');
    if (stored) {
        unreadCounts = JSON.parse(stored);
    }
}

// ===== دوال الواجهة =====
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

goToLoginBtn.addEventListener('click', () => {
    loginScreen.style.display = 'none';
    loginExistingScreen.style.display = 'block';
});

async function registerUser() {
    const name = fullNameInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!name || !username || !password) {
        alert('⚠️ الرجاء ملء جميع الحقول');
        return;
    }

    if (password.length < 4) {
        alert('⚠️ كلمة المرور يجب أن تكون 4 أحرف على الأقل');
        return;
    }

    // ✅ التحقق من تليجرام (السيرفر المركزي)
    const allUsersFromTelegram = await fetchAllUsersFromTelegram();
    const existingUser = allUsersFromTelegram.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (existingUser) {
        alert('⚠️ هذا اليوزرنيم مستخدم بالفعل!');
        return;
    }

    let avatar = '';
    const avatarImg = avatarPreview.querySelector('img');
    if (avatarImg) {
        avatar = avatarImg.src;
    }

    const newUser = {
        id: generateId(),
        name: name,
        username: username,
        password: password,
        avatar: avatar,
        online: true,
        lastSeen: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        country: 'مصر' // يمكن إضافة API لتحديد الدولة
    };

    // حفظ محلياً
    allUsers.push(newUser);
    saveUsers();
    currentUser = newUser;
    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));

    // ✅ حفظ في تليجرام (السيرفر المركزي)
    await saveUserToTelegram(newUser);
    await notifyNewUser(newUser);

    showMainScreen();
}

function loginUser() {
    const username = loginUsername.value.trim();
    const password = loginPassword.value.trim();

    if (!username || !password) {
        alert('⚠️ الرجاء إدخال اليوزرنيم وكلمة المرور');
        return;
    }

    const user = findUserByUsername(username);
    if (!user) {
        alert('⚠️ المستخدم غير موجود');
        return;
    }

    if (user.password !== password) {
        alert('⚠️ كلمة المرور غير صحيحة');
        return;
    }

    currentUser = user;
    currentUser.online = true;
    currentUser.lastSeen = new Date().toISOString();
    saveUsers();
    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));
    showMainScreen();
}

function showMainScreen() {
    loginScreen.style.display = 'none';
    loginExistingScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    chatScreen.style.display = 'none';

    if (currentUser.avatar) {
        userAvatarSmall.innerHTML = `<img src="${currentUser.avatar}" alt="avatar" />`;
    } else {
        userAvatarSmall.innerHTML = `<i class="fas fa-user"></i>`;
    }
    displayName.textContent = currentUser.name;
    displayUsername.textContent = '@' + currentUser.username;

    renderChats();
}

function showChatScreen(partner) {
    currentChatPartner = partner;
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'flex';

    chatPartnerName.textContent = partner.name;
    updatePartnerStatus();
    
    if (partner.avatar) {
        chatAvatar.innerHTML = `<img src="${partner.avatar}" alt="avatar" />`;
    } else {
        chatAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    }

    addChat(partner.id);

    replyToMessage = null;
    replyPreview.style.display = 'none';
    
    loadChatMessages();
}

function updatePartnerStatus() {
    if (!currentChatPartner) return;
    if (currentChatPartner.online) {
        chatPartnerStatus.textContent = '🟢 متصل الآن';
        chatPartnerStatus.style.color = '#31a24c';
    } else {
        chatPartnerStatus.textContent = `🔴 آخر ظهور ${getLastSeen(currentChatPartner)}`;
        chatPartnerStatus.style.color = '#65676b';
    }
}

function displayMessage(text, isMine = false, time = null, msgId = null, replyTextContent = null, isDeleted = false, imageSrc = null, forwardedFrom = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMine ? 'me' : ''}`;
    msgDiv.dataset.msgId = msgId || generateId();
    
    let content = '';
    
    if (replyTextContent) {
        content += `<div class="message-reply">↩️ ${replyTextContent}</div>`;
    }
    
    if (forwardedFrom) {
        content += `<div style="font-size:11px; opacity:0.6; margin-bottom:4px;">📎 معاد توجيهه من ${forwardedFrom}</div>`;
    }
    
    if (isDeleted) {
        content += `<span class="message-deleted">🗑️ تم حذف هذه الرسالة</span>`;
    } else if (imageSrc) {
        content += `<img src="${imageSrc}" class="message-image" />`;
    } else {
        content += text;
    }
    
    content += `<span class="message-time">${time || getCurrentTime()}</span>`;
    
    if (!isDeleted) {
        content += `
            <div class="message-actions">
                <button class="reply-btn" title="رد" onclick="window.replyToMessageFunc('${msgDiv.dataset.msgId}')">↩️</button>
                <button class="forward-btn" title="إعادة توجيه" onclick="window.forwardMessageFunc('${msgDiv.dataset.msgId}')">➡️</button>
                ${isMine ? `<button class="delete-btn" title="حذف" onclick="window.deleteMessageFunc('${msgDiv.dataset.msgId}')">🗑️</button>` : ''}
            </div>
        `;
    }
    
    msgDiv.innerHTML = content;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    return msgDiv.dataset.msgId;
}

// دوال الإجراءات
window.replyToMessageFunc = function(msgId) {
    const msgElement = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!msgElement) return;
    const text = msgElement.textContent.replace(/\d{1,2}:\d{2}/g, '').trim();
    replyToMessage = { id: msgId, text: text };
    replyText.textContent = text.substring(0, 50) + (text.length > 50 ? '...' : '');
    replyPreview.style.display = 'block';
    messageInput.focus();
};

window.forwardMessageFunc = function(msgId) {
    const msgElement = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!msgElement) return;
    const text = msgElement.textContent.replace(/\d{1,2}:\d{2}/g, '').trim();
    if (confirm(`إعادة توجيه هذه الرسالة؟\n\n"${text}"`)) {
        forwardMessage = { id: msgId, text: text };
        messageInput.value = `📎 [معاد توجيهه] ${text}`;
        messageInput.focus();
    }
};

window.deleteMessageFunc = async function(msgId) {
    if (!confirm('هل تريد حذف هذه الرسالة؟')) return;
    const msgElement = document.querySelector(`[data-msg-id="${msgId}"]`);
    if (!msgElement) return;
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    await deleteMessageFromTelegram(chatId, msgId);
    msgElement.innerHTML = `
        <span class="message-deleted">🗑️ تم حذف هذه الرسالة</span>
        <span class="message-time">${getCurrentTime()}</span>
    `;
    const localMsgs = loadLocalMessages(chatId);
    const updated = localMsgs.map(m => {
        if (m.id === msgId) {
            return { ...m, deleted: true };
        }
        return m;
    });
    saveLocalMessages(chatId, updated);
};

cancelReplyBtn.addEventListener('click', () => {
    replyToMessage = null;
    replyPreview.style.display = 'none';
});

async function loadChatMessages() {
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    messagesDiv.innerHTML = '';

    const localMsgs = loadLocalMessages(chatId);
    if (localMsgs.length > 0) {
        const recent = localMsgs.slice(-10);
        for (const msg of recent) {
            displayMessage(
                msg.text || '',
                msg.senderId === currentUser.id,
                msg.time,
                msg.id,
                msg.replyTo,
                msg.deleted || false,
                msg.image || null,
                msg.forwardedFrom || null
            );
        }
    }

    const messages = await fetchMessagesFromTelegram(chatId);
    const newMessages = [];
    
    for (const msg of messages) {
        const content = msg.content;
        const isMine = content.includes(currentUser.id);
        const cleanText = content.split(': ').pop() || content;
        
        const exists = localMsgs.some(m => m.id === msg.id.toString());
        if (!exists) {
            newMessages.push({
                id: msg.id.toString(),
                text: cleanText,
                senderId: isMine ? currentUser.id : currentChatPartner.id,
                time: new Date(msg.timestamp * 1000).toHoursMinutes(),
                deleted: false
            });
        }
    }
    
    if (newMessages.length > 0) {
        for (const msg of newMessages) {
            const isMine = msg.senderId === currentUser.id;
            displayMessage(msg.text, isMine, msg.time, msg.id);
        }
        const allMsgs = [...localMsgs, ...newMessages];
        saveLocalMessages(chatId, allMsgs);
    }

    addChat(currentChatPartner.id);
    saveChats();

    if (unreadCounts[chatId]) {
        unreadCounts[chatId] = 0;
        saveUnreadCounts();
        renderChats();
    }

    if (messageInterval) clearInterval(messageInterval);
    let lastCount = messages.length;
    messageInterval = setInterval(async () => {
        if (currentChatPartner) {
            const newMessages = await fetchMessagesFromTelegram(chatId);
            if (newMessages.length > lastCount) {
                const latestMsgs = newMessages.slice(lastCount);
                for (const msg of latestMsgs) {
                    const content = msg.content;
                    const isMine = content.includes(currentUser.id);
                    const cleanText = content.split(': ').pop() || content;
                    
                    const localMsgs2 = loadLocalMessages(chatId);
                    const newMsg = {
                        id: msg.id.toString(),
                        text: cleanText,
                        senderId: isMine ? currentUser.id : currentChatPartner.id,
                        time: new Date(msg.timestamp * 1000).toHoursMinutes(),
                        deleted: false
                    };
                    localMsgs2.push(newMsg);
                    saveLocalMessages(chatId, localMsgs2);
                    
                    displayMessage(cleanText, isMine, newMsg.time, newMsg.id);
                    
                    if (!isMine && chatScreen.style.display !== 'none') {
                        unreadCounts[chatId] = (unreadCounts[chatId] || 0) + 1;
                        saveUnreadCounts();
                        renderChats();
                    }
                }
                lastCount = newMessages.length;
                addChat(currentChatPartner.id);
                saveChats();
                renderChats();
            }
        }
    }, 3000);
}

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function renderChats() {
    chatsContainer.innerHTML = '';
    
    const savedChats = loadChats();
    const chatEntries = Object.entries(savedChats);
    
    if (chatEntries.length === 0) {
        chatsContainer.innerHTML = `
            <div class="empty-chats">
                <i class="fas fa-comment-dots"></i>
                <p>لا توجد محادثات بعد</p>
                <span>ابحث عن أصدقائك وابدأ الدردشة</span>
            </div>
        `;
        return;
    }
    
    chatEntries.sort((a, b) => {
        const timeA = a[1].lastMessage?.time || '00:00';
        const timeB = b[1].lastMessage?.time || '00:00';
        return timeB.localeCompare(timeA);
    });
    
    for (const [chatId, chatData] of chatEntries) {
        const partner = findUserById(chatData.partnerId);
        if (!partner) continue;
        
        const div = document.createElement('div');
        div.className = 'chat-item';
        
        const localMsgs = loadLocalMessages(chatId);
        const lastMsg = localMsgs.length > 0 ? localMsgs[localMsgs.length - 1] : null;
        const unread = unreadCounts[chatId] || 0;
        
        div.innerHTML = `
            <div class="chat-avatar-small">
                ${partner.avatar ? `<img src="${partner.avatar}" />` : `<i class="fas fa-user"></i>`}
                ${partner.online ? '<div style="width:10px;height:10px;background:#31a24c;border-radius:50%;position:absolute;bottom:0;right:0;border:2px solid #fff;"></div>' : ''}
            </div>
            <div class="chat-item-info">
                <div class="chat-item-name">${partner.name}</div>
                <div class="chat-item-last">${lastMsg ? (lastMsg.text || '📷 صورة') : 'ابدأ المحادثة'}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div class="chat-item-time">${lastMsg ? lastMsg.time : ''}</div>
                ${unread > 0 ? `<span class="unread-badge">${unread}</span>` : ''}
            </div>
        `;
        
        div.addEventListener('click', () => {
            const chatId2 = getChatId(currentUser.id, partner.id);
            unreadCounts[chatId2] = 0;
            saveUnreadCounts();
            showChatScreen(partner);
        });
        chatsContainer.appendChild(div);
    }
}

// ===== ✅ البحث عن المستخدمين (جلب من تليجرام) =====
async function searchUsersGlobal(query) {
    if (!query || query.length < 2) return [];
    
    // جلب كل المستخدمين من تليجرام
    const telegramUsers = await fetchAllUsersFromTelegram();
    
    // دمج مع المستخدمين المحليين
    const allUsersList = [...allUsers, ...telegramUsers];
    
    // إزالة التكرار
    const uniqueUsers = [];
    const seenIds = new Set();
    for (const user of allUsersList) {
        if (!seenIds.has(user.id)) {
            seenIds.add(user.id);
            uniqueUsers.push(user);
        }
    }
    
    const searchQuery = query.toLowerCase().trim();
    const results = uniqueUsers.filter(u => {
        if (u.id === currentUser.id) return false;
        const username = (u.username || '').toLowerCase();
        const name = (u.name || '').toLowerCase();
        return username.includes(searchQuery) || name.includes(searchQuery);
    });
    
    console.log(`🔍 تم العثور على ${results.length} نتيجة للبحث عن "${query}"`);
    return results;
}

function showSearchResults(results) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    
    if (!results || results.length === 0) {
        searchResults.style.display = 'block';
        searchResults.innerHTML = `
            <div style="padding:12px 16px; color:#65676b; text-align:center;">
                <i class="fas fa-search"></i> لا توجد نتائج لبحثك
            </div>
        `;
        return;
    }

    searchResults.style.display = 'block';
    
    for (const user of results) {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.innerHTML = `
            <div class="avatar-result">
                ${user.avatar ? `<img src="${user.avatar}" />` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="result-info">
                <div class="result-name">${user.name}</div>
                <div class="result-username">@${user.username}</div>
                ${user.online ? '<div style="font-size:11px;color:#31a24c;">🟢 متصل</div>' : `<div style="font-size:11px;color:#65676b;">${getLastSeen(user)}</div>`}
            </div>
            <i class="fas fa-comment" style="color:#0084ff;"></i>
        `;
        div.addEventListener('click', () => {
            searchResults.style.display = 'none';
            searchInput.value = '';
            
            // التأكد من وجود المستخدم في القائمة المحلية
            let existingUser = findUserById(user.id);
            if (!existingUser) {
                // إضافة المستخدم من تليجرام إلى القائمة المحلية
                existingUser = {
                    id: user.id,
                    name: user.name,
                    username: user.username,
                    avatar: user.avatar || '',
                    online: false,
                    lastSeen: new Date().toISOString()
                };
                allUsers.push(existingUser);
                saveUsers();
            }
            
            showChatScreen(existingUser);
        });
        searchResults.appendChild(div);
    }
}

// ===== الأحداث =====
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

registerBtn.addEventListener('click', registerUser);
loginBtn.addEventListener('click', loginUser);

goToRegisterBtn.addEventListener('click', () => {
    loginExistingScreen.style.display = 'none';
    loginScreen.style.display = 'block';
});

fullNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') usernameInput.focus();
});
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') passwordInput.focus();
});
passwordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') registerBtn.click();
});

loginUsername.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginPassword.focus();
});
loginPassword.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

// ===== ✅ البحث (جلب من تليجرام) =====
searchInput.addEventListener('input', async (e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) {
        const results = await searchUsersGlobal(query);
        showSearchResults(results);
    } else {
        searchResults.style.display = 'none';
    }
});

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
        const results = await searchUsersGlobal(query);
        showSearchResults(results);
    }
});

// البحث بالضغط على Enter
searchInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query.length >= 2) {
            const results = await searchUsersGlobal(query);
            showSearchResults(results);
        }
    }
});

document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchBar')) {
        searchResults.style.display = 'none';
    }
});

// ===== إيموجي =====
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.style.display = emojiPicker.style.display === 'none' ? 'flex' : 'none';
});

emojiPicker.addEventListener('click', (e) => {
    if (e.target.tagName === 'SPAN') {
        messageInput.value += e.target.textContent;
        messageInput.focus();
        emojiPicker.style.display = 'none';
    }
});

document.addEventListener('click', () => {
    emojiPicker.style.display = 'none';
});

// ===== صور =====
imageBtn.addEventListener('click', () => imageInput.click());

imageInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file && currentChatPartner) {
        const reader = new FileReader();
        reader.onload = async (e) => {
            const imgData = e.target.result;
            const chatId = getChatId(currentUser.id, currentChatPartner.id);
            
            const msgId = displayMessage('', true, getCurrentTime(), null, null, false, imgData);
            
            await saveMessageToTelegram(
                chatId, 
                currentUser.id, 
                currentUser.name, 
                currentChatPartner.id, 
                '📷 صورة',
                'image'
            );
            
            const localMsgs = loadLocalMessages(chatId);
            localMsgs.push({
                id: msgId,
                text: '📷 صورة',
                senderId: currentUser.id,
                time: getCurrentTime(),
                image: imgData,
                deleted: false
            });
            saveLocalMessages(chatId, localMsgs);
            
            addChat(currentChatPartner.id);
            saveChats();
            renderChats();
        };
        reader.readAsDataURL(file);
        imageInput.value = '';
    }
});

// ===== الشات =====
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatPartner) return;

    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    let replyTextContent = null;
    let forwardedFrom = null;
    
    if (text.startsWith('📎 [معاد توجيهه]')) {
        forwardedFrom = 'مستخدم آخر';
    }
    
    const msgId = displayMessage(
        text, 
        true, 
        getCurrentTime(), 
        null, 
        replyToMessage ? replyToMessage.text : null,
        false,
        null,
        forwardedFrom
    );
    
    messageInput.value = '';
    
    await saveMessageToTelegram(
        chatId, 
        currentUser.id, 
        currentUser.name, 
        currentChatPartner.id, 
        text,
        'text',
        replyToMessage ? replyToMessage.text : null,
        forwardedFrom
    );
    
    const localMsgs = loadLocalMessages(chatId);
    localMsgs.push({
        id: msgId,
        text: text,
        senderId: currentUser.id,
        time: getCurrentTime(),
        replyTo: replyToMessage ? replyToMessage.text : null,
        forwardedFrom: forwardedFrom,
        deleted: false
    });
    saveLocalMessages(chatId, localMsgs);
    
    addChat(currentChatPartner.id);
    saveChats();
    
    replyToMessage = null;
    replyPreview.style.display = 'none';
    forwardMessage = null;
    
    renderChats();
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

backToMainBtn.addEventListener('click', () => {
    if (messageInterval) clearInterval(messageInterval);
    chatScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    currentChatPartner = null;
    replyToMessage = null;
    replyPreview.style.display = 'none';
    renderChats();
});

clearChatBtn.addEventListener('click', () => {
    if (!currentChatPartner) return;
    if (confirm('هل تريد مسح كل الرسائل المحلية؟')) {
        const chatId = getChatId(currentUser.id, currentChatPartner.id);
        localMessages[chatId] = [];
        saveLocalMessages(chatId, []);
        messagesDiv.innerHTML = '';
        renderChats();
    }
});

logoutBtn.addEventListener('click', () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        if (currentUser) {
            currentUser.online = false;
            currentUser.lastSeen = new Date().toISOString();
            saveUsers();
        }
        localStorage.removeItem('fbchat_current_user');
        location.reload();
    }
});

// ===== بداية التشغيل =====
loadUsers();
loadUnreadCounts();

Date.prototype.toHoursMinutes = function() {
    return this.getHours().toString().padStart(2, '0') + ':' + 
           this.getMinutes().toString().padStart(2, '0');
};

const savedUser = localStorage.getItem('fbchat_current_user');
if (savedUser) {
    const userData = JSON.parse(savedUser);
    const userExists = findUserById(userData.id);
    if (userExists) {
        currentUser = userExists;
        currentUser.online = true;
        currentUser.lastSeen = new Date().toISOString();
        saveUsers();
        showMainScreen();
    } else {
        localStorage.removeItem('fbchat_current_user');
        loginScreen.style.display = 'none';
        loginExistingScreen.style.display = 'block';
    }
} else {
    loginScreen.style.display = 'block';
    loginExistingScreen.style.display = 'none';
}

console.log('💬 FB Chat - النسخة النهائية (مع تخزين المستخدمين في تليجرام)');
console.log('👥 عدد المستخدمين المحليين:', allUsers.length);
console.log('🔑 مستخدمين جاهزين: ahmed_123 / sara_456 (باسورد: 1234)');
console.log('🌍 أي مستخدم يسجل هيظهر في البحث عند الجميع!');
