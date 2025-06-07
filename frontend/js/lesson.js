document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Элементы ---
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const notificationsBtn = document.getElementById('notificationsBtn');
    const notificationsDropdown = document.getElementById('notificationsDropdown');
    const userMenuBtn = document.getElementById('userMenuBtn');
    const userMenuDropdown = document.getElementById('userMenuDropdown');
    const logoutBtn = document.getElementById('logoutBtn');
    const notificationPopupContainer = document.getElementById('notificationPopupContainer');
    const notificationCountBadge = document.getElementById('notificationCountBadge');
    const clearNotificationsBtn = document.getElementById('clearNotificationsBtn');
    const notificationsListContainer = document.getElementById('notificationsListContainer');

    // Элементы страницы урока
    const backToCourseLink = document.getElementById('backToCourseLink');
    const courseTitleHeader = document.getElementById('courseTitleHeader');
    const adminControls = document.getElementById('adminControls');
    const editLessonBtn = document.getElementById('editLessonBtn');
    const lessonTitleDisplay = document.getElementById('lessonTitleDisplay');
    const lessonDateDisplay = document.getElementById('lessonDateDisplay');
    const lessonVideoEmbed = document.getElementById('lessonVideoEmbed');
    const lessonVideoContainer = document.getElementById('lessonVideoContainer');
    const homeworkTaskSection = document.getElementById('homeworkTaskSection');
    const homeworkTaskText = document.getElementById('homeworkTaskText');
    const materialsCount = document.getElementById('materialsCount');
    const materialsList = document.getElementById('materialsList');
    const materialsLoadingMsg = document.getElementById('materialsLoadingMsg');
    const homeworkSubmissionSection = document.getElementById('homeworkSubmissionSection');
    const homeworkSubmissionForm = document.getElementById('homeworkSubmissionForm');
    const homeworkFileInput = document.getElementById('homeworkFile');
    const homeworkFileLabel = document.getElementById('homeworkFileLabel');
    const homeworkFileNameDisplay = document.getElementById('homeworkFileNameDisplay');
    const homeworkCommentInput = document.getElementById('homeworkComment');
    const submitHomeworkBtn = document.getElementById('submitHomeworkBtn');
    const homeworkFormError = document.getElementById('homeworkFormError');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const addCommentFormContainer = document.getElementById('addCommentFormContainer');
    const addCommentForm = document.getElementById('addCommentForm');
    const commentTextInput = document.getElementById('commentText');
    const cancelCommentBtn = document.getElementById('cancelCommentBtn');
    const commentFormError = document.getElementById('commentFormError');
    const commentsList = document.getElementById('commentsList');
    const commentsLoadingMsg = document.getElementById('commentsLoadingMsg');

    // Элементы модального окна редактирования
    const editLessonModal = document.getElementById('editLessonModal');
    const closeEditLessonModalBtn = document.getElementById('closeEditLessonModalBtn');
    const cancelEditLessonBtn = document.getElementById('cancelEditLessonBtn');
    const editLessonForm = document.getElementById('editLessonForm');
    const editLessonTitleInput = document.getElementById('editLessonTitle');
    const editLessonVideoUrlInput = document.getElementById('editLessonVideoUrl');
    const currentMaterialsEditList = document.getElementById('currentMaterialsEditList');
    const editNewLessonMaterialsInput = document.getElementById('editNewLessonMaterials');
    const editLessonFormError = document.getElementById('editLessonFormError');
    let deletedMaterialIds = [];

    // --- Состояние ---
    let currentUser = null;
    let userNotifications = [];
    const API_BASE_URL = 'http://localhost:3000/api';
    const urlParams = new URLSearchParams(window.location.search);
    const lessonId = urlParams.get('lessonId');

    // --- Вспомогательные функции ---
    function getFileTypeVisuals(fileTypeOrName) {
        const extension = typeof fileTypeOrName === 'string' ? fileTypeOrName.split('.').pop().toLowerCase() : 'default';
        const map = {
            'pdf': { icon: 'fa-file-pdf', color: 'red' },
            'doc': { icon: 'fa-file-word', color: 'blue' }, 'docx': { icon: 'fa-file-word', color: 'blue' },
            'ppt': { icon: 'fa-file-powerpoint', color: 'orange' }, 'pptx': { icon: 'fa-file-powerpoint', color: 'orange' },
            'xls': { icon: 'fa-file-excel', color: 'green' }, 'xlsx': { icon: 'fa-file-excel', color: 'green' },
            'jpg': { icon: 'fa-file-image', color: 'purple' }, 'jpeg': { icon: 'fa-file-image', color: 'purple' },
            'png': { icon: 'fa-file-image', color: 'purple' }, 'gif': { icon: 'fa-file-image', color: 'purple' },
            'zip': { icon: 'fa-file-archive', color: 'gray' }, 'rar': { icon: 'fa-file-archive', color: 'gray' },
            'txt': { icon: 'fa-file-alt', color: 'gray' }
        };
        return map[extension] || { icon: 'fa-file', color: 'gray' };
    }

    function showNotificationPopup(message, type = 'info') {
        if (!notificationPopupContainer) return;
        const popupId = `notif-${Date.now()}`;
        const popup = document.createElement('div');
        let bgColor = 'bg-primary-100'; let textColor = 'text-primary-800'; let iconClass = 'fas fa-info-circle';
        if (type === 'success') { bgColor = 'bg-green-100'; textColor = 'text-green-800'; iconClass = 'fas fa-check-circle'; }
        else if (type === 'error') { bgColor = 'bg-red-100'; textColor = 'text-red-800'; iconClass = 'fas fa-exclamation-circle'; }

        popup.id = popupId;
        popup.className = `${bgColor} ${textColor} p-3 shadow-md flex justify-between items-center mb-2 rounded-md pointer-events-auto`;
        popup.innerHTML = `
            <div class="flex items-center"><i class="${iconClass} mr-2"></i><span>${message}</span></div>
            <button data-dismiss="${popupId}" class="text-sm font-medium hover:opacity-75"><i class="fas fa-times"></i></button>
        `;
        notificationPopupContainer.appendChild(popup);
        const closeBtn = popup.querySelector(`button[data-dismiss="${popupId}"]`);
        const autoCloseTimeout = setTimeout(() => { if (popup) popup.remove(); }, 5000);
        if (closeBtn) closeBtn.onclick = () => { clearTimeout(autoCloseTimeout); if (popup) popup.remove(); };
    }

    function showError(element, message) { if (element) { element.textContent = message; element.classList.remove('hidden'); } }
    function hideError(element) { if (element) { element.textContent = ''; element.classList.add('hidden'); } }

    // --- Общая логика UI (меню, модальные окна) ---
    if (menuToggle && sidebar && overlay) {
        menuToggle.addEventListener('click', () => { sidebar.classList.toggle('active'); overlay.classList.toggle('active'); });
        overlay.addEventListener('click', () => { sidebar.classList.remove('active'); overlay.classList.remove('active'); });
    }
    function toggleDropdown(btn, dropdown, otherDropdowns = []) {
        if (btn && dropdown) {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = dropdown.classList.contains('hidden');
                document.querySelectorAll('.fixed.z-\\[1060\\]').forEach(d => d.classList.add('hidden'));
                if (isHidden) dropdown.classList.remove('hidden');
                otherDropdowns.forEach(d => d.classList.add('hidden'));
            });
        }
    }
    toggleDropdown(notificationsBtn, notificationsDropdown, [userMenuDropdown]);
    toggleDropdown(userMenuBtn, userMenuDropdown, [notificationsDropdown]);
    document.addEventListener('click', (e) => {
        if (notificationsDropdown && !notificationsDropdown.contains(e.target) && e.target !== notificationsBtn) notificationsDropdown.classList.add('hidden');
        if (userMenuDropdown && !userMenuDropdown.contains(e.target) && e.target !== userMenuBtn) userMenuDropdown.classList.add('hidden');
    });
    function openModal(modalElement) { if (modalElement) { modalElement.classList.add('active'); document.body.style.overflow = 'hidden'; } }
    function closeModal(modalElement) { if (modalElement) { modalElement.classList.remove('active'); document.body.style.overflow = ''; } }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (notificationsDropdown) notificationsDropdown.classList.add('hidden');
            if (userMenuDropdown) userMenuDropdown.classList.add('hidden');
            if (editLessonModal && editLessonModal.classList.contains('active')) closeModal(editLessonModal);
            if (addCommentFormContainer && !addCommentFormContainer.classList.contains('hidden')) {
                addCommentFormContainer.classList.add('hidden');
                if (addCommentBtn) addCommentBtn.classList.remove('hidden');
            }
        }
    });
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault(); localStorage.removeItem('currentUser');
            showNotificationPopup('Выход из системы...', 'info');
            setTimeout(() => { window.location.href = 'auth.html'; }, 1000);
        });
    }
    function renderNotifications() { /* Заглушка для уведомлений */ }
    async function loadNotifications() { userNotifications = []; renderNotifications(); }
    if (clearNotificationsBtn) clearNotificationsBtn.addEventListener('click', () => { /* Заглушка */ });

    // --- Инициализация данных пользователя ---
    function updateUserDataUI(userData) {
        if (!userData) { localStorage.removeItem('currentUser'); window.location.href = 'auth.html'; return; }
        currentUser = userData;
        const defaultAvatar = 'assets/images/default-avatar.png';
        ['sidebarUserAvatar', 'headerUserAvatar'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.src = userData.avatarUrl || defaultAvatar;
        });
        ['sidebarUserName', 'headerUserName'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = userData.fullname || 'Пользователь';
        });
        const roleEl = document.getElementById('sidebarUserRole');
        if (roleEl) roleEl.textContent = userData.role || 'Статус';
    }
    function initializeUserData() {
        const cachedUser = localStorage.getItem('currentUser');
        if (!cachedUser) { window.location.href = 'auth.html'; return; }
        try { updateUserDataUI(JSON.parse(cachedUser)); }
        catch (e) { localStorage.removeItem('currentUser'); window.location.href = 'auth.html'; }
    }

    // --- Загрузка данных урока ---
    async function loadLessonDetails() {
        if (!lessonId || !currentUser) {
            showNotificationPopup('Ошибка: ID урока или данные пользователя отсутствуют.', 'error');
            if (lessonTitleDisplay) lessonTitleDisplay.textContent = "Ошибка загрузки урока";
            return;
        }
        try {
            const response = await fetch(`${API_BASE_URL}/lesson?lessonId=${encodeURIComponent(lessonId)}&email=${encodeURIComponent(currentUser.email)}`);
            if (!response.ok) { const errData = await response.json(); throw new Error(errData.message || `Ошибка ${response.status}`); }
            const data = await response.json();
            const lesson = data.lesson;

            document.title = `${lesson.title || 'Урок'} | EduPlatform`;
            if (courseTitleHeader) courseTitleHeader.textContent = lesson.courseTitle || 'Курс';
            if (backToCourseLink && lesson.courseId) backToCourseLink.href = `course-detail.html?courseId=${lesson.courseId}`;
            if (lessonTitleDisplay) lessonTitleDisplay.textContent = lesson.title;
            if (lessonDateDisplay) lessonDateDisplay.textContent = lesson.date ? `Дата: ${new Date(lesson.date).toLocaleDateString('ru-RU')}` : `ID Урока: ${lesson.lessonId}`;

            if (lessonVideoContainer && lessonVideoEmbed) {
                if (lesson.videoUrl) {
                    lessonVideoEmbed.src = lesson.videoUrl;
                    lessonVideoContainer.classList.remove('hidden');
                } else {
                    lessonVideoContainer.classList.add('hidden');
                }
            }
            if (adminControls && lesson.isEditable && (currentUser.role === 'Teacher' || currentUser.role === 'Admin')) {
                adminControls.classList.remove('hidden');
            } else if (adminControls) {
                adminControls.classList.add('hidden');
            }

            if (homeworkTaskSection && homeworkTaskText && homeworkSubmissionSection && submitHomeworkBtn) {
                if (lesson.homework && lesson.homework.taskText) {
                    homeworkTaskSection.classList.remove('hidden');
                    homeworkTaskText.textContent = lesson.homework.taskText;
                    homeworkSubmissionSection.classList.remove('hidden');
                    if (lesson.homework.hasSubmission) {
                        submitHomeworkBtn.disabled = true; submitHomeworkBtn.textContent = 'Задание отправлено';
                        if (homeworkFileInput) homeworkFileInput.disabled = true;
                        if (homeworkCommentInput) homeworkCommentInput.disabled = true;
                        if (homeworkFileLabel) homeworkFileLabel.textContent = 'Файл уже загружен';
                    } else {
                        submitHomeworkBtn.disabled = false; submitHomeworkBtn.textContent = 'Отправить задание';
                        if (homeworkFileInput) homeworkFileInput.disabled = false;
                        if (homeworkCommentInput) homeworkCommentInput.disabled = false;
                        if (homeworkFileLabel) homeworkFileLabel.textContent = 'Загрузить файл';
                    }
                } else {
                    homeworkTaskSection.classList.add('hidden');
                    homeworkSubmissionSection.classList.add('hidden');
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки данных урока:', error);
            showNotificationPopup(`Ошибка загрузки урока: ${error.message}`, 'error');
            if (lessonTitleDisplay) lessonTitleDisplay.textContent = "Не удалось загрузить урок";
        }
    }

    // --- Загрузка и отображение материалов ---
    async function loadMaterials() {
        if (!lessonId || !materialsLoadingMsg || !materialsList || !materialsCount) return;
        materialsLoadingMsg.classList.remove('hidden');
        materialsList.innerHTML = '';
        try {
            const response = await fetch(`${API_BASE_URL}/lesson/materials?lessonId=${encodeURIComponent(lessonId)}`);
            if (!response.ok) throw new Error('Ошибка загрузки материалов');
            const data = await response.json();

            materialsLoadingMsg.classList.add('hidden');
            materialsCount.textContent = `${data.materials.length} файлов`;

            if (data.materials.length === 0) {
                materialsList.innerHTML = '<p class="text-gray-500 col-span-full">Материалы к этому уроку отсутствуют.</p>';
                return;
            }
            data.materials.forEach(material => {
                const visuals = getFileTypeVisuals(material.fileName);
                const materialEl = document.createElement('div');
                materialEl.className = 'file-card border border-gray-200 rounded-lg p-4 hover:shadow-md transition relative group';
                const downloadUrl = `${API_BASE_URL}/lesson/materials/download/${material.materialId}`;

                materialEl.innerHTML = `
                    <div class="flex items-start">
                        <div class="bg-${visuals.color}-100 p-3 rounded-lg mr-3"> <i class="fas ${visuals.icon} text-${visuals.color}-500 text-xl"></i>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-800 truncate w-40 md:w-full" title="${material.fileName}">${material.fileName}</h4>
                            <p class="text-sm text-gray-500">${material.fileType.toUpperCase()} • ${(material.fileSize / (1024*1024)).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <div class="file-actions absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <a href="${downloadUrl}" target="_blank" class="text-primary-500 hover:text-primary-700 p-1" title="Скачать">
                            <i class="fas fa-download"></i>
                        </a>
                        ${(currentUser && (currentUser.role === 'Teacher' || currentUser.role === 'Admin')) ? `
                        <button data-material-id="${material.materialId}" class="delete-material-btn text-red-500 hover:text-red-700 p-1" title="Удалить">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                `;
                materialsList.appendChild(materialEl);
            });
            document.querySelectorAll('.delete-material-btn').forEach(button => button.addEventListener('click', handleDeleteMaterial));
        } catch (error) {
            console.error('Ошибка загрузки материалов:', error);
            materialsLoadingMsg.classList.add('hidden');
            materialsList.innerHTML = '<p class="text-red-500 col-span-full">Не удалось загрузить материалы.</p>';
            materialsCount.textContent = `Ошибка`;
        }
    }
    async function handleDeleteMaterial(event) {
        const materialId = event.currentTarget.dataset.materialId;
        if (!confirm('Вы уверены, что хотите удалить этот материал?')) return;
        try {
            const response = await fetch(`${API_BASE_URL}/lesson/materials/${materialId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: currentUser.email })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message || 'Ошибка удаления');
            showNotificationPopup('Материал удалён!', 'success');
            loadMaterials();
        } catch (error) { showNotificationPopup(`Ошибка удаления: ${error.message}`, 'error'); }
    }

    // --- Отправка домашнего задания ---
    if (homeworkSubmissionForm && homeworkFileInput && homeworkFileNameDisplay && submitHomeworkBtn && homeworkFormError) {
        homeworkFileInput.addEventListener('change', () => {
            homeworkFileNameDisplay.textContent = homeworkFileInput.files.length > 0 ? `Выбран файл: ${homeworkFileInput.files[0].name}` : '';
        });
        homeworkSubmissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!homeworkFileInput.files[0]) { showError(homeworkFormError, 'Пожалуйста, выберите файл.'); return; }
            hideError(homeworkFormError);
            submitHomeworkBtn.disabled = true; submitHomeworkBtn.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Отправка...`;

            const formData = new FormData();
            formData.append('lessonId', lessonId);
            formData.append('email', currentUser.email);
            formData.append('homeworkFile', homeworkFileInput.files[0]);
            formData.append('homeworkComment', homeworkCommentInput.value.trim());

            try {
                const response = await fetch(`${API_BASE_URL}/lesson/homework`, { method: 'POST', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `Ошибка ${response.status}`);
                showNotificationPopup('Домашнее задание успешно отправлено!', 'success');
                homeworkSubmissionForm.reset(); homeworkFileNameDisplay.textContent = '';
                submitHomeworkBtn.textContent = 'Задание отправлено'; homeworkFileInput.disabled = true;
                if (homeworkCommentInput) homeworkCommentInput.disabled = true;
                loadComments(); loadLessonDetails();
            } catch (error) {
                showError(homeworkFormError, `Ошибка: ${error.message}`);
                submitHomeworkBtn.disabled = false; submitHomeworkBtn.textContent = 'Отправить задание';
            }
        });
    }

    // --- Комментарии ---
    if (addCommentBtn && addCommentFormContainer && commentTextInput && cancelCommentBtn && addCommentForm && commentFormError && commentsList && commentsLoadingMsg) {
        addCommentBtn.addEventListener('click', () => {
            addCommentFormContainer.classList.remove('hidden'); addCommentBtn.classList.add('hidden'); commentTextInput.focus();
        });
        cancelCommentBtn.addEventListener('click', () => {
            addCommentFormContainer.classList.add('hidden'); addCommentBtn.classList.remove('hidden'); commentTextInput.value = ''; hideError(commentFormError);
        });
        addCommentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = commentTextInput.value.trim();
            if (!text) { showError(commentFormError, 'Комментарий не может быть пустым.'); return; }
            hideError(commentFormError);
            const submitButton = addCommentForm.querySelector('button[type="submit"]');
            submitButton.disabled = true; submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Отправка...`;
            try {
                const response = await fetch(`${API_BASE_URL}/lesson/comments`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lessonId, commentText: text, email: currentUser.email })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || 'Ошибка отправки');
                showNotificationPopup('Комментарий добавлен!', 'success');
                commentTextInput.value = ''; addCommentFormContainer.classList.add('hidden'); addCommentBtn.classList.remove('hidden');
                loadComments();
            } catch (error) { showError(commentFormError, `Ошибка: ${error.message}`); }
            finally { submitButton.disabled = false; submitButton.textContent = 'Отправить'; }
        });
    }

    async function loadComments() {
        if (!lessonId || !currentUser || !commentsLoadingMsg || !commentsList) return;
        commentsLoadingMsg.classList.remove('hidden'); commentsList.innerHTML = '';
        try {
            const response = await fetch(`${API_BASE_URL}/lesson/comments?lessonId=${encodeURIComponent(lessonId)}&email=${encodeURIComponent(currentUser.email)}`);
            if (!response.ok) throw new Error('Ошибка загрузки комментариев');
            const data = await response.json();
            console.log('Полученные комментарии:', data.comments); // Для отладки
            commentsLoadingMsg.classList.add('hidden');
            if (data.comments.length === 0) {
                commentsList.innerHTML = '<p class="text-gray-500">Пока нет комментариев к этому уроку.</p>'; return;
            }
            data.comments.forEach(comment => {
                const commentEl = document.createElement('div');
                let bgColorClass = 'bg-white';
                if (comment.isTeacherComment) bgColorClass = 'bg-primary-50';
                else if (comment.isHomeworkSubmission) bgColorClass = 'bg-green-50';
                commentEl.className = `p-4 border border-gray-200 rounded-lg ${bgColorClass}`;

                const defaultAvatar = 'assets/images/default-avatar.png';
                const avatarUrl = comment.avatarUrl || defaultAvatar;
                const visuals = comment.isHomeworkSubmission && comment.submissionFileName ? getFileTypeVisuals(comment.submissionFileName) : null;

                const homeworkDownloadUrl = comment.isHomeworkSubmission && comment.submissionFilePath
                    ? `${API_BASE_URL}/lesson/homeworks/download?filepath=${encodeURIComponent(comment.submissionFilePath)}&email=${encodeURIComponent(currentUser.email)}`
                    : '#';

                const createdAtDate = new Date(comment.createdAt);
                const formattedDate = isNaN(createdAtDate.getTime())
                    ? 'Дата неизвестна'
                    : createdAtDate.toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                commentEl.innerHTML = `
                    <div class="flex items-start">
                        <img src="${avatarUrl}" alt="${comment.fullName || 'Пользователь'}" class="w-10 h-10 rounded-full mr-3">
                        <div class="flex-1">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center flex-wrap">
                                    <p class="font-semibold text-gray-800 mr-2">${comment.fullName || 'Пользователь'}</p>
                                    ${comment.isTeacherComment ? '<span class="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full mr-1 mb-1">Преподаватель</span>' : ''}
                                    ${comment.isHomeworkSubmission ? '<span class="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full mr-1 mb-1">Домашнее задание</span>' : ''}
                                </div>
                                <span class="text-xs text-gray-500 whitespace-nowrap">${formattedDate}</span>
                            </div>
                            <p class="text-gray-700 mt-1 whitespace-pre-wrap">${comment.commentText || ''}</p>
                            ${comment.isHomeworkSubmission && comment.submissionFileName && visuals ? `
                                <div class="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 flex items-center space-x-2">
                                    <i class="fas ${visuals.icon} text-${visuals.color}-500"></i>
                                    <a href="${homeworkDownloadUrl}" target="_blank" class="text-sm text-primary-600 hover:underline" title="Скачать ${comment.submissionFileName}">
                                        ${comment.submissionFileName}
                                    </a>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `;
                commentsList.appendChild(commentEl);
            });
        } catch (error) {
            console.error('Ошибка загрузки комментариев:', error);
            commentsLoadingMsg.classList.add('hidden');
            commentsList.innerHTML = '<p class="text-red-500">Не удалось загрузить комментарии.</p>';
        }
    }

    // --- Редактирование урока (модальное окно) ---
    if (editLessonBtn && editLessonModal && closeEditLessonModalBtn && cancelEditLessonBtn && editLessonForm && editLessonTitleInput && editLessonVideoUrlInput && currentMaterialsEditList && editNewLessonMaterialsInput && editLessonFormError) {
        editLessonBtn.addEventListener('click', () => {
            if (!currentUser || !['Teacher', 'Admin'].includes(currentUser.role)) return;
            populateEditModal(); openModal(editLessonModal);
        });
        closeEditLessonModalBtn.addEventListener('click', () => closeModal(editLessonModal));
        cancelEditLessonBtn.addEventListener('click', () => closeModal(editLessonModal));
        editLessonModal.addEventListener('click', (e) => { if (e.target === editLessonModal) closeModal(editLessonModal); });

        async function populateEditModal() {
            editLessonTitleInput.value = lessonTitleDisplay.textContent;
            editLessonVideoUrlInput.value = lessonVideoEmbed.src;
            currentMaterialsEditList.innerHTML = ''; deletedMaterialIds = [];
            editLessonForm.reset();

            try {
                const response = await fetch(`${API_BASE_URL}/lesson/materials?lessonId=${encodeURIComponent(lessonId)}`);
                if (!response.ok) throw new Error('Ошибка загрузки материалов для редактирования');
                const data = await response.json();
                if (data.materials.length > 0) {
                    data.materials.forEach(material => {
                        const visuals = getFileTypeVisuals(material.fileName);
                        const item = document.createElement('div');
                        item.className = 'flex items-center justify-between p-2 bg-gray-100 rounded-md text-sm';
                        item.innerHTML = `
                            <div class="flex items-center overflow-hidden">
                                <i class="fas ${visuals.icon} text-${visuals.color}-500 mr-2"></i>
                                <span class="truncate" title="${material.fileName}">${material.fileName}</span>
                            </div>
                            <button type="button" data-material-id="${material.materialId}" class="ml-2 text-red-500 hover:text-red-700 text-xs remove-material-edit-btn flex-shrink-0">
                                <i class="fas fa-times mr-1"></i>Удалить
                            </button>
                        `;
                        currentMaterialsEditList.appendChild(item);
                    });
                    document.querySelectorAll('.remove-material-edit-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const matId = e.currentTarget.dataset.materialId;
                            if (!deletedMaterialIds.includes(matId)) deletedMaterialIds.push(matId);
                            e.currentTarget.parentElement.classList.add('line-through', 'opacity-50');
                            e.currentTarget.disabled = true;
                        });
                    });
                } else {
                    currentMaterialsEditList.innerHTML = '<p class="text-sm text-gray-500">Нет прикрепленных материалов.</p>';
                }
            } catch (e) { currentMaterialsEditList.innerHTML = '<p class="text-sm text-red-500">Не удалось загрузить список материалов.</p>'; }
        }

        editLessonForm.addEventListener('submit', async (e) => {
            e.preventDefault(); hideError(editLessonFormError);
            const submitButton = editLessonForm.querySelector('button[type="submit"]');
            submitButton.disabled = true; submitButton.innerHTML = `<i class="fas fa-spinner fa-spin mr-2"></i> Сохранение...`;

            const formData = new FormData();
            formData.append('lessonId', lessonId); formData.append('email', currentUser.email);
            formData.append('title', editLessonTitleInput.value.trim());
            formData.append('videoUrl', editLessonVideoUrlInput.value.trim());
            formData.append('deletedMaterialIdsJson', JSON.stringify(deletedMaterialIds));
            Array.from(editNewLessonMaterialsInput.files).forEach(file => formData.append('newMaterials', file));

            try {
                const response = await fetch(`${API_BASE_URL}/lesson`, { method: 'PUT', body: formData });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message || `Ошибка ${response.status}`);
                showNotificationPopup('Урок успешно обновлён!', 'success');
                closeModal(editLessonModal);
                await loadLessonDetails(); await loadMaterials();
            } catch (error) { showError(editLessonFormError, `Ошибка: ${error.message}`); }
            finally { submitButton.disabled = false; submitButton.textContent = 'Сохранить изменения'; }
        });
    }

    // --- Инициализация страницы ---
    async function initializePage() {
        initializeUserData();
        if (!lessonId) {
            showNotificationPopup('ID урока не указан в URL.', 'error');
            document.body.innerHTML = '<div class="flex justify-center items-center h-screen"><p class="text-center text-red-500 p-10 text-xl">Ошибка: ID урока не найден. Вернитесь назад и попробуйте снова.</p></div>';
            return;
        }
        if (currentUser) {
            await loadLessonDetails();
            await loadMaterials();
            await loadComments();
            await loadNotifications();
        }
    }

    initializePage();
});