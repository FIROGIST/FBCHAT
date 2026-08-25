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
const mainScreen = document.getElementById('mainScreen');
const chatScreen = document.getElementById('chatScreen');

const avatarInput = document.getElementById('avatarInput');
const avatarPreview = document.getElementById('avatarPreview');
const fullNameInput = document.getElementById('fullName');
const usernameInput = document.getElementById('username');
const registerBtn = document.getElementById('registerBtn');

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

// توليد معرف فريد
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

// الحصول على الوقت
function getCurrentTime() {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + 
           now.getMinutes().toString().padStart(2, '0');
}

// عرض رسالة
function displayMessage(text, isMine = false, time = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isMine ? 'me' : ''}`;
    const timeStr = time || getCurrentTime();
    msgDiv.innerHTML = `${text}<span class="message-time">${timeStr}</span>`;
    messagesDiv.appendChild(msgDiv);
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

// ===== إدارة المستخدمين (LocalStorage) =====

function loadUsers() {
    const stored = localStorage.getItem('fbchat_users');
    if (stored) {
        allUsers = JSON.parse(stored);
    } else {
        // مستخدمين تجريبيين
        allUsers = [
            {
                id: 'user1',
                name: 'أحمد محمد',
                username: 'ahmed_123',
                avatar: '',
                online: true
            },
            {
                id: 'user2',
                name: 'سارة علي',
                username: 'sara_456',
                avatar: '',
                online: true
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

// ===== دوال تليجرام =====

async function saveMessageToTelegram(chatId, senderId, receiverId, msgText) {
    const fullText = `[CHAT_${chatId}] ${senderId}->${receiverId}: ${msgText}`;
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

// ===== دوال الواجهة =====

// تسجيل الدخول
function registerUser() {
    const name = fullNameInput.value.trim();
    const username = usernameInput.value.trim();

    if (!name || !username) {
        alert('⚠️ الرجاء إدخال الاسم واليوزرنيم');
        return;
    }

    // التحقق من اليوزرنيم
    if (findUserByUsername(username)) {
        alert('⚠️ هذا اليوزرنيم مستخدم بالفعل!');
        return;
    }

    // معالجة الصورة
    let avatar = '';
    const avatarImg = avatarPreview.querySelector('img');
    if (avatarImg) {
        avatar = avatarImg.src;
    }

    // إنشاء مستخدم جديد
    const newUser = {
        id: generateId(),
        name: name,
        username: username,
        avatar: avatar,
        online: true
    };

    allUsers.push(newUser);
    saveUsers();
    currentUser = newUser;

    // حفظ في الجلسة
    localStorage.setItem('fbchat_current_user', JSON.stringify(currentUser));

    showMainScreen();
}

// عرض الشاشة الرئيسية
function showMainScreen() {
    loginScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    chatScreen.style.display = 'none';

    // تحديث معلومات المستخدم
    if (currentUser.avatar) {
        userAvatarSmall.innerHTML = `<img src="${currentUser.avatar}" alt="avatar" />`;
    } else {
        userAvatarSmall.innerHTML = `<i class="fas fa-user"></i>`;
    }
    displayName.textContent = currentUser.name;
    displayUsername.textContent = '@' + currentUser.username;

    renderChats();
}

// عرض الشات
function showChatScreen(partner) {
    currentChatPartner = partner;
    mainScreen.style.display = 'none';
    chatScreen.style.display = 'flex';

    // تحديث معلومات الشريك
    chatPartnerName.textContent = partner.name;
    if (partner.avatar) {
        chatAvatar.innerHTML = `<img src="${partner.avatar}" alt="avatar" />`;
    } else {
        chatAvatar.innerHTML = `<i class="fas fa-user"></i>`;
    }

    // تحميل الرسائل
    loadChatMessages();
}

// تحميل رسائل الشات
async function loadChatMessages() {
    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    messagesDiv.innerHTML = '';

    const messages = await fetchMessagesFromTelegram(chatId);
    for (const msg of messages) {
        const parts = msg.split(': ');
        if (parts.length === 2) {
            const senderId = parts[0];
            const text = parts[1];
            const isMine = senderId === currentUser.id;
            displayMessage(text, isMine);
        }
    }

    // بدأ التحديث التلقائي
    if (messageInterval) clearInterval(messageInterval);
    messageInterval = setInterval(async () => {
        if (currentChatPartner) {
            const newMessages = await fetchMessagesFromTelegram(chatId);
            // تحديث الرسائل الجديدة
        }
    }, 3000);
}

// الحصول على معرف الشات
function getChatId(user1, user2) {
    return [user1, user2].sort().join('_');
}

// عرض قائمة المحادثات
function renderChats() {
    chatsContainer.innerHTML = '';
    // هنا هنضيف المحادثات المفتوحة
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'empty-chats';
    emptyDiv.innerHTML = `
        <i class="fas fa-comment-dots"></i>
        <p>لا توجد محادثات بعد</p>
        <span>ابحث عن أصدقائك وابدأ الدردشة</span>
    `;
    chatsContainer.appendChild(emptyDiv);
}

// ===== البحث عن المستخدمين =====

function searchUsers(query) {
    if (!query) return [];
    return allUsers.filter(u => 
        u.id !== currentUser.id &&
        u.username.toLowerCase().includes(query.toLowerCase())
    );
}

function showSearchResults(results) {
    searchResults.innerHTML = '';
    if (results.length === 0) {
        searchResults.style.display = 'none';
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

// تسجيل الدخول
registerBtn.addEventListener('click', registerUser);

// الضغط على Enter في حقول التسجيل
fullNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') usernameInput.focus();
});
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') registerBtn.click();
});

// البحث
searchInput.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    if (query.length > 0) {
        const results = searchUsers(query);
        showSearchResults(results);
    } else {
        searchResults.style.display = 'none';
    }
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
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

// إرسال رسالة
sendBtn.addEventListener('click', async () => {
    const text = messageInput.value.trim();
    if (!text || !currentChatPartner) return;

    displayMessage(text, true);
    messageInput.value = '';

    const chatId = getChatId(currentUser.id, currentChatPartner.id);
    await saveMessageToTelegram(chatId, currentUser.id, currentChatPartner.id, text);
});

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendBtn.click();
});

// العودة للقائمة
backToMainBtn.addEventListener('click', () => {
    if (messageInterval) clearInterval(messageInterval);
    chatScreen.style.display = 'none';
    mainScreen.style.display = 'flex';
    currentChatPartner = null;
    renderChats();
});

// تسجيل الخروج
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
    currentUser = JSON.parse(savedUser);
    // التحقق من وجود المستخدم في القائمة
    const userExists = findUserById(currentUser.id);
    if (userExists) {
        currentUser = userExists;
        showMainScreen();
    } else {
        localStorage.removeItem('fbchat_current_user');
    }
}

console.log('💬 FB Chat - نسخة المستخدمين');
console.log('👥 عدد المستخدمين:', allUsers.length);