document.addEventListener('DOMContentLoaded', function () {
    // --- DOM Element Selectors ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationsListEl = document.getElementById('notificationsList');
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
    const API_BASE_URL = 'http://localhost:3000/api';

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
                document.querySelectorAll('.fixed.z-\\[1060\\]').forEach(d => d.classList.add('hidden'));
                if (isHidden) {
                    dropdown.classList.remove('hidden');
                }
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
            if (courseFormError) courseFormError.classList.add('hidden');
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
                startDate: formData.get('startDate') || null,
                endDate: formData.get('endDate') || null,
                teacherId: currentUser.userId
            };

            console.log('Данные для создания курса:', courseData);
            if (courseFormError) courseFormError.classList.add('hidden');

            try {
                const response = await fetch(`${API_BASE_URL}/courses`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(courseData)
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Не удалось создать курс');
                }
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
                notificationsDropdown.classList.add('hidden');
            });
            notificationsListEl.appendChild(item);
        });
    }

    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', async () => {
            try {
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
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
            return;
        }
        currentUser = userData;
        const defaultAvatar = 'assets/images/default-avatar.png';

        if (sidebarUserName) sidebarUserName.textContent = userData.fullname || 'Пользователь';
        if (sidebarUserRole) sidebarUserRole.textContent = userData.role || 'Статус';
        if (sidebarUserAvatar) sidebarUserAvatar.src = userData.avatarUrl || defaultAvatar;

        if (headerUserName) headerUserName.textContent = userData.fullname || 'Пользователь';
        if (headerUserAvatar) headerUserAvatar.src = userData.avatarUrl || defaultAvatar;

        if (addCourseBtn && (userData.role === 'Teacher' || userData.role === 'Admin')) {
            addCourseBtn.classList.remove('hidden');
        } else if (addCourseBtn) {
            addCourseBtn.classList.add('hidden');
        }
    }

    function initializeUserData() {
        const cachedUser = localStorage.getItem('currentUser');
        if (!cachedUser) {
            console.log('currentUser отсутствует в localStorage, перенаправление на auth.html');
            window.location.href = 'auth.html';
            return;
        }

        const userData = JSON.parse(cachedUser);
        console.log('Инициализация currentUser:', userData);
        updateUserDataUI(userData);
    }

    async function loadUserCourses() {
        if (!activeCoursesListEl) {
            console.log('activeCoursesListEl не найден в DOM');
            return;
        }
        if (coursesLoadingMsg) coursesLoadingMsg.textContent = 'Загрузка активных курсов...';
        activeCoursesListEl.innerHTML = '';

        try {
            const userEmail = currentUser.email;
            console.log('Отправка запроса для email:', userEmail);
            const response = await fetch(`${API_BASE_URL}/courses?email=${encodeURIComponent(userEmail)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            console.log('Полученные данные от сервера:', data);
            if (!response.ok) {
                throw new Error(data.message || 'Ошибка загрузки курсов');
            }

            const courses = data.courses || [];
            console.log('Извлечённые курсы:', courses);

            if (coursesLoadingMsg) coursesLoadingMsg.classList.add('hidden');

            if (courses.length === 0) {
                activeCoursesListEl.innerHTML = '<p class="text-gray-500">У вас пока нет активных курсов.</p>';
                return;
            }

            courses.forEach(course => {
                const courseEl = document.createElement('div');
                // Добавляем inline-стили для видимости
                courseEl.style.border = '1px solid #e5e7eb';
                courseEl.style.borderRadius = '0.5rem';
                courseEl.style.padding = '1rem';
                courseEl.style.marginBottom = '1rem';
                courseEl.style.backgroundColor = '#ffffff';
                courseEl.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)';
                courseEl.style.transition = 'box-shadow 0.3s ease';

                const progress = course.progress || 0;
                const lessonsCompleted = course.lessons_completed || 0;
                const totalLessons = course.total_lessons || 1;
                const timeLeft = course.time_left || 'Не указано';

                courseEl.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                        <h3 style="font-size: 1.125rem; font-weight: 600; color: #1f2937;">${course.title}</h3>
                        <span style="color: #f97316; font-weight: 500;">${progress}%</span>
                    </div>
                    <div style="height: 8px; border-radius: 4px; background-color: #e5e7eb; overflow: hidden; margin-bottom: 0.5rem;">
                        <div style="height: 100%; border-radius: 4px; background-color: #f97316; width: ${progress}%; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 0.875rem; color: #6b7280;">
                        <span>${lessonsCompleted} из ${totalLessons} уроков</span>
                        <span>До конца: ${timeLeft}</span>
                    </div>
                    <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
                        <a href="course-detail.html?courseId=${course.courseid}" style="padding: 0.25rem 0.75rem; background-color: #f97316; color: white; border-radius: 0.375rem; font-size: 0.875rem; text-decoration: none; transition: background-color 0.3s ease;">
                            Продолжить
                        </a>
                    </div>`;
                activeCoursesListEl.appendChild(courseEl);
                console.log('Добавлен курс в DOM:', course.title);
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
        initializeUserData();
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