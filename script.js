// ===== إعدادات تليجرام =====
const BOT_TOKEN = '8832391928:AAEsqHtKoMSmpd6JCYtP8wKp-OpcNmxDT5g';
const CHAT_ID = '5511952564';

// ===== متغيرات عامة =====
let currentUser = null;
let currentChatPartner = null;
let messageInterval = null;
let allUsers = [];
let replyToMessage = null; // للرد
let forwardMessage = null; // لإعادة التوجيه
let localMessages = {}; // حفظ محلي
let unreadCounts = {}; // عدد غير مقروء
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

// ===== دوال تليجرام =====
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
    // تليجرام لا يدعم حذف رسائل محددة من getUpdates
    // هنضيف علامة محذوفة في الرسالة نفسها
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
        // تحديث حالة الاتصال
        allUsers.forEach(u => {
            if (u.id !== currentUser?.id) {
                u.online = false;
            }
        });
        saveUsers();
    } else {
        allUsers = [];
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

// ===== حفظ محلي =====
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

// ===== دوال الواجهة =====
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
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

    if (findUserByUsername(username)) {
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
        createdAt: new Date().toISOString()
    };

    allUsers.push(newUser);
    saveUsers();
    currentUser = newUser;

    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));
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

    // reset reply
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

function displayMessage(text, isMine = false, time = null, msgId = null, replyText = null, isDeleted = false, imageSrc = null, forwardedFrom = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMine ? 'me' : ''}`;
    msgDiv.dataset.msgId = msgId || generateId();
    
    let content = '';
    
    // معاينة الرد
    if (replyText) {
        content += `<div class="message-reply">↩️ ${replyText}</div>`;
    }
    
    // إعادة توجيه
    if (forwardedFrom) {
        content += `<div style="font-size:11px; opacity:0.6; margin-bottom:4px;">📎 معاد توجيهه من ${forwardedFrom}</div>`;
    }
    
    // المحتوى
    if (isDeleted) {
        content += `<span class="message-deleted">🗑️ تم حذف هذه الرسالة</span>`;
    } else if (imageSrc) {
        content += `<img src="${imageSrc}" class="message-image" />`;
    } else {
        content += text;
    }
    
    content += `<span class="message-time">${time || getCurrentTime()}</span>`;
    
    // أزرار الإجراءات (لغير المحذوفة)
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

// دوال الإجراءات (معرفة على window)
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
    // عرض الرسالة كمحذوفة
    msgElement.innerHTML = `
        <span class="message-deleted">🗑️ تم حذف هذه الرسالة</span>
        <span class="message-time">${getCurrentTime()}</span>
    `;
    // حفظ محلي
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

    // تحميل من المحلي أولاً
    const localMsgs = loadLocalMessages(chatId);
    if (localMsgs.length > 0) {
        // عرض الـ 10 رسائل الأخيرة فقط (تحميل تدريجي)
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

    // جلب من تليجرام
    const messages = await fetchMessagesFromTelegram(chatId);
    const newMessages = [];
    
    for (const msg of messages) {
        // تحليل الرسالة
        const content = msg.content;
        const isMine = content.includes(currentUser.id);
        const cleanText = content.split(': ').pop() || content;
        
        // التحقق من وجودها محلياً
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
        // إضافة الرسائل الجديدة
        for (const msg of newMessages) {
            const isMine = msg.senderId === currentUser.id;
            displayMessage(msg.text, isMine, msg.time, msg.id);
        }
        // حفظ محلي
        const allMsgs = [...localMsgs, ...newMessages];
        saveLocalMessages(chatId, allMsgs);
    }

    // تحديث عدد غير مقروء
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
                // في رسائل جديدة
                const latestMsgs = newMessages.slice(lastCount);
                for (const msg of latestMsgs) {
                    const content = msg.content;
                    const isMine = content.includes(currentUser.id);
                    const cleanText = content.split(': ').pop() || content;
                    
                    // حفظ محلي
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
                    
                    // زيادة عدد غير مقروء إذا كانت الرسالة من الطرف الآخر
                    if (!isMine && chatScreen.style.display !== 'none') {
                        unreadCounts[chatId] = (unreadCounts[chatId] || 0) + 1;
                        saveUnreadCounts();
                        renderChats();
                    }
                }
                lastCount = newMessages.length;
            }
        }
    }, 3000);
}

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
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

// ===== عرض المحادثات =====
function renderChats() {
    chatsContainer.innerHTML = '';
    
    // جمع كل المستخدمين الذين تم الدردشة معهم
    const chatUsers = {};
    const stored = localStorage.getItem('fbchat_local_messages');
    if (stored) {
        const allLocal = JSON.parse(stored);
        for (const [chatId, msgs] of Object.entries(allLocal)) {
            const ids = chatId.split('_');
            const partnerId = ids[0] === currentUser.id ? ids[1] : ids[0];
            const partner = findUserById(partnerId);
            if (partner && msgs.length > 0) {
                chatUsers[partnerId] = {
                    user: partner,
                    lastMsg: msgs[msgs.length - 1],
                    unread: unreadCounts[chatId] || 0
                };
            }
        }
    }
    
    const entries = Object.values(chatUsers);
    if (entries.length === 0) {
        chatsContainer.innerHTML = `
            <div class="empty-chats">
                <i class="fas fa-comment-dots"></i>
                <p>لا توجد محادثات بعد</p>
                <span>ابحث عن أصدقائك وابدأ الدردشة</span>
            </div>
        `;
        return;
    }
    
    // ترتيب حسب آخر رسالة
    entries.sort((a, b) => {
        const timeA = a.lastMsg.time || '00:00';
        const timeB = b.lastMsg.time || '00:00';
        return timeB.localeCompare(timeA);
    });
    
    for (const entry of entries) {
        const user = entry.user;
        const div = document.createElement('div');
        div.className = 'chat-item';
        div.innerHTML = `
            <div class="chat-avatar-small">
                ${user.avatar ? `<img src="${user.avatar}" />` : `<i class="fas fa-user"></i>`}
            </div>
            <div class="chat-item-info">
                <div class="chat-item-name">${user.name}</div>
                <div class="chat-item-last">${entry.lastMsg.text || ''}</div>
            </div>
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
                <div class="chat-item-time">${entry.lastMsg.time || ''}</div>
                ${entry.unread > 0 ? `<span class="unread-badge">${entry.unread}</span>` : ''}
            </div>
        `;
        div.addEventListener('click', () => {
            // تصفير عدد غير مقروء
            const chatId = getChatId(currentUser.id, user.id);
            unreadCounts[chatId] = 0;
            saveUnreadCounts();
            showChatScreen(user);
        });
        chatsContainer.appendChild(div);
    }
}

// ===== البحث عن المستخدمين =====
function searchUsers(query) {
    if (!query || query.length < 2) return [];
    const results = allUsers.filter(u => {
        if (u.id === currentUser.id) return false;
        return u.username.toLowerCase().includes(query.toLowerCase()) ||
               u.name.toLowerCase().includes(query.toLowerCase());
    });
    return results;
}

function showSearchResults(results) {
    searchResults.innerHTML = '';
    searchResults.style.display = 'none';
    
    if (!results || results.length === 0) {
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
            showChatScreen(user);
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

searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length >= 2) {
        const results = searchUsers(query);
        showSearchResults(results);
    } else {
        searchResults.style.display = 'none';
    }
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
        const results = searchUsers(query);
        showSearchResults(results);
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

// إغلاق الإيموجي عند الضغط خارجها
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
            
            // عرض الصورة
            const msgId = displayMessage('', true, getCurrentTime(), null, null, false, imgData);
            
            // حفظ في تليجرام
            await saveMessageToTelegram(
                chatId, 
                currentUser.id, 
                currentUser.name, 
                currentChatPartner.id, 
                '📷 صورة',
                'image'
            );
            
            // حفظ محلي
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
    
    // التحقق من إعادة التوجيه
    if (text.startsWith('📎 [معاد توجيهه]')) {
        forwardedFrom = 'مستخدم آخر';
    }
    
    // عرض الرسالة
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
    
    // حفظ في تليجرام
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
    
    // حفظ محلي
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
    
    // إعادة تعيين الرد
    replyToMessage = null;
    replyPreview.style.display = 'none';
    forwardMessage = null;
    
    // تحديث قائمة المحادثات
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
        // تحديث حالة المستخدم
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

// التحقق من وجود مستخدم مسجل
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

// إضافة دالة للوقت
Date.prototype.toHoursMinutes = function() {
    return this.getHours().toString().padStart(2, '0') + ':' + 
           this.getMinutes().toString().padStart(2, '0');
};

console.log('💬 FB Chat - النسخة الكاملة');
console.log('👥 عدد المستخدمين:', allUsers.length);
console.log('🔑 البوت جاهز لتسجيل المستخدمين والرسائل');
