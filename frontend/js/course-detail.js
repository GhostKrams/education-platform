document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selectors ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const notificationsListContainer = document.getElementById('notificationsListContainer');
    const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
    const notificationCountBadge = document.getElementById('notificationCountBadge');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const addLessonBtn = document.getElementById('addLessonBtn');
    const addLessonModal = document.getElementById('addLessonModal');
    const closeAddLessonModalBtn = document.getElementById('closeAddLessonModalBtn');
    const cancelAddLessonBtn = document.getElementById('cancelAddLessonBtn');
    const addLessonForm = document.getElementById('addLessonForm');
    const addLessonFormError = document.getElementById('addLessonFormError');
    const courseTitleHeader = document.getElementById('courseTitleHeader');
    const courseProgressPercent = document.getElementById('courseProgressPercent');
    const courseProgressFill = document.getElementById('courseProgressFill');
    const completedLessonsCount = document.getElementById('completedLessonsCount');
    const totalLessonsCount = document.getElementById('totalLessonsCount');
    const lessonsList = document.getElementById('lessonsList');
    const lessonsLoadingMsg = document.getElementById('lessonsLoadingMsg');
    const studentsList = document.getElementById('studentsList');
    const studentsLoadingMsg = document.getElementById('studentsLoadingMsg');
    const courseStatsContent = document.getElementById('courseStatsContent');
    const statsLoadingMsg = document.getElementById('statsLoadingMsg');
    const notificationPopupContainer = document.getElementById('notificationPopupContainer');
    const tabButtons = document.querySelectorAll('.tab-button');

    // --- State ---
    let currentUser = null;
    let userNotifications = [];
    const API_BASE_URL = 'http://localhost:3000/api';
    const urlParams = new URLSearchParams(window.location.search);
    const courseId = urlParams.get('courseid') || urlParams.get('courseId');

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
    toggleDropdown(userMenuBtn, userMenuDropdown, [notificationsDropdown]);

    document.addEventListener('click', (e) => {
        if (notificationsDropdown && !notificationsDropdown.contains(e.target) && e.target !== notificationsBtn) {
            notificationsDropdown.classList.add('hidden');
        }
        if (userMenuDropdown && !userMenuDropdown.contains(e.target) && e.target !== userMenuBtn) {
            userMenuDropdown.classList.add('hidden');
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (notificationsDropdown) notificationsDropdown.classList.add('hidden');
            if (userMenuDropdown) userMenuDropdown.classList.add('hidden');
            if (addLessonModal && addLessonModal.classList.contains('active')) closeModal(addLessonModal);
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
            if (addLessonFormError) addLessonFormError.classList.add('hidden');
        }
    }

    if (addLessonBtn) {
        addLessonBtn.addEventListener('click', () => openModal(addLessonModal));
    }
    if (closeAddLessonModalBtn) {
        closeAddLessonModalBtn.addEventListener('click', () => closeModal(addLessonModal));
    }
    if (cancelAddLessonBtn) {
        cancelAddLessonBtn.addEventListener('click', () => closeModal(addLessonModal));
    }
    if (addLessonModal) {
        addLessonModal.addEventListener('click', (e) => {
            if (e.target === addLessonModal) {
                closeModal(addLessonModal);
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
            bgColor = 'bg-green-100';
            textColor = 'text-green-800';
            iconClass = 'fas fa-check-circle';
        } else if (type === 'error') {
            bgColor = 'bg-red-100';
            textColor = 'text-red-800';
            iconClass = 'fas fa-exclamation-circle';
        }

        popup.id = popupId;
        popup.className = `${bgColor} ${textColor} p-3 shadow-md flex justify-between items-center mb-2 rounded-md pointer-events-auto`;
        popup.innerHTML = `
            <div class="flex items-center">
                <i class="${iconClass} mr-2"></i>
                <span>${message}</span>
            </div>
            <button data-dismiss="${popupId}" class="text-sm font-medium hover:text-gray-900">
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
        if (!notificationsListContainer || !notificationCountBadge) return;
        notificationsListContainer.innerHTML = '';

        if (userNotifications.length === 0) {
            notificationsListContainer.innerHTML = '<p class="text-gray-500 text-center">Нет новых уведомлений.</p>';
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
                <div class="flex items-center space-x-3">
                    <i class="${notif.icon || 'fas fa-bell'} text-primary-500"></i>
                    <div>
                        <p class="text-sm font-medium text-gray-800">${notif.message || 'Новое уведомление'}</p>
                        <p class="text-xs text-gray-500">${notif.timeAgo || 'Недавно'}</p>
                    </div>
                </div>
            `;
            item.addEventListener('click', () => {
                console.log('Notification clicked:', notif);
                notificationsDropdown.classList.add('hidden');
            });
            notificationsListContainer.appendChild(item);
        });
    }

    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', () => {
            userNotifications = [];
            renderNotifications();
            showNotificationPopup('Все уведомления очищены.', 'success');
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

    // --- Tab Switching ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.getAttribute('data-tab');
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.querySelectorAll('.tab-button').forEach(btn => {
                btn.classList.remove('border-primary-500', 'text-primary-600');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            });
            document.getElementById(tabId).classList.add('active');
            button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            button.classList.add('border-primary-500', 'text-primary-600');
        });
    });

    // --- User Data Initialization ---
    function updateUserDataUI(userData) {
        if (!userData) {
            localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
            return;
        }
        currentUser = userData;
        const defaultAvatar = 'assets/images/default-avatar.png';
        document.getElementById('sidebarUserName').textContent = userData.fullname || 'Пользователь';
        document.getElementById('sidebarUserRole').textContent = userData.role || 'Статус';
        document.getElementById('sidebarUserAvatar').src = userData.avatarUrl || defaultAvatar;
        document.getElementById('headerUserName').textContent = userData.fullname || 'Пользователь';
        document.getElementById('headerUserAvatar').src = userData.avatarUrl || defaultAvatar;

        if (addLessonBtn && (userData.role === 'Teacher' || userData.role === 'Admin')) {
            addLessonBtn.classList.remove('hidden');
        } else if (addLessonBtn) {
            addLessonBtn.classList.add('hidden');
        }
    }

    function initializeUserData() {
        const cachedUser = localStorage.getItem('currentUser');
        if (!cachedUser) {
            window.location.href = 'auth.html';
            return;
        }
        const userData = JSON.parse(cachedUser);
        updateUserDataUI(userData);
    }

    // --- Course Data Loading ---
    async function loadCourseDetails() {
        if (!courseId) {
            showNotificationPopup('ID курса не указан.', 'error');
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/course-detail?courseId=${encodeURIComponent(courseId)}&email=${encodeURIComponent(currentUser.email)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка загрузки данных курса');

            courseTitleHeader.textContent = data.course.title || 'Название курса';
            courseProgressPercent.textContent = `${data.course.progress || 0}%`;
            courseProgressFill.style.width = `${data.course.progress || 0}%`;
            completedLessonsCount.textContent = data.course.lessons_completed || 0;
            totalLessonsCount.textContent = data.course.total_lessons || 0;
        } catch (error) {
            console.error('Ошибка загрузки данных курса:', error);
            showNotificationPopup(`Ошибка: ${error.message}`, 'error');
        }
    }

    // --- Lessons Loading ---
    async function loadLessons() {
        if (!lessonsList || !lessonsLoadingMsg) return;
        lessonsLoadingMsg.textContent = 'Загрузка уроков...';
        lessonsList.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/course-detail/lessons?courseId=${encodeURIComponent(courseId)}&email=${encodeURIComponent(currentUser.email)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка загрузки уроков');

            lessonsLoadingMsg.classList.add('hidden');
            if (data.lessons.length === 0) {
                lessonsList.innerHTML = '<p class="text-gray-500 text-center">Уроки отсутствуют.</p>';
                return;
            }

            data.lessons.forEach((lesson, index) => {
                const lessonEl = document.createElement('li');
                const isCompleted = lesson.is_completed ? 'lesson-completed' : '';
                lessonEl.className = `p-6 hover:bg-gray-50 transition ${isCompleted}`;
                lessonEl.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <span class="lesson-number-badge bg-primary-500 text-white rounded-full w-8 h-8 flex items-center justify-center">${index + 1}</span>
                        <div class="flex-1">
                            <h4 class="text-lg font-medium text-gray-800">${lesson.title}</h4>
                            <p class="text-gray-600">${lesson.description || 'Нет описания'}</p>
                            ${lesson.date ? `<p class="text-sm text-gray-500">Дата: ${new Date(lesson.date).toLocaleDateString('ru-RU')}</p>` : ''}
                        </div>
                        <a href="lesson.html?courseId=${courseId}&lessonId=${lesson.lessonid}" class="text-primary-600 hover:text-primary-800 font-medium">Перейти к уроку</a>
                    </div>
                `;
                lessonsList.appendChild(lessonEl);
            });
        } catch (error) {
            console.error('Ошибка загрузки уроков:', error);
            lessonsLoadingMsg.classList.add('hidden');
            lessonsList.innerHTML = '<p class="text-red-500 text-center">Не удалось загрузить уроки.</p>';
        }
    }

    // --- Students Loading ---
    async function loadStudents() {
        if (!studentsList || !studentsLoadingMsg) return;
        studentsLoadingMsg.textContent = 'Загрузка списка учеников...';
        studentsList.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/course-detail/students?courseId=${encodeURIComponent(courseId)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка загрузки списка учеников');

            studentsLoadingMsg.classList.add('hidden');
            if (data.students.length === 0) {
                studentsList.innerHTML = '<p class="text-gray-500 text-center">Ученики отсутствуют.</p>';
                return;
            }

            data.students.forEach(student => {
                const studentEl = document.createElement('div');
                studentEl.className = 'p-6 flex items-center justify-between border-b border-gray-100';
                studentEl.innerHTML = `
                    <div class="flex items-center space-x-4">
                        <img src="${student.avatarUrl || 'assets/images/default-avatar.png'}" alt="Avatar" class="w-10 h-10 rounded-full">
                        <div>
                            <p class="font-medium text-gray-800">${student.fullname}</p>
                            <p class="text-sm text-gray-500">${student.email}</p>
                        </div>
                    </div>
                    <p class="text-sm text-gray-600">Прогресс: ${student.progress || 0}%</p>
                `;
                studentsList.appendChild(studentEl);
            });
        } catch (error) {
            console.error('Ошибка загрузки списка учеников:', error);
            studentsLoadingMsg.classList.add('hidden');
            studentsList.innerHTML = '<p class="text-red-500 text-center">Не удалось загрузить список учеников.</p>';
        }
    }

    // --- Course Stats Loading ---
    async function loadCourseStats() {
        if (!courseStatsContent || !statsLoadingMsg) return;
        statsLoadingMsg.textContent = 'Загрузка статистики...';
        courseStatsContent.innerHTML = '';

        try {
            const response = await fetch(`${API_BASE_URL}/course-detail/stats?courseId=${encodeURIComponent(courseId)}`, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка загрузки статистики');

            statsLoadingMsg.classList.add('hidden');
            courseStatsContent.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div class="p-4 bg-white rounded-lg shadow">
                        <p class="text-sm text-gray-500">Средний прогресс</p>
                        <p class="text-2xl font-semibold text-gray-800">${data.stats.avg_progress || 0}%</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <p class="text-sm text-gray-500">Всего учеников</p>
                        <p class="text-2xl font-semibold text-gray-800">${data.stats.total_students || 0}</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <p class="text-sm text-gray-500">Завершено уроков (в среднем)</p>
                        <p class="text-2xl font-semibold text-gray-800">${data.stats.avg_lessons_completed || 0}</p>
                    </div>
                    <div class="p-4 bg-white rounded-lg shadow">
                        <p class="text-sm text-gray-500">Средний балл за ДЗ</p>
                        <p class="text-2xl font-semibold text-gray-800">${data.stats.avg_homework_grade || 0}</p>
                    </div>
                </div>
            `;
        } catch (error) {
            console.error('Ошибка загрузки статистики:', error);
            statsLoadingMsg.classList.add('hidden');
            courseStatsContent.innerHTML = '<p class="text-red-500 text-center">Не удалось загрузить статистику.</p>';
        }
    }

    // --- Add Lesson Form Submission ---
    if (addLessonForm) {
        addLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(addLessonForm);
            const lessonData = {
                courseId: courseId,
                title: formData.get('title'),
                description: formData.get('description'),
                date: formData.get('lesson_date') || null
            };

            if (!lessonData.title) {
                addLessonFormError.textContent = 'Название урока обязательно';
                addLessonFormError.classList.remove('hidden');
                return;
            }

            try {
                const response = await fetch(`${API_BASE_URL}/course-detail/lessons`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(lessonData)
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Ошибка создания урока');

                showNotificationPopup('Урок успешно создан!', 'success');
                loadLessons();
                closeModal(addLessonModal);
                addLessonForm.reset();
            } catch (error) {
                console.error('Ошибка создания урока:', error);
                if (addLessonFormError) {
                    addLessonFormError.textContent = `Ошибка: ${error.message}`;
                    addLessonFormError.classList.remove('hidden');
                }
            }
        });
    }

    // --- Load Notifications ---
    async function loadNotifications() {
        if (!notificationsListContainer) return;
        notificationsListContainer.innerHTML = '<p class="text-gray-500 text-center">Загрузка уведомлений...</p>';
        try {
            userNotifications = [
                { id: 1, message: "Новый урок добавлен в курс", timeAgo: "15 минут назад", icon: "fas fa-book-open", link: "#" },
                { id: 2, message: "Оценка за ДЗ обновлена", timeAgo: "1 час назад", icon: "fas fa-check-circle", link: "#" }
            ];
            renderNotifications();
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
            notificationsListContainer.innerHTML = '<p class="text-red-500 text-center">Не удалось загрузить уведомления.</p>';
        }
    }

    // --- Initialize Dashboard ---
    async function initializeDashboard() {
        initializeUserData();
        if (currentUser && courseId) {
            loadCourseDetails();
            loadLessons();
            loadStudents();
            loadCourseStats();
            loadNotifications();
        } else {
            showNotificationPopup('Ошибка: пользователь или курс не найден.', 'error');
        }
    }

    initializeDashboard();
});