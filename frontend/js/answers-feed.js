document.addEventListener('DOMContentLoaded', () => {
    // DOM элементы
    const courseFilter = document.getElementById('course-filter');
    const lessonFilter = document.getElementById('lesson-filter');
    const lessonFilterContainer = document.getElementById('lesson-filter-container');
    const statusFilter = document.getElementById('status-filter');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const answersFeedContainer = document.getElementById('answers-feed-container');
    const loader = document.getElementById('loader');
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const overlay = document.getElementById('overlay');

    // Состояние
    let currentUser = null;
    let allLessons = [];
    const API_BASE_URL = 'http://localhost:3000/api';

    // Инициализация меню
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

    // Функции-помощники
    function getStatusBadge(status) {
        const statusMap = {
            'Требует проверки': 'bg-yellow-100 text-yellow-800',
            'Просмотрено': 'bg-blue-100 text-blue-800',
            'Принято': 'bg-green-100 text-green-800',
            'На доработку': 'bg-red-100 text-red-800',
        };
        const classes = statusMap[status] || 'bg-gray-100 text-gray-800';
        return `<span class="status-badge text-xs font-medium mr-2 px-2.5 py-0.5 rounded-full ${classes}">${status}</span>`;
    }

    // Загрузка данных
    async function fetchFromAPI(endpoint, options = {}) {
        try {
            const response = await fetch(`${API_BASE_URL}/${endpoint}`, options);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка сети');
            }
            return response.json();
        } catch (error) {
            console.error(`Ошибка при запросе к ${endpoint}:`, error);
            showNotification(`Ошибка: ${error.message}`, 'error');
            throw error;
        }
    }

    // Уведомления
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-md shadow-md ${
            type === 'error' ? 'bg-red-100 text-red-800' : 
            type === 'success' ? 'bg-green-100 text-green-800' : 
            'bg-blue-100 text-blue-800'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas ${type === 'error' ? 'fa-exclamation-circle' : type === 'success' ? 'fa-check-circle' : 'fa-info-circle'} mr-2"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    // Загрузка фильтров
    async function loadFilterOptions() {
        const data = await fetchFromAPI('answersFeed/filters');
        allLessons = data.lessons;

        // Заполняем фильтр курсов
        data.courses.forEach(course => {
            const option = new Option(course.title, course.id);
            courseFilter.add(option);
        });

        // Обработчик изменения курса
        courseFilter.addEventListener('change', () => {
            const selectedCourseId = courseFilter.value;
            lessonFilter.innerHTML = '<option value="">Все уроки</option>';
            if (selectedCourseId) {
                const lessonsForCourse = allLessons.filter(l => l.courseId == selectedCourseId);
                lessonsForCourse.forEach(lesson => {
                    const option = new Option(lesson.title, lesson.id);
                    lessonFilter.add(option);
                });
                lessonFilterContainer.classList.remove('hidden');
            } else {
                lessonFilterContainer.classList.add('hidden');
            }
            loadAnswersFeed();
        });
    }

    // Загрузка ленты ответов
    async function loadAnswersFeed() {
        loader.classList.remove('hidden');
        answersFeedContainer.innerHTML = '';
        
        const params = new URLSearchParams({
            email: currentUser.email,
            courseId: courseFilter.value,
            lessonId: lessonFilter.value,
            status: statusFilter.value,
        });

        try {
            const feedItems = await fetchFromAPI(`answersFeed?${params.toString()}`);
            loader.classList.add('hidden');

            if (feedItems.length === 0) {
                answersFeedContainer.innerHTML = '<p class="text-center text-gray-500 py-10">Ответов по заданным фильтрам не найдено.</p>';
                return;
            }

            feedItems.forEach(item => {
                const card = createAnswerCard(item);
                answersFeedContainer.appendChild(card);
            });
        } catch (error) {
            loader.classList.add('hidden');
        }
    }

    // Создание карточки ответа
    function createAnswerCard(item) {
        const card = document.createElement('div');
        card.className = `bg-white rounded-lg shadow-sm p-4 mb-4 ${item.level > 1 ? 'ml-8 border-l-2 border-gray-200' : ''}`;
        
        const isTeacher = currentUser.role === 'Teacher' || currentUser.role === 'Admin';
        const isOwner = item.user.id === currentUser.userid;
        const canReply = isOwner || isTeacher || item.user.role === 'Teacher';
        const canEdit = isOwner;
        const canSetStatus = isTeacher && !isOwner;
        const canGrade = isTeacher && item.isHomeworkSubmission && !isOwner;

        // Формируем HTML для вложения
        let attachmentHTML = '';
        if (item.attachment) {
            if (item.attachment.isImage) {
                attachmentHTML = `
                    <div class="mt-2">
                        <img src="${API_BASE_URL}/${item.attachment.path}" 
                             alt="${item.attachment.name}" 
                             class="max-w-full h-auto rounded border border-gray-200">
                    </div>
                `;
            } else {
                attachmentHTML = `
                    <div class="mt-2">
                        <a href="${API_BASE_URL}/${item.attachment.path}" 
                           target="_blank" 
                           class="text-primary-600 hover:underline">
                            <i class="fas fa-paperclip mr-1"></i> ${item.attachment.name}
                        </a>
                    </div>
                `;
            }
        }

        // Формируем HTML для оценки (если это ДЗ)
        let gradeHTML = '';
        if (item.isHomeworkSubmission) {
            gradeHTML = `
                <div class="mt-2 text-sm">
                    <span class="font-medium">Оценка:</span> 
                    ${item.submission?.grade ? item.submission.grade : 'не выставлена'}
                </div>
            `;
        }

        // Формируем HTML для кнопок действий
        let actionsHTML = '';
        if (canSetStatus) {
            actionsHTML = `
                <div class="mt-3 flex space-x-2">
                    ${item.isHomeworkSubmission ? `
                        <button class="approve-btn px-2 py-1 bg-green-100 text-green-800 text-sm rounded hover:bg-green-200">
                            <i class="fas fa-check mr-1"></i> Принять
                        </button>
                        <button class="reject-btn px-2 py-1 bg-red-100 text-red-800 text-sm rounded hover:bg-red-200">
                            <i class="fas fa-times mr-1"></i> Отклонить
                        </button>
                    ` : ''}
                    <button class="viewed-btn px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded hover:bg-blue-200">
                        <i class="fas fa-eye mr-1"></i> Просмотрено
                    </button>
                </div>
            `;
        }

        // Формируем HTML для формы ответа
        let replyFormHTML = '';
        if (canReply) {
            replyFormHTML = `
                <div class="mt-3 reply-form hidden">
                    <textarea class="reply-text w-full p-2 border rounded" placeholder="Ваш ответ..."></textarea>
                    <div class="mt-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Прикрепить файл (необязательно)</label>
                        <input type="file" class="reply-attachment w-full text-sm">
                    </div>
                    <div class="mt-2 flex justify-end space-x-2">
                        <button class="cancel-reply-btn px-3 py-1 border rounded text-sm">Отмена</button>
                        <button class="submit-reply-btn px-3 py-1 bg-primary-500 text-white rounded text-sm">Отправить</button>
                    </div>
                </div>
            `;
        }

        // Формируем HTML для формы редактирования
        let editFormHTML = '';
        if (canEdit) {
            editFormHTML = `
                <div class="mt-3 edit-form hidden">
                    <textarea class="edit-text w-full p-2 border rounded">${item.commentText}</textarea>
                    <div class="mt-2">
                        <label class="block text-sm font-medium text-gray-700 mb-1">Прикрепить файл (необязательно)</label>
                        <input type="file" class="edit-attachment w-full text-sm">
                        ${item.attachment ? `
                            <div class="mt-1 flex items-center">
                                <input type="checkbox" id="remove-attachment-${item.commentId}" class="mr-2">
                                <label for="remove-attachment-${item.commentId}" class="text-sm text-gray-600">Удалить текущий файл</label>
                            </div>
                        ` : ''}
                    </div>
                    <div class="mt-2 flex justify-end space-x-2">
                        <button class="cancel-edit-btn px-3 py-1 border rounded text-sm">Отмена</button>
                        <button class="save-edit-btn px-3 py-1 bg-primary-500 text-white rounded text-sm">Сохранить</button>
                    </div>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <div class="text-sm text-gray-500 mb-1">
                        <a href="/course-detail.html?courseId=${item.course.id}" class="hover:underline">${item.course.title}</a> &rarr; 
                        <a href="/lesson.html?lessonId=${item.lesson.id}" class="hover:underline">${item.lesson.title}</a>
                    </div>
                    <div class="flex items-center flex-wrap">
                        ${item.status ? getStatusBadge(item.status) : ''}
                        <span class="font-bold text-gray-800">${item.user.name}</span>
                        <span class="text-sm text-gray-500 ml-2">${new Date(item.createdAt).toLocaleString('ru-RU')}</span>
                    </div>
                </div>
                ${canEdit ? '<button class="edit-btn text-gray-500 hover:text-primary-500"><i class="fas fa-edit"></i></button>' : ''}
            </div>

            <div class="mt-2">
                <p class="comment-text whitespace-pre-wrap">${item.commentText}</p>
                ${attachmentHTML}
                ${gradeHTML}
            </div>

            ${actionsHTML}

            <div class="mt-2 flex space-x-2">
                ${canReply ? '<button class="reply-btn text-sm text-primary-600 hover:underline">Ответить</button>' : ''}
            </div>

            ${replyFormHTML}
            ${editFormHTML}
        `;

        // Добавляем обработчики событий
        if (canSetStatus) {
            // Обработчики для кнопок статуса (учитель)
            if (card.querySelector('.approve-btn')) {
                card.querySelector('.approve-btn').addEventListener('click', () => updateStatus(item.commentId, 'Принято'));
            }
            if (card.querySelector('.reject-btn')) {
                card.querySelector('.reject-btn').addEventListener('click', () => updateStatus(item.commentId, 'На доработку'));
            }
            card.querySelector('.viewed-btn').addEventListener('click', () => updateStatus(item.commentId, 'Просмотрено'));
        }

        if (canReply) {
            // Обработчики для формы ответа
            const replyBtn = card.querySelector('.reply-btn');
            const replyForm = card.querySelector('.reply-form');
            const cancelReplyBtn = card.querySelector('.cancel-reply-btn');
            const submitReplyBtn = card.querySelector('.submit-reply-btn');

            replyBtn.addEventListener('click', () => {
                replyForm.classList.toggle('hidden');
                if (!replyForm.classList.contains('hidden')) {
                    replyForm.querySelector('textarea').focus();
                }
            });

            cancelReplyBtn.addEventListener('click', () => {
                replyForm.classList.add('hidden');
            });

            submitReplyBtn.addEventListener('click', async () => {
                const commentText = replyForm.querySelector('.reply-text').value.trim();
                if (!commentText) {
                    showNotification('Введите текст ответа', 'error');
                    return;
                }

                const formData = new FormData();
                formData.append('email', currentUser.email);
                formData.append('lessonId', item.lesson.id);
                formData.append('commentText', commentText);
                formData.append('parentCommentId', item.commentId);

                const fileInput = replyForm.querySelector('.reply-attachment');
                if (fileInput.files[0]) {
                    formData.append('attachment', fileInput.files[0]);
                }

                try {
                    submitReplyBtn.disabled = true;
                    submitReplyBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Отправка...';

                    await fetchFromAPI('answersFeed', {
                        method: 'POST',
                        body: formData
                    });

                    showNotification('Ответ отправлен', 'success');
                    loadAnswersFeed();
                } catch (error) {
                    submitReplyBtn.disabled = false;
                    submitReplyBtn.textContent = 'Отправить';
                }
            });
        }

        if (canEdit) {
            // Обработчики для формы редактирования
            const editBtn = card.querySelector('.edit-btn');
            const editForm = card.querySelector('.edit-form');
            const cancelEditBtn = card.querySelector('.cancel-edit-btn');
            const saveEditBtn = card.querySelector('.save-edit-btn');

            editBtn.addEventListener('click', () => {
                editForm.classList.toggle('hidden');
            });

            cancelEditBtn.addEventListener('click', () => {
                editForm.classList.add('hidden');
            });

            saveEditBtn.addEventListener('click', async () => {
                const commentText = editForm.querySelector('.edit-text').value.trim();
                if (!commentText) {
                    showNotification('Введите текст комментария', 'error');
                    return;
                }

                const formData = new FormData();
                formData.append('email', currentUser.email);
                formData.append('commentText', commentText);

                const fileInput = editForm.querySelector('.edit-attachment');
                if (fileInput.files[0]) {
                    formData.append('attachment', fileInput.files[0]);
                }

                const removeAttachment = editForm.querySelector('input[type="checkbox"]');
                if (removeAttachment && removeAttachment.checked) {
                    formData.append('removeAttachment', 'true');
                }

                try {
                    saveEditBtn.disabled = true;
                    saveEditBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-1"></i> Сохранение...';

                    await fetchFromAPI(`answersFeed/${item.commentId}`, {
                        method: 'PUT',
                        body: formData
                    });

                    showNotification('Комментарий обновлён', 'success');
                    loadAnswersFeed();
                } catch (error) {
                    saveEditBtn.disabled = false;
                    saveEditBtn.textContent = 'Сохранить';
                }
            });
        }

        return card;
    }

    // Обновление статуса комментария
    async function updateStatus(commentId, status) {
        try {
            await fetchFromAPI(`answersFeed/${commentId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: currentUser.email,
                    status: status
                })
            });
            showNotification('Статус обновлён', 'success');
            loadAnswersFeed();
        } catch (error) {
            console.error('Ошибка обновления статуса:', error);
        }
    }

    // Инициализация страницы
    function init() {
        // Загружаем данные пользователя
        const storedUser = localStorage.getItem('currentUser');
        if (!storedUser) {
            window.location.href = '/auth.html';
            return;
        }
        currentUser = JSON.parse(storedUser);

        // Настраиваем меню в зависимости от роли
        setupUserMenu();

        // Загружаем данные
        loadFilterOptions();
        loadAnswersFeed();

        // Обработчики фильтров
        statusFilter.addEventListener('change', loadAnswersFeed);
        lessonFilter.addEventListener('change', loadAnswersFeed);
        resetFiltersBtn.addEventListener('click', () => {
            courseFilter.value = '';
            lessonFilter.value = '';
            statusFilter.value = '';
            lessonFilterContainer.classList.add('hidden');
            loadAnswersFeed();
        });
    }

    // Настройка меню пользователя
    function setupUserMenu() {
        const userMenuPlaceholder = document.getElementById('user-menu-placeholder');
        if (!userMenuPlaceholder) return;

        userMenuPlaceholder.innerHTML = `
            <div class="flex items-center space-x-4">
                <div class="relative">
                    <button id="notificationsBtn" class="text-gray-600 hover:text-primary-500 focus:outline-none relative">
                        <i class="fas fa-bell text-xl"></i>
                        <span class="notification-badge hidden">0</span>
                    </button>
                </div>
                <div class="hidden md:block">
                    <button id="userMenuBtn" class="flex items-center text-gray-600 hover:text-primary-500 focus:outline-none">
                        <img src="assets/images/default-avatar.png" alt="Profile" class="w-8 h-8 rounded-full mr-2">
                        <span class="font-medium">${currentUser.fullname || 'Пользователь'}</span>
                    </button>
                </div>
            </div>
        `;
    }

    init();
});