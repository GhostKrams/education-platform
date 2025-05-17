document.addEventListener('DOMContentLoaded', function() {
    // --- DOM Element Selectors ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationsListEl = document.getElementById('notificationsList'); // Переименовано для ясности
    const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
    const notificationCountBadge = document.getElementById('notificationCount');

    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    const logoutBtn = document.getElementById('logoutBtn');

    const addCourseBtn = document.getElementById('addCourseBtn');
    const addCourseModal = document.getElementById('addCourseModal');
    const closeCourseModalBtn = document.getElementById('closeCourseModalBtn');
    const cancelCourseModalBtn = document.getElementById('cancelCourseModalBtn');
    const courseForm = document.getElementById('courseForm');
    const courseFormError = document.getElementById('courseFormError');

    const notificationPopupContainer = document.getElementById('notificationPopupContainer');

    // --- Basic UI Data Elements ---
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const headerUserAvatar = document.getElementById('headerUserAvatar');
    const headerUserName = document.getElementById('headerUserName');

    // --- Dynamic Content Containers ---
    const activeCoursesListEl = document.getElementById('activeCoursesList');
    const answersFeedListEl = document.getElementById('answersFeedList');
    const scheduleListEl = document.getElementById('scheduleList');
    const upcomingTestsListEl = document.getElementById('upcomingTestsList');

    // --- Placeholders for loading messages ---
    const coursesLoadingMsg = document.getElementById('coursesLoadingMsg');
    const answersLoadingMsg = document.getElementById('answersLoadingMsg');
    const scheduleLoadingMsg = document.getElementById('scheduleLoadingMsg');
    const testsLoadingMsg = document.getElementById('testsLoadingMsg');

    // --- State ---
    let currentUser = null; 
    let userNotifications = [];
    const API_BASE_URL = '/api'; // Ваш базовый URL для API

    // --- Mobile Menu Toggle ---
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

    // --- Dropdown Menus Logic ---
    function toggleDropdown(btn, dropdown, otherDropdowns = []) {
        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');
                // Сначала скрыть все дропдауны (включая текущий, если он был открыт)
                document.querySelectorAll('.fixed.z-\\[1060\\]').forEach(d => d.classList.add('hidden'));
                // Если текущий был скрыт, показать его
                if (isHidden) {
                    dropdown.classList.remove('hidden');
                }
                // Скрыть остальные специфичные дропдауны
                otherDropdowns.forEach(d => d.classList.add('hidden'));
            });
        }
    }

    toggleDropdown(notificationsBtn, notificationsDropdown, [userMenuDropdown]);
    if (userMenuBtn) {
       toggleDropdown(userMenuBtn, userMenuDropdown, [notificationsDropdown]);
    }

    document.addEventListener('click', (e) => {
        if (notificationsDropdown && !notificationsDropdown.contains(e.target) && e.target !== notificationsBtn && !notificationsBtn.contains(e.target)) {
            notificationsDropdown.classList.add('hidden');
        }
        if (userMenuDropdown && userMenuBtn && !userMenuDropdown.contains(e.target) && e.target !== userMenuBtn && !userMenuBtn.contains(e.target)) {
            userMenuDropdown.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (notificationsDropdown) notificationsDropdown.classList.add('hidden');
            if (userMenuDropdown) userMenuDropdown.classList.add('hidden');
            if (addCourseModal && addCourseModal.classList.contains('active')) closeModal(addCourseModal);
        }
    });

    // --- Modal Logic ---
    function openModal(modalElement) {
        if (modalElement) {
            modalElement.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeModal(modalElement) {
        if (modalElement) {
            modalElement.classList.remove('active');
            document.body.style.overflow = '';
            if (courseFormError) courseFormError.classList.add('hidden'); // Скрыть ошибку формы
        }
    }

    if (addCourseBtn) {
        addCourseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            openModal(addCourseModal);
        });
    }
    if (closeCourseModalBtn) {
        closeCourseModalBtn.addEventListener('click', () => closeModal(addCourseModal));
    }
    if (cancelCourseModalBtn) {
        cancelCourseModalBtn.addEventListener('click', () => closeModal(addCourseModal));
    }

    if (addCourseModal) {
        addCourseModal.addEventListener('click', (e) => {
            if (e.target === addCourseModal) {
                closeModal(addCourseModal);
            }
        });
    }
    
    // --- Course Form Submission ---
    if (courseForm) {
        courseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(courseForm);
            const courseData = {
                title: formData.get('title'),
                description: formData.get('description'),
                startDate: formData.get('startDate') || null, // Отправить null если пусто
                endDate: formData.get('endDate') || null,     // Отправить null если пусто
                // teacherId: formData.get('teacherId') || currentUser.userId // Пример, если преподаватель текущий пользователь
            };
            
            console.log('Данные для создания курса:', courseData);
            if (courseFormError) courseFormError.classList.add('hidden');

            try {
                const token = localStorage.getItem('authToken');
                if (!token) throw new Error('Пользователь не авторизован');

                // Предполагаем, что TeacherID будет добавлен на бэкенде на основе текущего пользователя, если он Teacher
                // Или, если это Admin, он может указать TeacherID в форме (поле нужно будет добавить)
                const response = await fetch(`${API_BASE_URL}/courses`, { 
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(courseData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Не удалось создать курс');
                }
                // const newCourse = await response.json();
                showNotificationPopup('Курс успешно создан!', 'success');
                loadUserCourses(); 
                closeModal(addCourseModal);
                courseForm.reset();
            } catch (error) {
                console.error("Ошибка создания курса:", error);
                if (courseFormError) {
                    courseFormError.textContent = `Ошибка: ${error.message}`;
                    courseFormError.classList.remove('hidden');
                } else {
                    showNotificationPopup(`Ошибка создания курса: ${error.message}`, 'error');
                }
            }
        });
    }

    // --- Notification Popup ---
    function showNotificationPopup(message, type = 'info') {
        if (!notificationPopupContainer) return;

        const popupId = `notif-${Date.now()}`;
        const popup = document.createElement('div');
        let bgColor = 'bg-primary-100';
        let textColor = 'text-primary-800';
        let iconClass = 'fas fa-info-circle';

        if (type === 'success') {
            bgColor = 'bg-green-100'; textColor = 'text-green-800'; iconClass = 'fas fa-check-circle';
        } else if (type === 'error') {
            bgColor = 'bg-red-100'; textColor = 'text-red-800'; iconClass = 'fas fa-exclamation-circle';
        }
        
        popup.id = popupId;
        popup.className = `${bgColor} ${textColor} p-3 shadow-md flex justify-between items-center mb-2 rounded-md pointer-events-auto`;
        popup.innerHTML = `
            <div class="flex items-center">
                <i class="${iconClass} mr-2"></i>
                <span class="text-sm">${message}</span>
            </div>
            <button data-dismiss="${popupId}" class="text-current hover:opacity-75 ml-2">
                <i class="fas fa-times"></i>
            </button>
        `;
        notificationPopupContainer.appendChild(popup);

        const closeBtn = popup.querySelector(`button[data-dismiss="${popupId}"]`);
        const autoCloseTimeout = setTimeout(() => {
            popup.remove();
        }, 5000);

        closeBtn.onclick = () => {
            clearTimeout(autoCloseTimeout);
            popup.remove();
        };
    }

    // --- Notifications Dropdown ---
    function renderNotifications() {
        if (!notificationsListEl || !notificationCountBadge) return;
        notificationsListEl.innerHTML = ''; 

        if (userNotifications.length === 0) {
            notificationsListEl.innerHTML = '<p class="p-4 text-sm text-gray-500">Нет новых уведомлений.</p>';
            notificationCountBadge.textContent = '0';
            notificationCountBadge.classList.add('hidden');
            return;
        }

        notificationCountBadge.textContent = userNotifications.length > 9 ? '9+' : userNotifications.length.toString();
        notificationCountBadge.classList.remove('hidden');

        userNotifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = 'p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer';
            // Используйте реальные данные уведомления
            item.innerHTML = `
                <div class="flex items-start">
                    <div class="flex-shrink-0 text-primary-500 mr-3 mt-1">
                        <i class="fas ${notif.icon || 'fa-bell'}"></i>
                    </div>
                    <div>
                        <p class="font-medium text-sm">${notif.message || 'Новое уведомление'}</p>
                        <p class="text-xs text-gray-600 mt-1">${notif.timeAgo || 'Недавно'}</p>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                console.log('Notification clicked:', notif);
                // TODO: Действие при клике на уведомление
                // markNotificationAsRead(notif.id); 
                notificationsDropdown.classList.add('hidden');
            });
            notificationsListEl.appendChild(item);
        });
    }

    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', async () => {
            try {
                // TODO: Логика очистки уведомлений на бэкенде
                // const token = localStorage.getItem('authToken');
                // await fetch(`${API_BASE_URL}/notifications/clear-all`, { method: 'POST', headers: {'Authorization':`Bearer ${token}`} });
                userNotifications = [];
                renderNotifications();
                showNotificationPopup('Все уведомления очищены.');
            } catch (error) {
                showNotificationPopup('Не удалось очистить уведомления.', 'error');
            }
        });
    }

    // --- Logout ---
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('authToken'); 
            localStorage.removeItem('currentUser');
            showNotificationPopup('Выход из системы...', 'info');
            setTimeout(() => {
                window.location.href = 'auth.html';
            }, 1000);
        });
    }

    // --- Dynamic Data Loading ---
    function updateUserDataUI(userData) {
        if (!userData) {
            // Если нет данных о пользователе (например, не авторизован), редирект на страницу входа
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
            return;
        }
        currentUser = userData; // Обновляем глобальную переменную
        const defaultAvatar = 'assets/images/default-avatar.png'; 

        if(sidebarUserName) sidebarUserName.textContent = userData.fullname || 'Пользователь';
        if(sidebarUserRole) sidebarUserRole.textContent = userData.role || 'Статус';
        if(sidebarUserAvatar) sidebarUserAvatar.src = userData.avatarUrl || defaultAvatar;
        
        if(headerUserName) headerUserName.textContent = userData.fullname || 'Пользователь';
        if(headerUserAvatar) headerUserAvatar.src = userData.avatarUrl || defaultAvatar;

        // Показать/скрыть кнопку "Добавить курс" в зависимости от роли
        if(addCourseBtn && (userData.role === 'Teacher' || userData.role === 'Admin')) {
            addCourseBtn.classList.remove('hidden');
        } else if (addCourseBtn) {
            addCourseBtn.classList.add('hidden');
        }
    }
    
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            console.log("Нет токена, перенаправление на вход.");
            window.location.href = 'auth.html';
            throw new Error('Пользователь не авторизован');
        }

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (response.status === 401 || response.status === 403) { // Не авторизован или доступ запрещен
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            console.log("Ошибка авторизации, перенаправление на вход.");
            window.location.href = 'auth.html';
            throw new Error('Ошибка авторизации');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Ошибка сети');
        }
        return response.json();
    }

    async function fetchUserData() {
        try {
            // Пытаемся получить данные из localStorage сначала для быстрого отображения
            const cachedUser = localStorage.getItem('currentUser');
            if (cachedUser) {
                updateUserDataUI(JSON.parse(cachedUser));
            }

            const data = await fetchWithAuth(`${API_BASE_URL}/users/me`); // Новый эндпоинт для /users/me
            localStorage.setItem('currentUser', JSON.stringify(data.user)); // Сохраняем актуальные данные
            updateUserDataUI(data.user);
        } catch (error) {
            console.error("Не удалось загрузить данные пользователя:", error.message);
            // Редирект уже обработан в fetchWithAuth или updateUserDataUI
        }
    }

    async function loadUserCourses() {
        if (!activeCoursesListEl) return;
        if (coursesLoadingMsg) coursesLoadingMsg.textContent = 'Загрузка активных курсов...';
        activeCoursesListEl.innerHTML = '';
      
        try {
          const data = await fetchWithAuth(`${API_BASE_URL}/courses?enrolled=true`);
          const courses = data.courses || data;
      
          if (coursesLoadingMsg) coursesLoadingMsg.classList.add('hidden');
      
          if (!courses || courses.length === 0) {
            activeCoursesListEl.innerHTML = '<p class="text-gray-500">У вас пока нет активных курсов.</p>';
            return;
          }
          courses.forEach(course => {
            const courseEl = document.createElement('div');
            courseEl.className = 'border border-gray-200 rounded-lg p-4 hover:shadow-md transition';
            const progress = course.progress || 0;
            const lessonsCompleted = course.lessons_completed || 0;
            const totalLessons = course.total_lessons || 1;
            const timeLeft = course.time_left || 'Не указано';
      
            courseEl.innerHTML = `
              <div class="flex justify-between items-start mb-2">
                <h3 class="font-semibold text-lg text-gray-800">${course.title}</h3>
                <span class="text-primary-500 font-medium">${progress}%</span>
              </div>
              <div class="progress-bar mb-2">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <div class="flex justify-between text-sm text-gray-500">
                <span>${lessonsCompleted} из ${totalLessons} уроков</span>
                <span>До конца: ${timeLeft}</span>
              </div>
              <div class="mt-3 flex space-x-2">
                <a href="course-detail.html?id=${course.courseid}" class="px-3 py-1 bg-primary-500 text-white rounded-md text-sm hover:bg-primary-600 transition">
                  Продолжить
                </a>
              </div>`;
            activeCoursesListEl.appendChild(courseEl);
          });
        } catch (error) {
          console.error('Ошибка загрузки курсов:', error);
          if (coursesLoadingMsg) coursesLoadingMsg.classList.add('hidden');
          activeCoursesListEl.innerHTML = '<p class="text-red-500">Не удалось загрузить курсы. Попробуйте позже.</p>';
        }
    }

    async function loadAnswersFeed() {
        if (!answersFeedListEl) return;
        if (answersLoadingMsg) answersLoadingMsg.textContent = 'Загрузка ленты ответов...';
        answersFeedListEl.innerHTML = '';
        // TODO: Загрузить ленту ответов
        // Пример заглушки:
        setTimeout(() => {
             if (answersLoadingMsg) answersLoadingMsg.classList.add('hidden');
            answersFeedListEl.innerHTML = '<p class="text-gray-500">Лента ответов пока пуста.</p>';
        }, 1500);
        console.log("Загрузка ленты ответов...");
    }
    async function loadSchedule() {
         if (!scheduleListEl) return;
        if (scheduleLoadingMsg) scheduleLoadingMsg.textContent = 'Загрузка расписания...';
        scheduleListEl.innerHTML = '';
        // TODO: Загрузить расписание
        // Пример заглушки:
        setTimeout(() => {
            if (scheduleLoadingMsg) scheduleLoadingMsg.classList.add('hidden');
            scheduleListEl.innerHTML = '<p class="text-gray-500">В ближайшее время занятий нет.</p>';
        }, 1500);
        console.log("Загрузка расписания...");
    }
    async function loadUpcomingTests() {
        if (!upcomingTestsListEl) return;
        if (testsLoadingMsg) testsLoadingMsg.textContent = 'Загрузка ближайших тестов...';
        upcomingTestsListEl.innerHTML = '';
        // TODO: Загрузить ближайшие тесты
        // Пример заглушки:
        setTimeout(() => {
            if (testsLoadingMsg) testsLoadingMsg.classList.add('hidden');
            upcomingTestsListEl.innerHTML = '<p class="text-gray-500">Ближайших тестов не запланировано.</p>';
        }, 1500);
        console.log("Загрузка ближайших тестов...");
    }
     async function loadNotifications() {
        if (!notificationsListEl) return;
        notificationsListEl.innerHTML = '<p class="p-4 text-sm text-gray-500">Загрузка уведомлений...</p>';
        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/notifications`);
            // userNotifications = data.notifications || data;
            // Заглушка:
            userNotifications = [
                { id: 1, message: "Проверка ДЗ по 'Основам Алгебры'", timeAgo: "15 минут назад", icon: "fa-check-circle", link: "#" },
                { id: 2, message: "Новый материал: 'Интегралы'", timeAgo: "2 часа назад", icon: "fa-book-open", link: "#" },
            ];
            renderNotifications();
        } catch (error) {
            console.error("Ошибка загрузки уведомлений:", error);
            notificationsListEl.innerHTML = '<p class="p-4 text-sm text-red-500">Не удалось загрузить уведомления.</p>';
        }
    }

    // --- Initial Data Load ---
    async function initializeDashboard() {
        await fetchUserData(); 
        if (currentUser) { 
            loadUserCourses();
            loadAnswersFeed();
            loadSchedule();
            loadUpcomingTests();
            loadNotifications();
        }
    }

    initializeDashboard();

});