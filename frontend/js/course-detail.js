document.addEventListener('DOMContentLoaded', function() {
    const API_BASE_URL = '/api'; // Adjust if your API is hosted elsewhere

    // --- General UI Elements (potentially shared with other dashboard pages) ---
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
    const notificationPopupContainer = document.getElementById('notificationPopupContainer');
    
    // User info placeholders
    const sidebarUserAvatar = document.getElementById('sidebarUserAvatar');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserRole = document.getElementById('sidebarUserRole');
    const headerUserAvatar = document.getElementById('headerUserAvatar');
    const headerUserName = document.getElementById('headerUserName');

    // --- Course Detail Specific Elements ---
    const courseTitleHeader = document.getElementById('courseTitleHeader');
    const courseProgressPercent = document.getElementById('courseProgressPercent');
    const completedLessonsCount = document.getElementById('completedLessonsCount');
    const totalLessonsCount = document.getElementById('totalLessonsCount');
    const courseProgressFill = document.getElementById('courseProgressFill');

    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    const lessonsListEl = document.getElementById('lessonsList');
    const studentsListEl = document.getElementById('studentsList');
    const courseStatsContentEl = document.getElementById('courseStatsContent');
    
    const addLessonBtn = document.getElementById('addLessonBtn');
    const addLessonModal = document.getElementById('addLessonModal');
    const closeAddLessonModalBtn = document.getElementById('closeAddLessonModalBtn');
    const cancelAddLessonBtn = document.getElementById('cancelAddLessonBtn');
    const addLessonForm = document.getElementById('addLessonForm');
    const addLessonFormError = document.getElementById('addLessonFormError');

    // Loading messages
    const lessonsLoadingMsg = document.getElementById('lessonsLoadingMsg');
    const studentsLoadingMsg = document.getElementById('studentsLoadingMsg');
    const statsLoadingMsg = document.getElementById('statsLoadingMsg');

    let currentCourseId = null;
    let currentUser = null;

    // --- Shared UI Functions (Consider moving to a global script if used on multiple pages) ---
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
                // Hide all other open dropdowns first
                document.querySelectorAll('.fixed.z-\\[1060\\]').forEach(d => {
                    if (d !== dropdown) d.classList.add('hidden');
                });
                dropdown.classList.toggle('hidden', !isHidden);
            });
        }
    }
    toggleDropdown(notificationsBtn, notificationsDropdown);
    if(userMenuBtn) toggleDropdown(userMenuBtn, userMenuDropdown);

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
            if (addLessonModal && addLessonModal.classList.contains('active')) closeModal(addLessonModal);
        }
    });

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
    
    function showNotificationPopup(message, type = 'info') {
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
    // --- End Shared UI Functions ---


    // --- Tab Switching Logic ---
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.dataset.tab;

            tabButtons.forEach(btn => {
                btn.classList.remove('border-primary-500', 'text-primary-600');
                btn.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
                btn.removeAttribute('aria-current');
            });

            button.classList.add('border-primary-500', 'text-primary-600');
            button.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
            button.setAttribute('aria-current', 'page');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === targetTab) {
                    content.classList.add('active');
                }
            });
            // Load content for the active tab if not already loaded
            if (targetTab === 'students') loadCourseStudents(currentCourseId);
            else if (targetTab === 'stats') loadCourseStats(currentCourseId);
        });
    });

    // --- Add Lesson Modal ---
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
            if (e.target === addLessonModal) closeModal(addLessonModal);
        });
    }

    if (addLessonForm) {
        addLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!currentCourseId) {
                showNotificationPopup("ID курса не определен.", "error");
                return;
            }
            const formData = new FormData(addLessonForm);
            const lessonData = {
                course_id: currentCourseId,
                title: formData.get('title'),
                description: formData.get('description'),
                lesson_date: formData.get('lesson_date') || null
                // Поля для видео, конспекта, ДЗ можно добавить здесь
            };

            if (addLessonFormError) addLessonFormError.classList.add('hidden');
            try {
                // const newLesson = await fetchWithAuth(`${API_BASE_URL}/lessons`, { // Или /courses/${currentCourseId}/lessons
                //     method: 'POST',
                //     body: JSON.stringify(lessonData),
                // });
                console.log("Отправка урока:", lessonData); // Заглушка
                showNotificationPopup("Урок успешно добавлен (демо).", "success");
                loadCourseContent(currentCourseId); // Обновить список уроков
                closeModal(addLessonModal);
                addLessonForm.reset();
            } catch (error) {
                console.error("Ошибка добавления урока:", error);
                 if (addLessonFormError) {
                    addLessonFormError.textContent = `Ошибка: ${error.message}`;
                    addLessonFormError.classList.remove('hidden');
                } else {
                    showNotificationPopup(`Ошибка: ${error.message}`, 'error');
                }
            }
        });
    }
    
    // --- Helper: fetchWithAuth ---
    async function fetchWithAuth(url, options = {}) {
        const token = localStorage.getItem('authToken');
        if (!token) {
            window.location.href = 'auth.html';
            throw new Error('Пользователь не авторизован');
        }
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...options.headers,};
        const response = await fetch(url, { ...options, headers });
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('authToken'); localStorage.removeItem('currentUser');
            window.location.href = 'auth.html';
            throw new Error('Ошибка авторизации');
        }
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || 'Сетевая ошибка');
        }
        return response.json();
    }

    // --- Load User Data ---
    async function loadUserData() {
        try {
            const cachedUser = localStorage.getItem('currentUser');
            if (cachedUser) {
                currentUser = JSON.parse(cachedUser);
                updateUserUI(currentUser);
            }
            const data = await fetchWithAuth(`${API_BASE_URL}/users/me`);
            currentUser = data.user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            updateUserUI(currentUser);
        } catch (error) {
            console.error("Не удалось загрузить данные пользователя:", error.message);
            // Редирект на логин произойдет в fetchWithAuth, если токен невалиден
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

        // Показать кнопку добавления урока, если пользователь - преподаватель или админ этого курса
        // (Предполагается, что информация о курсе содержит ID преподавателя или флаг админа)
        if (addLessonBtn && (currentUser?.role === 'Teacher' || currentUser?.role === 'Admin')) { // Упрощенная проверка
             // Более точная проверка: currentUser.userId === courseDetails.teacherId || currentUser.role === 'Admin'
            addLessonBtn.classList.remove('hidden');
        }
    }
    
    // --- Load Course Details ---
    async function loadCourseDetails(courseId) {
        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}`);
            // const course = data.course || data;
            // Заглушка:
            const course = {
                title: "Годовой курс 2024–2025 — ОГЭ (демо)",
                progress: 75, // %
                lessons_completed: 12,
                total_lessons: 16,
                // teacherId: 1, // ID преподавателя курса
            };
            if (!course) throw new Error("Курс не найден");

            if(courseTitleHeader) courseTitleHeader.textContent = course.title;
            if(courseProgressPercent) courseProgressPercent.textContent = `${course.progress || 0}%`;
            if(completedLessonsCount) completedLessonsCount.textContent = course.lessons_completed || 0;
            if(totalLessonsCount) totalLessonsCount.textContent = course.total_lessons || 0;
            if(courseProgressFill) courseProgressFill.style.width = `${course.progress || 0}%`;
            
            // После загрузки данных курса, можно обновить видимость кнопки "Добавить урок" более точно
             if (addLessonBtn && currentUser && (currentUser.userid === course.teacherid || currentUser.role === 'Admin')) {
                addLessonBtn.classList.remove('hidden');
            } else if (addLessonBtn) {
                addLessonBtn.classList.add('hidden');
            }

        } catch (error) {
            console.error(`Ошибка загрузки деталей курса ${courseId}:`, error);
            if(courseTitleHeader) courseTitleHeader.textContent = "Ошибка загрузки курса";
            showNotificationPopup(`Не удалось загрузить данные курса: ${error.message}`, "error");
        }
    }

    // --- Load Course Content (Lessons) ---
    async function loadCourseContent(courseId) {
        if (!lessonsListEl || !lessonsLoadingMsg) return;
        lessonsLoadingMsg.classList.remove('hidden');
        lessonsListEl.innerHTML = '';
        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/lessons`);
            // const lessons = data.lessons || data;
             // Заглушка:
            const lessons = [
                { lesson_id: 1, title: "Алгебраические выражения", description: "Основные понятия алгебры, работа с выражениями, упрощение.", lesson_date: "2024-04-12", is_completed: true },
                { lesson_id: 2, title: "Линейные уравнения", description: "Решение линейных уравнений с одной переменной, примеры задач.", lesson_date: "2024-04-19", is_completed: false },
                { lesson_id: 3, title: "Квадратные уравнения", description: "Формулы решения квадратных уравнений, дискриминант, теорема Виета.", lesson_date: "2024-04-26", is_completed: false }
            ];

            lessonsLoadingMsg.classList.add('hidden');
            if (!lessons || lessons.length === 0) {
                lessonsListEl.innerHTML = '<p class="p-6 text-gray-500">В этом курсе пока нет уроков.</p>';
                return;
            }

            lessons.forEach((lesson, index) => {
                const li = document.createElement('li');
                li.className = `px-6 py-4 hover:bg-gray-50 transition lesson-item ${lesson.is_completed ? 'lesson-completed' : ''}`;
                li.dataset.lessonId = lesson.lesson_id;

                li.innerHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0 pt-1">
                            <div class="flex items-center justify-center h-10 w-10 rounded-md ${lesson.is_completed ? 'bg-green-500' : 'bg-primary-500'} text-white lesson-number-badge">
                                <span class="font-medium">${lesson.is_completed ? '<i class="fas fa-check"></i>' : index + 1}</span>
                            </div>
                        </div>
                        <div class="ml-4 flex-1">
                            <div class="flex items-center justify-between">
                                <h3 class="text-base font-medium text-gray-900">${lesson.title}</h3>
                                ${lesson.lesson_date ? `<span class="text-sm text-gray-500">${new Date(lesson.lesson_date).toLocaleDateString('ru-RU')}</span>` : ''}
                            </div>
                            <p class="mt-1 text-sm text-gray-500">${lesson.description || ''}</p>
                            </div>
                        <div class="ml-4 flex-shrink-0">
                            <button class="mark-completed-btn px-3 py-1 rounded-md text-sm transition flex items-center ${
                                lesson.is_completed 
                                ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                                : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                            }" data-lesson-id="${lesson.lesson_id}" data-completed="${lesson.is_completed}">
                                <i class="fas fa-check mr-1"></i> ${lesson.is_completed ? 'Просмотрено' : 'Отметить'}
                            </button>
                        </div>
                    </div>
                `;
                // --- Добавляем обработчик для перехода на lesson.html ---
                li.addEventListener('click', function(e) {
                    // Не срабатывает, если клик по кнопке "Отметить"
                    if (e.target.closest('.mark-completed-btn')) return;
                    window.location.href = `lesson.html?lessonId=${lesson.lesson_id}&courseId=${courseId}`;
                });
                lessonsListEl.appendChild(li);
            });

            // Add event listeners to "mark completed" buttons
            document.querySelectorAll('.mark-completed-btn').forEach(button => {
                button.addEventListener('click', handleMarkLessonCompleted);
            });

        } catch (error) {
            console.error(`Ошибка загрузки уроков для курса ${courseId}:`, error);
            lessonsLoadingMsg.classList.add('hidden');
            lessonsListEl.innerHTML = '<p class="p-6 text-red-500">Не удалось загрузить уроки.</p>';
        }
    }
    
    async function handleMarkLessonCompleted(event) {
        const button = event.currentTarget;
        const lessonId = button.dataset.lessonId;
        const currentCompletedStatus = button.dataset.completed === 'true';
        const newCompletedStatus = !currentCompletedStatus;

        try {
            // const response = await fetchWithAuth(`${API_BASE_URL}/lessons/${lessonId}/complete`, {
            //     method: 'POST', // or PUT
            //     body: JSON.stringify({ completed: newCompletedStatus })
            // });
            console.log(`Урок ${lessonId} отмечен как ${newCompletedStatus ? 'просмотренный' : 'не просмотренный'} (демо)`); // Заглушка

            // Update UI optimistically or based on response
            const listItem = button.closest('.lesson-item');
            button.dataset.completed = newCompletedStatus.toString();
            const iconElement = button.querySelector('i');
            const numberBadge = listItem.querySelector('.lesson-number-badge');
            const lessonNumber = Array.from(lessonsListEl.children).indexOf(listItem) + 1;


            if (newCompletedStatus) {
                button.innerHTML = `<i class="fas fa-check mr-1"></i> Просмотрено`;
                button.classList.remove('border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
                button.classList.add('bg-green-100', 'text-green-800', 'hover:bg-green-200');
                listItem.classList.add('lesson-completed');
                if (numberBadge) {
                    numberBadge.classList.remove('bg-primary-500');
                    numberBadge.classList.add('bg-green-500');
                    numberBadge.innerHTML = '<i class="fas fa-check"></i>';
                }
            } else {
                button.innerHTML = `<i class="fas fa-check mr-1"></i> Отметить`;
                button.classList.add('border', 'border-gray-300', 'text-gray-700', 'hover:bg-gray-50');
                button.classList.remove('bg-green-100', 'text-green-800', 'hover:bg-green-200');
                listItem.classList.remove('lesson-completed');
                 if (numberBadge) {
                    numberBadge.classList.add('bg-primary-500');
                    numberBadge.classList.remove('bg-green-500');
                    numberBadge.innerHTML = `<span class="font-medium">${lessonNumber}</span>`;
                }
            }
            // TODO: Recalculate and update overall course progress
            // updateCourseProgress(); 
        } catch (error) {
            console.error("Ошибка изменения статуса урока:", error);
            showNotificationPopup(`Ошибка: ${error.message}`, "error");
        }
    }

    // --- Load Course Students (Placeholder) ---
    async function loadCourseStudents(courseId) {
        if (!studentsListEl || !studentsLoadingMsg || studentsListEl.dataset.loaded === 'true') return;
        studentsLoadingMsg.classList.remove('hidden');
        studentsListEl.innerHTML = ''; // Clear
        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/students`);
            // const students = data.students || data;
            // Заглушка:
            const students = [
                { userid: 10, fullname: "Иванова Мария", avatar_url: "https://randomuser.me/api/portraits/women/12.jpg", last_login_text: "2 часа назад", status: "Активен", status_color: "green" },
                { userid: 11, fullname: "Петров Алексей", avatar_url: "https://randomuser.me/api/portraits/men/32.jpg", last_login_text: "5 дней назад", status: "Неактивен", status_color: "yellow" }
            ];

            studentsLoadingMsg.classList.add('hidden');
            if (!students || students.length === 0) {
                studentsListEl.innerHTML = '<p class="p-6 text-gray-500">На этот курс еще не записаны ученики.</p>';
                return;
            }
            students.forEach(student => {
                const div = document.createElement('div');
                div.className = 'px-6 py-4 hover:bg-gray-50 transition';
                div.innerHTML = `
                    <div class="flex items-center">
                        <img src="${student.avatar_url || 'assets/images/default-avatar.png'}" alt="${student.fullname}" class="w-10 h-10 rounded-full mr-4">
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                <a href="profile.html?userId=${student.userid}" class="hover:text-primary-600">${student.fullname}</a>
                            </p>
                            <p class="text-sm text-gray-500 truncate">Последний вход: ${student.last_login_text}</p>
                        </div>
                        <div class="ml-4 flex-shrink-0">
                            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${student.status_color}-100 text-${student.status_color}-800">
                                ${student.status}
                            </span>
                        </div>
                    </div>`;
                studentsListEl.appendChild(div);
            });
            studentsListEl.dataset.loaded = 'true';
        } catch (error) {
            console.error("Ошибка загрузки учеников:", error);
            studentsLoadingMsg.classList.add('hidden');
            studentsListEl.innerHTML = '<p class="p-6 text-red-500">Не удалось загрузить список учеников.</p>';
        }
    }

    // --- Load Course Stats (Placeholder) ---
    async function loadCourseStats(courseId) {
        if (!courseStatsContentEl || !statsLoadingMsg || courseStatsContentEl.dataset.loaded === 'true') return;
        statsLoadingMsg.classList.remove('hidden');
        courseStatsContentEl.innerHTML = ''; // Clear
        try {
            // const stats = await fetchWithAuth(`${API_BASE_URL}/courses/${courseId}/stats`);
            // Заглушка:
            const stats = {
                lesson_progress: [
                    { title: "Урок 1: Алгебраические выражения", completion_rate: 85 },
                    { title: "Урок 2: Линейные уравнения", completion_rate: 72 }
                ],
                homework_stats: { total: 24, completed: 18, pending: 4, not_done: 2 }
            };
            
            statsLoadingMsg.classList.add('hidden');
            let html = `<div class="grid grid-cols-1 md:grid-cols-2 gap-6">`;
            // Completion stats
            html += `<div class="bg-gray-50 p-4 rounded-lg"><h3 class="text-base font-medium text-gray-900 mb-4">Прогресс прохождения уроков</h3><div class="space-y-4">`;
            stats.lesson_progress.forEach(lp => {
                html += `<div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm font-medium text-gray-700">${lp.title}</span>
                                <span class="text-sm text-gray-500">${lp.completion_rate}%</span>
                            </div>
                            <div class="progress-bar"><div class="progress-fill" style="width: ${lp.completion_rate}%"></div></div>
                        </div>`;
            });
            html += `</div></div>`;
            // Homework stats
            html += `<div class="bg-gray-50 p-4 rounded-lg"><h3 class="text-base font-medium text-gray-900 mb-4">Домашние задания</h3><div class="space-y-3">`;
            const hs = stats.homework_stats;
            html += `<div class="flex justify-between"><span class="text-sm text-gray-700">Всего заданий</span><span class="text-sm font-medium text-gray-900">${hs.total}</span></div>`;
            html += `<div class="flex justify-between"><span class="text-sm text-gray-700">Выполнено</span><span class="text-sm font-medium text-green-600">${hs.completed} (${Math.round(hs.completed/hs.total*100)}%)</span></div>`;
            html += `<div class="flex justify-between"><span class="text-sm text-gray-700">На проверке</span><span class="text-sm font-medium text-yellow-600">${hs.pending} (${Math.round(hs.pending/hs.total*100)}%)</span></div>`;
            html += `<div class="flex justify-between"><span class="text-sm text-gray-700">Не выполнено</span><span class="text-sm font-medium text-red-600">${hs.not_done} (${Math.round(hs.not_done/hs.total*100)}%)</span></div>`;
            html += `</div></div></div>`;
            courseStatsContentEl.innerHTML = html;
            courseStatsContentEl.dataset.loaded = 'true';
        } catch (error) {
            console.error("Ошибка загрузки статистики:", error);
            statsLoadingMsg.classList.add('hidden');
            courseStatsContentEl.innerHTML = '<p class="text-red-500">Не удалось загрузить статистику.</p>';
        }
    }
    
    // --- Load Notifications (Placeholder, could be shared) ---
    async function loadNotifications() {
        if (!notificationsListContainer) return;
        notificationsListContainer.innerHTML = '<p class="p-4 text-sm text-gray-500">Загрузка уведомлений...</p>';
        try {
            // const data = await fetchWithAuth(`${API_BASE_URL}/notifications`);
            // const notifications = data.notifications || data;
             // Заглушка
            const notifications = [
                { id: 1, message: "Новый комментарий к вашему ответу", timeAgo: "5 мин назад", icon: "fa-comment" },
                { id: 2, message: "Оценка за тест 'Введение' выставлена", timeAgo: "1 час назад", icon: "fa-check-double" }
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
     if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', () => {
            // TODO: API call to clear notifications
            notificationsListContainer.innerHTML = '<p class="p-4 text-sm text-gray-500">Нет новых уведомлений.</p>';
            if(notificationCountBadge) {notificationCountBadge.textContent = '0'; notificationCountBadge.classList.add('hidden');}
            showNotificationPopup('Все уведомления очищены (демо).');
        });
    }


    // --- Initialization ---
    async function init() {
        const urlParams = new URLSearchParams(window.location.search);
        currentCourseId = urlParams.get('courseId') || urlParams.get('id'); // Allow 'id' or 'courseId'

        if (!currentCourseId) {
            console.error("ID курса не найден в URL.");
            if(courseTitleHeader) courseTitleHeader.textContent = "Курс не найден";
            showNotificationPopup("Ошибка: ID курса не указан в URL.", "error");
            // Optionally redirect back or show a more prominent error
            return;
        }

        await loadUserData(); // Load user data first to determine roles etc.
        if (currentUser) { // Proceed only if user data is loaded
            loadCourseDetails(currentCourseId);
            loadCourseContent(currentCourseId); // Load initial tab content
            // Other tabs (students, stats) can be loaded on demand when clicked
            loadNotifications();
        }
    }

    init();
});