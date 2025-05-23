document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = '/api'; // Adjust to your API base URL

    // --- DOM Element Selectors ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationsListContainer = document.getElementById('notificationsListContainer'); // For consistency
    const clearNotificationsBtn = document.getElementById('clearNotificationsBtn'); // For consistency
    const notificationCountBadge = document.getElementById('notificationCountBadge'); // For consistency

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    const logoutBtn = document.getElementById('logoutBtn'); // For consistency

    const courseFilterSelect = document.getElementById('courseFilter');
    const statusFilterSelect = document.getElementById('statusFilter');
    const resetFiltersBtn = document.getElementById('resetFiltersBtn'); // Renamed
    const answersFeedContainer = document.getElementById('answersFeedContainer');
    const feedLoadingMessage = document.getElementById('feedLoadingMessage');

    const notificationPopupContainer = document.getElementById('notificationPopupContainer'); // For consistency

    // User info placeholders
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const headerUserAvatar = document.getElementById('headerUserAvatar');
    const headerUserName = document.getElementById('headerUserName');

    let currentUser = null;
    let allFeedItems = []; // To store all fetched items for client-side filtering

    // --- UI Helper Functions (Consider moving to a shared utils.js if used across multiple pages) ---
    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('active');
            overlay.classList.remove('active');
        });
    }

    function toggleDropdown(btn, dropdown) {
        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');
                document.querySelectorAll('.fixed.z-\\[1060\\], .fixed.z-50').forEach(d => { // Include z-50 for original dropdowns if any
                    if (d !== dropdown) d.classList.add('hidden');
                });
                dropdown.classList.toggle('hidden', !isHidden);
            });
        }
    }
    toggleDropdown(notificationsBtn, notificationsDropdown);
    if(userMenuBtn) toggleDropdown(userMenuBtn, userMenuDropdown);
    
    document.addEventListener('click', (e) => {
        if (notificationsDropdown && !notificationsDropdown.contains(e.target) && e.target !== notificationsBtn && (notificationsBtn && !notificationsBtn.contains(e.target))) {
            notificationsDropdown.classList.add('hidden');
        }
        if (userMenuDropdown && userMenuBtn && !userMenuDropdown.contains(e.target) && e.target !== userMenuBtn && (userMenuBtn && !userMenuBtn.contains(e.target))) {
            userMenuDropdown.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if(notificationsDropdown) notificationsDropdown.classList.add('hidden');
            if(userMenuDropdown) userMenuDropdown.classList.add('hidden');
        }
    });

    function showNotificationPopup(message, type = 'info') { // For consistency
        if (!notificationPopupContainer) return;
        const popupId = `notif-popup-${Date.now()}`;
        const popup = document.createElement('div');
        let bgColor = 'bg-primary-100', textColor = 'text-primary-800', iconClass = 'fas fa-info-circle';
        if (type === 'success') { bgColor = 'bg-green-100'; textColor = 'text-green-800'; iconClass = 'fas fa-check-circle'; }
        else if (type === 'error') { bgColor = 'bg-red-100'; textColor = 'text-red-800'; iconClass = 'fas fa-exclamation-circle';}
        
        popup.id = popupId;
        popup.className = `${bgColor} ${textColor} p-3 shadow-md flex justify-between items-center mb-2 rounded-md pointer-events-auto`;
        popup.innerHTML = `<div class="flex items-center"><i class="${iconClass} mr-2"></i><span class="text-sm">${message}</span></div><button data-dismiss="${popupId}" class="text-current hover:opacity-75 ml-2"><i class="fas fa-times"></i></button>`;
        notificationPopupContainer.appendChild(popup);
        const closeBtn = popup.querySelector(`button[data-dismiss="${popupId}"]`);
        const autoCloseTimeout = setTimeout(() => popup.remove(), 5000);
        closeBtn.onclick = () => { clearTimeout(autoCloseTimeout); popup.remove(); };
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            showNotificationPopup('Выход из системы...', 'info');
            setTimeout(() => window.location.href = 'auth.html', 1000);
        });
    }
    // --- End UI Helper Functions ---

    // --- Fetch and Render Logic ---
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'auth.html'; // Redirect to login if not authenticated
            throw new Error('Пользователь не авторизован');
        }
        const headers = { 
            'Content-Type': 'application/json', 
            'Authorization': `Bearer ${token}`, 
            ...options.headers 
        };
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
            throw new Error('Ошибка авторизации');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Сетевая ошибка');
        }
        return response.json();
    }

    async function loadUserData() {
        try {
            const cachedUser = localStorage.getItem('currentUser');
            if (cachedUser) {
                currentUser = JSON.parse(cachedUser);
                updateUserUI(currentUser);
            }
            const data = await fetchWithAuth(`${API_BASE_URL}/users/me`);
            currentUser = data.user; // Assuming API returns { user: { ... } }
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI(currentUser);
        } catch (error) {
            console.error("Не удалось загрузить данные пользователя:", error.message);
        }
    }

    function updateUserUI(userData) {
        if (!userData) return;
        const defaultAvatar = 'assets/images/default-avatar.png';
        if(sidebarUserName) sidebarUserName.textContent = userData.fullname || 'Пользователь';
        if(sidebarUserRole) sidebarUserRole.textContent = userData.role || 'Статус';
        if(sidebarUserAvatar) sidebarUserAvatar.src = userData.avatar_url || defaultAvatar;
        if(headerUserName) headerUserName.textContent = userData.fullname || 'Пользователь';
        if(headerUserAvatar) headerUserAvatar.src = userData.avatar_url || defaultAvatar;
    }
    
    async function loadFilterOptions() {
        try {
            // const courses = await fetchWithAuth(`${API_BASE_URL}/courses/user-courses`); // Endpoint to get courses for filter
            // Заглушка для курсов
            const courses = [
                { courseid: 1, title: "Годовой курс 2024–2025 — ОГЭ" },
                { courseid: 2, title: "Курс по дробям" }
            ];
            if (courseFilterSelect) {
                courses.forEach(course => {
                    const option = document.createElement('option');
                    option.value = course.courseid;
                    option.textContent = course.title;
                    courseFilterSelect.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Ошибка загрузки фильтров курсов:", error);
            showNotificationPopup("Не удалось загрузить фильтры курсов.", "error");
        }
    }

    function renderFeedItem(item) {
        // Determine status badge class and text
        let statusClass = 'status-submitted'; // Default for new student submissions
        let statusText = 'Отправлено';
        let statusIcon = 'fa-paper-plane';

        if (item.status === 'pending') { // by teacher, means student submitted, teacher needs to check
            statusClass = 'status-pending'; statusText = 'Ожидает проверки'; statusIcon = 'fa-clock';
        } else if (item.status === 'approved') {
            statusClass = 'status-approved'; statusText = 'Принято'; statusIcon = 'fa-check';
        } else if (item.status === 'rejected') {
            statusClass = 'status-rejected'; statusText = 'Отклонено'; statusIcon = 'fa-times';
        } else if (item.status === 'viewed') { // teacher viewed, might have commented
            statusClass = 'status-viewed'; statusText = 'Просмотрено'; statusIcon = 'fa-eye';
        }
        // If item.is_student_submission && !item.teacher_viewed_at -> status-submitted
        // If item.is_student_submission && item.teacher_viewed_at && !item.grade -> status-viewed (by teacher)
        // If item.is_teacher_comment (reply to student) -> maybe no specific status, or "answered"

        const feedItemDiv = document.createElement('div');
        feedItemDiv.className = 'bg-white rounded-lg shadow overflow-hidden feed-item';
        feedItemDiv.dataset.course = item.course_id;
        feedItemDiv.dataset.status = item.status; // e.g., pending, approved, rejected, viewed (by teacher), submitted (by student)

        // Files HTML
        let filesHtml = '';
        if (item.attachments && item.attachments.length > 0) {
            const previews = item.attachments.map(file => `
                <div class="border border-gray-200 rounded-lg p-3">
                    <div class="flex items-center justify-between mb-2">
                        <span class="font-medium text-sm">${file.name || 'Прикрепленный файл'}</span>
                        <a href="${file.url}" target="_blank" download class="text-primary-500 hover:text-primary-600 text-sm">
                            <i class="fas fa-download mr-1"></i> Скачать
                        </a>
                    </div>
                    ${file.type && file.type.startsWith('image/') ? 
                        `<img src="${file.url}" alt="${file.name || 'preview'}" class="file-preview w-full">` : 
                        `<div class="file-preview w-full bg-gray-100 flex items-center justify-center text-gray-400"><i class="fas fa-file-alt text-4xl"></i></div>`}
                </div>`).join('');
            filesHtml = `<div class="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">${previews}</div>`;
        }

        // Teacher actions HTML (only if current user is teacher/admin and item needs action)
        let teacherActionsHtml = '';
        if (currentUser && (currentUser.role === 'Teacher' || currentUser.role === 'Admin') && item.status === 'pending') {
            teacherActionsHtml = `
                <div class="border-t border-gray-200 pt-4 mt-4" id="teacherActions_${item.id}">
                    <h4 class="font-medium text-gray-800 mb-3">Ответ преподавателя</h4>
                    <div class="flex items-center space-x-3 mb-3">
                        <button data-action="approve" data-item-id="${item.id}" class="px-3 py-1 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 transition flex items-center">
                            <i class="fas fa-check mr-1"></i> Принять
                        </button>
                        <button data-action="reject" data-item-id="${item.id}" class="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600 transition flex items-center">
                            <i class="fas fa-times mr-1"></i> Отклонить
                        </button>
                        <button data-action="view" data-item-id="${item.id}" class="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition flex items-center">
                            <i class="fas fa-eye mr-1"></i> Просмотреть
                        </button>
                    </div>
                    <div class="flex items-center space-x-4 mb-3">
                        <div>
                            <label for="grade_${item.id}" class="block text-sm font-medium text-gray-700 mb-1">Оценка</label>
                            <select id="grade_${item.id}" class="bg-gray-50 border border-gray-300 text-gray-700 py-1 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <option value="">Без оценки</option><option value="5">5 (Отлично)</option><option value="4">4 (Хорошо)</option><option value="3">3 (Удовлетворительно)</option><option value="2">2 (Неудовлетворительно)</option>
                            </select>
                        </div>
                        <div>
                            <label for="visibility_${item.id}" class="block text-sm font-medium text-gray-700 mb-1">Видимость</label>
                            <select id="visibility_${item.id}" class="bg-gray-50 border border-gray-300 text-gray-700 py-1 px-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                                <option value="private">Только преподаватели</option><option value="public">Видно студенту</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label for="comment_${item.id}" class="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
                        <textarea id="comment_${item.id}" rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Ваш комментарий..."></textarea>
                    </div>
                    <div class="flex justify-between items-center">
                        <div>
                            <label class="inline-flex items-center">
                                <input type="file" class="hidden" id="file_reply_${item.id}" multiple>
                                <button type-="button" onclick="document.getElementById('file_reply_${item.id}').click()" class="text-sm text-gray-600 hover:text-primary-500"><i class="fas fa-paperclip mr-1"></i>Прикрепить файл</button>
                            </label>
                        </div>
                        <button data-action="submit-reply" data-item-id="${item.id}" class="px-3 py-1 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700 transition flex items-center">
                            <i class="fas fa-paper-plane mr-1"></i> Отправить
                        </button>
                    </div>
                </div>`;
        }
        
        // Teacher feedback HTML
        let teacherFeedbackHtml = '';
        if (item.teacher_feedback) {
            teacherFeedbackHtml = `
                <div class="comment-reply bg-gray-50 p-3 rounded-lg mt-3">
                    <div class="flex items-start space-x-3">
                        <img src="${item.teacher_feedback.avatar_url || 'assets/images/default-avatar.png'}" alt="Teacher" class="w-8 h-8 rounded-full">
                        <div>
                            <div class="font-medium">${item.teacher_feedback.name || 'Преподаватель'}</div>
                            <div class="text-sm text-gray-500 mb-2">Преподаватель</div>
                            <div class="prose max-w-none text-gray-700 mb-2"><p>${item.teacher_feedback.comment}</p></div>
                            ${item.teacher_feedback.attachments && item.teacher_feedback.attachments.length > 0 ? 
                                `<div class="mt-2"> ${item.teacher_feedback.attachments.map(fa => `
                                    <div class="border border-gray-200 rounded-lg p-2 mb-2">
                                        <div class="flex items-center justify-between">
                                            <span class="font-medium text-xs">${fa.name}</span>
                                            <a href="${fa.url}" target="_blank" download class="text-primary-500 hover:text-primary-600 text-xs"><i class="fas fa-download mr-1"></i>Скачать</a>
                                        </div>
                                        ${fa.type && fa.type.startsWith('image/') ? `<img src="${fa.url}" alt="${fa.name}" class="file-preview w-full mt-1">` : ''}
                                    </div>`).join('')} 
                                </div>` : ''}
                            <div class="text-sm text-gray-500 mt-2"><i class="fas fa-clock mr-1"></i> ${new Date(item.teacher_feedback.timestamp).toLocaleString('ru-RU')}</div>
                            ${item.teacher_feedback.grade ? `<div class="text-sm font-medium text-gray-800 mt-1">Оценка: <span class="text-primary-500">${item.teacher_feedback.grade}</span></div>` : ''}
                        </div>
                    </div>
                </div>`;
        }


        feedItemDiv.innerHTML = `
            <div class="p-4 border-b border-gray-200">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="font-semibold text-lg text-gray-800">${item.title}</h3>
                        <p class="text-sm text-gray-500 mt-1">Курс: ${item.course_name}</p>
                         <p class="text-sm text-gray-500 mt-1">Урок: ${item.lesson_name || 'Общий вопрос по курсу'}</p>
                    </div>
                    <div class="flex items-center space-x-2 text-right">
                        <span class="status-badge ${statusClass}">
                            <i class="fas ${statusIcon} mr-1"></i> ${statusText}
                        </span>
                        <span class="text-sm text-gray-400">${new Date(item.timestamp).toLocaleString('ru-RU')}</span>
                    </div>
                </div>
            </div>
            <div class="p-4">
                <div class="flex items-start space-x-4">
                    <img src="${item.student_avatar_url || 'assets/images/default-avatar.png'}" alt="Student" class="w-10 h-10 rounded-full">
                    <div class="flex-1">
                        <div class="font-medium">${item.student_name}</div>
                        <div class="text-sm text-gray-500 mb-3">Студент</div>
                        <div class="prose max-w-none text-gray-700 mb-3"><p>${item.student_comment}</p></div>
                        ${filesHtml}
                        ${teacherActionsHtml}
                        ${teacherFeedbackHtml}
                         ${(item.status === 'rejected' || (item.status === 'viewed' && currentUser && currentUser.userid === item.student_id)) ? `
                        <div class="border-t border-gray-200 pt-4 mt-4">
                            <textarea rows="2" class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="Ваш ответ или вопрос..."></textarea>
                            <div class="flex justify-end mt-2">
                                <button class="px-3 py-1 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 transition flex items-center">
                                    <i class="fas fa-reply mr-1"></i> Ответить
                                </button>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
            </div>`;
        return feedItemDiv;
    }

    async function loadAnswersFeed() {
        if (feedLoadingMessage) feedLoadingMessage.classList.remove('hidden');
        if (answersFeedContainer) answersFeedContainer.innerHTML = ''; // Clear previous items

        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/answers-feed`); // Your actual API endpoint
            // allFeedItems = data.feedItems || [];
            
            // Заглушка данных:
            allFeedItems = [
                { id: 1, course_id: 1, course_name: "Годовой курс 2024–2025 — ОГЭ", lesson_name: "Алгебраические выражения", title: "Домашнее задание по теме 'Алгебраические выражения'", student_id: 101, student_name: "Анна Иванова", student_avatar_url: "https://randomuser.me/api/portraits/women/44.jpg", student_comment: "Выполнила все задания по теме. Вопросы по пунктам 3 и 5 - не уверена в правильности решения.", timestamp: new Date().toISOString(), status: "pending", attachments: [{name: "Решение.pdf", url: "#", type:"application/pdf"}, {name: "Фото.jpg", url: "https://via.placeholder.com/300x200?text=Homework+Photo", type:"image/jpeg"}] },
                { id: 2, course_id: 1, course_name: "Годовой курс 2024–2025 — ОГЭ", lesson_name: "Геометрия", title: "Тест по теме 'Геометрия'", student_id: 101, student_name: "Анна Иванова", student_avatar_url: "https://randomuser.me/api/portraits/women/44.jpg", student_comment: "Отправляю выполненный тест. Вопрос 7 был сложным, но вроде разобралась.", timestamp: new Date(Date.now() - 86400000).toISOString(), status: "approved", attachments: [{name: "Тест.docx", url: "#", type:"application/msword"}], teacher_feedback: { name: "Иван Петров", avatar_url: "https://randomuser.me/api/portraits/men/32.jpg", comment: "Хорошая работа! Вопрос 7 действительно сложный, но ты правильно его решила. Обрати внимание на оформление задачи 3 - нужно более подробно расписывать ход решения.", grade: 5, timestamp: new Date(Date.now() - 80000000).toISOString(), attachments: [] }},
                { id: 3, course_id: 2, course_name: "Курс по дробям", lesson_name: "Сложение дробей", title: "Вопрос по теме 'Сложение дробей'", student_id: 101, student_name: "Анна Иванова", student_avatar_url: "https://randomuser.me/api/portraits/women/44.jpg", student_comment: "Не понимаю, как решать пример 5 из домашнего задания. Вроде делаю по алгоритму, но ответ не сходится с тем, что в конце учебника.", timestamp: new Date(Date.now() - 2*86400000).toISOString(), status: "viewed", teacher_feedback: { name: "Светлана Сидорова", avatar_url: "https://randomuser.me/api/portraits/women/28.jpg", comment: "В этом примере нужно сначала привести дроби к общему знаменателю, а потом уже складывать. Прикрепила файл с подробным решением.", grade: null, timestamp: new Date(Date.now() - 2*80000000).toISOString(), attachments: [{name: "Разбор примера 5.png", url: "https://via.placeholder.com/300x200?text=Example+Solution", type:"image/png"}]} },
                { id: 4, course_id: 2, course_name: "Курс по дробям", lesson_name: "Умножение дробей", title: "Домашнее задание по теме 'Умножение дробей'", student_id: 101, student_name: "Анна Иванова", student_avatar_url: "https://randomuser.me/api/portraits/women/44.jpg", student_comment: "Отправляю выполненное домашнее задание. Вопросы по пунктам 2 и 4.", timestamp: new Date(Date.now() - 3*86400000).toISOString(), status: "rejected", attachments: [{name: "ДЗ фото.jpg", url: "https://via.placeholder.com/300x200?text=Notebook+Scan", type:"image/jpeg"}], teacher_feedback: { name: "Светлана Сидорова", avatar_url: "https://randomuser.me/api/portraits/women/28.jpg", comment: "Анна, в пункте 2 ты неправильно сократила дроби перед умножением, а в пункте 4 ошибка в вычислениях. Переделай, пожалуйста, эти задания и пришли снова.", grade: 2, timestamp: new Date(Date.now() - 3*80000000).toISOString(), attachments: [{name:"Правильное решение.pdf", url:"#", type:"application/pdf"}]} }
            ];

            if (feedLoadingMessage) feedLoadingMessage.classList.add('hidden');
            applyFiltersAndRender(); // Initial render
        } catch (error) {
            console.error("Ошибка загрузки ленты ответов:", error);
            if (feedLoadingMessage) feedLoadingMessage.textContent = 'Не удалось загрузить ленту ответов.';
            showNotificationPopup("Не удалось загрузить ленту ответов.", "error");
        }
    }

    function applyFiltersAndRender() {
        if (!answersFeedContainer) return;
        answersFeedContainer.innerHTML = ''; // Clear current items

        const selectedCourse = courseFilterSelect ? courseFilterSelect.value : 'all';
        const selectedStatus = statusFilterSelect ? statusFilterSelect.value : 'attention';

        const filteredItems = allFeedItems.filter(item => {
            const courseMatch = selectedCourse === 'all' || String(item.course_id) === selectedCourse;
            let statusMatch = selectedStatus === 'all' || item.status === selectedStatus;
            if (selectedStatus === 'attention') {
                statusMatch = item.status === 'pending' || item.status === 'rejected'; // Example: teacher needs to act
            }
            return courseMatch && statusMatch;
        });

        if (filteredItems.length === 0) {
            answersFeedContainer.innerHTML = '<p class="text-gray-500 text-center py-8">Нет элементов, соответствующих вашим фильтрам.</p>';
        } else {
            filteredItems.forEach(item => {
                answersFeedContainer.appendChild(renderFeedItem(item));
            });
        }
    }

    // Event Listeners for filters
    if (courseFilterSelect) courseFilterSelect.addEventListener('change', applyFiltersAndRender);
    if (statusFilterSelect) statusFilterSelect.addEventListener('change', applyFiltersAndRender);
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (courseFilterSelect) courseFilterSelect.value = 'all';
            if (statusFilterSelect) statusFilterSelect.value = 'attention'; // Default "requires attention"
            applyFiltersAndRender();
        });
    }
    
    // Event delegation for dynamic teacher action buttons
    if (answersFeedContainer) {
        answersFeedContainer.addEventListener('click', async (e) => {
            const targetButton = e.target.closest('button[data-action]');
            if (!targetButton) return;

            const action = targetButton.dataset.action;
            const itemId = targetButton.dataset.itemId;
            // TODO: Implement API calls for actions: approve, reject, view, submit-reply
            console.log(`Действие: ${action}, ID элемента: ${itemId}`);
            showNotificationPopup(`Действие "${action}" для элемента ${itemId} (демо).`, 'info');

            if (action === 'submit-reply') {
                const commentText = document.getElementById(`comment_${itemId}`).value;
                const grade = document.getElementById(`grade_${itemId}`).value;
                const visibility = document.getElementById(`visibility_${itemId}`).value;
                // const fileInput = document.getElementById(`file_reply_${itemId}`);
                // const files = fileInput.files;
                console.log({ commentText, grade, visibility /*, files */});
                // Actual API call here
            }
            // Optimistically update UI or reload specific item / entire feed after action
        });
    }
    
     // --- Load Notifications (Placeholder, for consistency) ---
    async function loadNotifications() {
        if (!notificationsListContainer) return;
        notificationsListContainer.innerHTML = '<p class="p-4 text-sm text-gray-500">Загрузка уведомлений...</p>';
        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/notifications`);
            // const notifications = data.notifications || data;
             // Заглушка
            const notifications = [
                { id: 1, message: "Новый ответ на ДЗ от Ивана П.", timeAgo: "5 мин назад", icon: "fa-reply" },
                { id: 2, message: "Оценка за тест 'Алгебра' обновлена", timeAgo: "1 час назад", icon: "fa-check-double" }
            ];

            notificationsListContainer.innerHTML = '';
            if (!notifications || notifications.length === 0) {
                notificationsListContainer.innerHTML = '<p class="p-4 text-sm text-gray-500">Нет новых уведомлений.</p>';
                if(notificationCountBadge) {notificationCountBadge.textContent = '0'; notificationCountBadge.classList.add('hidden');}
                return;
            }
            if(notificationCountBadge) {
                notificationCountBadge.textContent = notifications.length > 9 ? '9+' : notifications.length;
                notificationCountBadge.classList.remove('hidden');
            }
            notifications.forEach(notif => {
                const item = document.createElement('div');
                item.className = 'p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer';
                item.innerHTML = `<div class="flex items-start"><div class="flex-shrink-0 text-primary-500 mr-3 mt-1"><i class="fas ${notif.icon || 'fa-bell'}"></i></div><div><p class="font-medium text-sm">${notif.message}</p><p class="text-xs text-gray-600 mt-1">${notif.timeAgo}</p></div></div>`;
                notificationsListContainer.appendChild(item);
            });
        } catch (error) {
            console.error("Ошибка загрузки уведомлений:", error);
            notificationsListContainer.innerHTML = '<p class="p-4 text-sm text-red-500">Не удалось загрузить уведомления.</p>';
        }
    }
    if (clearNotificationsBtn) { // For consistency
        clearNotificationsBtn.addEventListener('click', () => {
            notificationsListContainer.innerHTML = '<p class="p-4 text-sm text-gray-500">Нет новых уведомлений.</p>';
            if(notificationCountBadge) {notificationCountBadge.textContent = '0'; notificationCountBadge.classList.add('hidden');}
            showNotificationPopup('Все уведомления очищены (демо).');
        });
    }


    // --- Initial Load ---
    async function initPage() {
        await loadUserData();
        await loadFilterOptions();
        await loadAnswersFeed(); // Load initial feed
        if (currentUser) { // Load notifications only if user data is available
            loadNotifications();
        }
    }

    initPage();
});