// Mobile menu toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');
const overlay = document.getElementById('overlay');

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
});

overlay.addEventListener('click', () => {
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
});

// Notifications dropdown
const notificationsBtn = document.getElementById('notificationsBtn');
const notificationsDropdown = document.getElementById('notificationsDropdown');

notificationsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notificationsDropdown.classList.toggle('hidden');
    userMenuDropdown.classList.add('hidden');
});

// User menu dropdown
const userMenuBtn = document.getElementById('userMenuBtn');
const userMenuDropdown = document.getElementById('userMenuDropdown');

if (userMenuBtn) {
    userMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        userMenuDropdown.classList.toggle('hidden');
        notificationsDropdown.classList.add('hidden');
    });
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!notificationsDropdown.contains(e.target) && e.target !== notificationsBtn) {
        notificationsDropdown.classList.add('hidden');
    }
    if (!userMenuDropdown.contains(e.target) && e.target !== userMenuBtn) {
        userMenuDropdown.classList.add('hidden');
    }
});

// Close dropdowns on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        notificationsDropdown.classList.add('hidden');
        userMenuDropdown.classList.add('hidden');
    }
});

// Notification popup
function closeNotification() {
    document.getElementById('notificationPopup').style.display = 'none';
}

// Comment form toggle
const addCommentBtn = document.getElementById('addCommentBtn');
const cancelCommentBtn = document.getElementById('cancelCommentBtn');
const commentForm = document.getElementById('commentForm');

if (addCommentBtn && cancelCommentBtn && commentForm) {
    addCommentBtn.addEventListener('click', () => {
        commentForm.classList.remove('hidden');
        addCommentBtn.classList.add('hidden');
    });

    cancelCommentBtn.addEventListener('click', () => {
        commentForm.classList.add('hidden');
        addCommentBtn.classList.remove('hidden');
    });
}

// Homework form submission
const homeworkForm = document.getElementById('homeworkForm');
if (homeworkForm) {
    homeworkForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Домашнее задание успешно отправлено!');
        homeworkForm.reset();
    });
}

// Edit lesson modal
const editLessonBtn = document.getElementById('editLessonBtn');
const editLessonModal = document.getElementById('editLessonModal');
const adminControls = document.getElementById('adminControls');
const adminComments = document.querySelectorAll('.admin-comment');

// Check if user is admin (in a real app, this would come from backend)
const isAdmin = false; // Change to true to see admin features

if (isAdmin) {
    adminControls.classList.remove('hidden');
    adminComments.forEach(comment => comment.classList.remove('hidden'));
} else {
    adminControls.classList.add('hidden');
    adminComments.forEach(comment => comment.classList.add('hidden'));
}

function openEditModal() {
    editLessonModal.classList.add('active');
}

function closeEditModal() {
    editLessonModal.classList.remove('active');
}

if (editLessonBtn) {
    editLessonBtn.addEventListener('click', () => {
        openEditModal();
    });
}

// Close modal when clicking outside
editLessonModal.addEventListener('click', (e) => {
    if (e.target === editLessonModal) {
        closeEditModal();
    }
});

// Edit lesson form submission
const editLessonForm = document.getElementById('editLessonForm');
if (editLessonForm) {
    editLessonForm.addEventListener('submit', (e) => {
        e.preventDefault();
        alert('Изменения урока сохранены!');
        closeEditModal();
    });
}

// Simulate file download
document.querySelectorAll('[href^="/download"]').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        alert('Файл скачивается...');
    });
});