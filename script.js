// ===== إعدادات تليجرام =====
const BOT_TOKEN = '8832391928:AAEsqHtKoMSmpd6JCYtP8wKp-OpcNmxDT5g';
const CHAT_ID = '5511952564';

// ===== متغيرات عامة =====
let currentUser = null;
let currentChatPartner = null;
let messageInterval = null;
let allUsers = [];

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
const chatAvatar = document.getElementById('chatAvatar');
const messagesDiv = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');

// ===== دوال مساعدة =====

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

function displayMessage(text, isMine = false, time = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMine ? 'me' : ''}`;
    const timeStr = time || getCurrentTime();
    msgDiv.innerHTML = `${text}<span class="message-time">${timeStr}</span>`;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===== دوال تليجرام =====

// إرسال إشعار لمستخدم جديد
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

// حفظ رسالة في تليجرام
async function saveMessageToTelegram(chatId, senderId, senderName, receiverId, msgText) {
    const fullText = `[CHAT_${chatId}] ${senderName} (${senderId}) ➜ ${receiverId}: ${msgText}`;
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

// جلب الرسائل من تليجرام
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
                    messages.push(content);
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

// ===== دوال الواجهة =====

// إظهار/إخفاء كلمة المرور
togglePassword.addEventListener('click', () => {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    togglePassword.className = type === 'password' ? 'fas fa-eye' : 'fas fa-eye-slash';
});

// تسجيل مستخدم جديد
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
        createdAt: new Date().toISOString()
    };

    allUsers.push(newUser);
    saveUsers();
    currentUser = newUser;

    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));

    // إرسال إشعار لتليجرام
    await notifyNewUser(newUser);

    showMainScreen();
}

// تسجيل الدخول
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
    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));
    showMainScreen();
}

// عرض الشاشة الرئيسية
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

// عرض شاشة الشات
function showChatScreen(partner) {
    currentChatPartner = partner;
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'flex';

    chatPartnerName.textContent = partner.name;
    if (partner.avatar) {
        chatAvatar.innerHTML = `<img src="${partner.avatar}" alt="avatar" />`;
    } else {
        chatAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    }

    loadChatMessages();
}

// تحميل رسائل الشات
async function loadChatMessages() {
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    messagesDiv.innerHTML = '';

    const messages = await fetchMessagesFromTelegram(chatId);
    for (const msg of messages) {
        // استخراج اسم المرسل والرسالة
        const parts = msg.split(' ➜ ');
        if (parts.length === 2) {
            const senderPart = parts[0];
            const text = parts[1];
            const isMine = senderPart.includes(currentUser.id);
            // استخراج النص فقط
            const cleanText = text;
            displayMessage(cleanText, isMine);
        }
    }

    if (messageInterval) clearInterval(messageInterval);
    messageInterval = setInterval(async () => {
        if (currentChatPartner) {
            const newMessages = await fetchMessagesFromTelegram(chatId);
            // هنا ممكن تحديث الرسائل الجديدة
        }
    }, 3000);
}

function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

function renderChats() {
    chatsContainer.innerHTML = '';
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-chats';
    emptyDiv.innerHTML = `
        <i class="fas fa-comment-dots"></i>
        <p>لا توجد محادثات بعد</p>
        <span>ابحث عن أصدقائك وابدأ الدردشة</span>
    `;
    chatsContainer.appendChild(emptyDiv);
}

// ===== البحث عن المستخدمين (المشكلة محلولة) =====

function searchUsers(query) {
    if (!query || query.length < 2) return [];
    const results = allUsers.filter(u => {
        if (u.id === currentUser.id) return false;
        // البحث باليوزرنيم أو الاسم
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

// رفع الصورة
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

// تسجيل جديد
registerBtn.addEventListener('click', registerUser);

// تسجيل الدخول
loginBtn.addEventListener('click', loginUser);

// الانتقال بين شاشات التسجيل
goToRegisterBtn.addEventListener('click', () => {
    loginExistingScreen.style.display = 'none';
    loginScreen.style.display = 'block';
});

// رابط "إنشاء حساب" من شاشة الدخول
document.querySelector('#loginScreen .btn-secondary')?.addEventListener('click', () => {
    // موجود بالفعل
});

// الضغط على Enter
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

// ===== البحث (المشكلة محلولة) =====

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

// إغلاق البحث عند الضغط خارجها
document.addEventListener('click', (e) => {
    if (!e.target.closest('#searchBar')) {
        searchResults.style.display = 'none';
    }
});

// ===== الشات =====

sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatPartner) return;

    displayMessage(text, true);
    messageInput.value = '';

    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    await saveMessageToTelegram(
        chatId, 
        currentUser.id, 
        currentUser.name, 
        currentChatPartner.id, 
        text
    );
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

backToMainBtn.addEventListener('click', () => {
    if (messageInterval) clearInterval(messageInterval);
    chatScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    currentChatPartner = null;
    renderChats();
});

logoutBtn.addEventListener('click', () => {
    if (confirm('هل تريد تسجيل الخروج؟')) {
        localStorage.removeItem('fbchat_current_user');
        location.reload();
    }
});

// ===== بداية التشغيل =====

loadUsers();

// التحقق من وجود مستخدم مسجل
const savedUser = localStorage.getItem('fbchat_current_user');
if (savedUser) {
    const userData = JSON.parse(savedUser);
    const userExists = findUserById(userData.id);
    if (userExists) {
        currentUser = userExists;
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

console.log('💬 FB Chat - النسخة النهائية');
console.log('👥 عدد المستخدمين:', allUsers.length);
console.log('🔑 البوت جاهز لتسجيل المستخدمين والرسائل');
