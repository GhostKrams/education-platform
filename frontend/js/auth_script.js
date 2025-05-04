document.addEventListener('DOMContentLoaded', () => {
    // Элементы форм и модального окна
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const step1 = document.getElementById('step1');
    const step2 = document.getElementById('step2');
    const step3 = document.getElementById('step3');
    const successMessageDiv = document.getElementById('success-message');
    const successText = document.getElementById('success-text');

    // Элементы управления
    const switchToRegisterBtn = document.getElementById('switch-to-register');
    const switchToLoginBtn = document.getElementById('switch-to-login');
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const closeForgotPasswordBtn = document.getElementById('close-forgot-password');
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');
    const resendCodeBtn = document.getElementById('resend-code-btn'); // Добавлено
    const changePasswordBtn = document.getElementById('change-password-btn');

    // Элементы форм
    const loginFormElement = document.getElementById('login');
    const registerFormElement = document.getElementById('register');

    // Поля ввода
    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const registerFirstNameInput = document.getElementById('first-name');
    const registerLastNameInput = document.getElementById('last-name');
    const registerEmailInput = document.getElementById('register-email');
    const registerPasswordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const recoveryEmailInput = document.getElementById('recovery-email');
    const verificationCodeInput = document.getElementById('verification-code');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');

    // Элементы для ошибок
    const passwordMatchError = document.getElementById('password-match-error');
    const newPasswordMatchError = document.getElementById('new-password-match-error');
    const recoveryEmailError = document.getElementById('recovery-email-error');
    const verificationCodeError = document.getElementById('verification-code-error');
    const changePasswordError = document.getElementById('change-password-error');
    const sentToEmailSpan = document.getElementById('sent-to-email');


    // --- Переключение между формами ---
    switchToRegisterBtn.addEventListener('click', () => {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        clearFormErrors(); // Очистка ошибок при переключении
    });

    switchToLoginBtn.addEventListener('click', () => {
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        clearFormErrors(); // Очистка ошибок при переключении
    });

    // --- Модальное окно восстановления пароля ---
    forgotPasswordBtn.addEventListener('click', () => {
        forgotPasswordModal.classList.remove('hidden');
        step1.classList.remove('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
        successMessageDiv.classList.add('hidden'); // Скрыть сообщение об успехе
        clearFormErrors(); // Очистить ошибки при открытии
        recoveryEmailInput.value = ''; // Очистить поле email
    });

    closeForgotPasswordBtn.addEventListener('click', () => {
        forgotPasswordModal.classList.add('hidden');
    });

    // --- Логика восстановления пароля ---

    // Шаг 1: Отправка кода
    sendCodeBtn.addEventListener('click', async () => {
        const email = recoveryEmailInput.value.trim();
        clearFormErrors();

        if (!validateEmail(email)) {
            showError(recoveryEmailError, 'Введите корректный email');
            recoveryEmailInput.classList.add('input-error');
            return;
        }
        showLoading(sendCodeBtn); // Показать индикатор загрузки

        try {
             // !!! ЗАМЕНИТЬ НА FETCH К ВАШЕМУ API (/api/auth/forgot-password) !!!
            console.log(`Запрос на отправку кода для ${email}`);
            // Пример fetch:
            // const response = await fetch('/api/auth/forgot-password', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email })
            // });
            // const data = await response.json();
            // if (!response.ok) throw new Error(data.message || 'Ошибка отправки кода');

            // --- Если успешно ---
            console.log('Код отправлен (симуляция)');
            sentToEmailSpan.textContent = email; // Показываем email, куда отправлен код
            step1.classList.add('hidden');
            step2.classList.remove('hidden');
            verificationCodeInput.value = ''; // Очистить поле кода
            // --- Конец успешного блока ---

        } catch (error) {
            console.error("Ошибка отправки кода:", error);
            showError(recoveryEmailError, error.message || 'Не удалось отправить код. Попробуйте позже.');
            recoveryEmailInput.classList.add('input-error');
        } finally {
             hideLoading(sendCodeBtn, 'Отправить код'); // Скрыть индикатор загрузки
        }
    });

    // Повторная отправка кода (аналогично первой отправке)
    resendCodeBtn.addEventListener('click', () => {
         sendCodeBtn.click(); // Просто симулируем клик по основной кнопке
    });


    // Шаг 2: Подтверждение кода
    verifyCodeBtn.addEventListener('click', async () => {
        const code = verificationCodeInput.value.trim();
        const email = recoveryEmailInput.value.trim(); // Берем email из предыдущего шага
        clearFormErrors();

        if (!code) {
            showError(verificationCodeError, 'Введите код подтверждения');
            verificationCodeInput.classList.add('input-error');
            return;
        }

        showLoading(verifyCodeBtn); // Показать индикатор загрузки

        try {
             // !!! ЗАМЕНИТЬ НА FETCH К ВАШЕМУ API (/api/auth/verify-code) !!!
             console.log(`Запрос на проверку кода ${code} для ${email}`);
            // Пример fetch:
            // const response = await fetch('/api/auth/verify-code', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email, code })
            // });
            // const data = await response.json();
            // if (!response.ok) throw new Error(data.message || 'Ошибка проверки кода');

            // --- Если успешно ---
            console.log('Код подтвержден (симуляция)');
            step2.classList.add('hidden');
            step3.classList.remove('hidden');
            newPasswordInput.value = ''; // Очистить поля паролей
            confirmNewPasswordInput.value = '';
            // --- Конец успешного блока ---

        } catch (error) {
            console.error("Ошибка проверки кода:", error);
            showError(verificationCodeError, error.message || 'Неверный код или срок действия истек.');
            verificationCodeInput.classList.add('input-error');
        } finally {
             hideLoading(verifyCodeBtn, 'Подтвердить'); // Скрыть индикатор загрузки
        }
    });

    // Шаг 3: Изменение пароля
    changePasswordBtn.addEventListener('click', async () => {
        const newPassword = newPasswordInput.value;
        const confirmNewPassword = confirmNewPasswordInput.value;
        const email = recoveryEmailInput.value.trim(); // Email с первого шага
        const code = verificationCodeInput.value.trim(); // Код со второго шага
        clearFormErrors();

        if (!newPassword || !confirmNewPassword) {
            showError(changePasswordError, 'Заполните оба поля пароля');
            if (!newPassword) newPasswordInput.classList.add('input-error');
            if (!confirmNewPassword) confirmNewPasswordInput.classList.add('input-error');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            showError(newPasswordMatchError, 'Пароли не совпадают');
            newPasswordInput.classList.add('input-error');
            confirmNewPasswordInput.classList.add('input-error');
            return;
        }

        // Доп. проверка сложности пароля (пример)
        if (newPassword.length < 6) {
             showError(changePasswordError, 'Пароль должен быть не менее 6 символов');
             newPasswordInput.classList.add('input-error');
             confirmNewPasswordInput.classList.add('input-error');
             return;
        }

         showLoading(changePasswordBtn); // Показать индикатор загрузки

        try {
             // !!! ЗАМЕНИТЬ НА FETCH К ВАШЕМU API (/api/auth/reset-password) !!!
             console.log(`Запрос на смену пароля для ${email} с кодом ${code}`);
             // Пример fetch:
             // const response = await fetch('/api/auth/reset-password', {
             //     method: 'POST',
             //     headers: { 'Content-Type': 'application/json' },
             //     body: JSON.stringify({ email, code, newPassword })
             // });
             // const data = await response.json();
             // if (!response.ok) throw new Error(data.message || 'Ошибка смены пароля');

             // --- Если успешно ---
             console.log('Пароль изменен (симуляция)');
             showSuccess('Пароль успешно изменен!');
             setTimeout(() => {
                 forgotPasswordModal.classList.add('hidden');
                 switchToLoginBtn.click(); // Переключаемся на форму входа
             }, 2000); // Закрыть окно через 2 секунды
             // --- Конец успешного блока ---

        } catch (error) {
            console.error("Ошибка изменения пароля:", error);
            showError(changePasswordError, error.message || 'Не удалось изменить пароль. Попробуйте позже.');
        } finally {
            hideLoading(changePasswordBtn, 'Изменить пароль'); // Скрыть индикатор загрузки
        }
    });


    // --- Валидация паролей при вводе ---
    confirmPasswordInput.addEventListener('input', () => {
        validatePasswordMatch(registerPasswordInput, confirmPasswordInput, passwordMatchError);
    });

    confirmNewPasswordInput.addEventListener('input', () => {
        validatePasswordMatch(newPasswordInput, confirmNewPasswordInput, newPasswordMatchError);
    });
    // Убираем ошибку при изменении основного пароля
     registerPasswordInput.addEventListener('input', () => {
         if (confirmPasswordInput.value) {
             validatePasswordMatch(registerPasswordInput, confirmPasswordInput, passwordMatchError);
         }
     });
     newPasswordInput.addEventListener('input', () => {
         if (confirmNewPasswordInput.value) {
             validatePasswordMatch(newPasswordInput, confirmNewPasswordInput, newPasswordMatchError);
         }
     });

    // --- Отправка форм ---

    // Форма входа
    loginFormElement.addEventListener('submit', async (e) => {
        e.preventDefault(); // Предотвращаем стандартную отправку
        const email = loginEmailInput.value.trim();
        const password = loginPasswordInput.value;
        clearFormErrors();

        if (!email || !password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        showLoading(loginFormElement.querySelector('button[type="submit"]'));

        try {
            // !!! ЗАМЕНИТЬ НА FETCH К ВАШЕМУ API (/api/auth/login) !!!
            console.log(`Запрос на вход: ${email}`);
            // Пример fetch:
            // const response = await fetch('/api/auth/login', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ email, password })
            // });
            // const data = await response.json(); // Ожидаем { success: true, token: '...', user: {...} } или { success: false, message: '...' }
            // if (!response.ok || !data.success) throw new Error(data.message || 'Ошибка входа');

            // --- Если успешно ---
            console.log('Вход выполнен (симуляция)');
            // Сохранить токен (например, в localStorage)
            // localStorage.setItem('authToken', data.token);
            // Перенаправить пользователя
             alert('Вход выполнен успешно! (Перенаправление...)');
             // window.location.href = '/dashboard.html'; // Или куда нужно перенаправить
            // --- Конец успешного блока ---

        } catch (error) {
            console.error("Ошибка входа:", error);
            showError(loginFormElement.querySelector('.error-message') || createErrorElement(loginFormElement), error.message || 'Неверный email или пароль.');
            loginEmailInput.classList.add('input-error');
            loginPasswordInput.classList.add('input-error');
        } finally {
             hideLoading(loginFormElement.querySelector('button[type="submit"]'), 'Войти');
        }
    });

    // Форма регистрации
    registerFormElement.addEventListener('submit', async (e) => {
        e.preventDefault();
        const firstName = registerFirstNameInput.value.trim();
        const lastName = registerLastNameInput.value.trim();
        const email = registerEmailInput.value.trim();
        const password = registerPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        clearFormErrors();

        let hasError = false;
        if (!firstName) {
            registerFirstNameInput.classList.add('input-error'); hasError = true; }
        if (!lastName) {
             registerLastNameInput.classList.add('input-error'); hasError = true; }
        if (!validateEmail(email)) {
             registerEmailInput.classList.add('input-error'); hasError = true; /* Добавить сообщение об ошибке email */ }
        if (!password) {
             registerPasswordInput.classList.add('input-error'); hasError = true; }
        if (!confirmPassword) {
             confirmPasswordInput.classList.add('input-error'); hasError = true; }

        if (hasError) {
             alert('Пожалуйста, заполните все обязательные поля корректно.');
             return;
        }


        if (password !== confirmPassword) {
            showError(passwordMatchError, 'Пароли не совпадают');
            registerPasswordInput.classList.add('input-error');
            confirmPasswordInput.classList.add('input-error');
            return;
        }
         // Доп. проверка сложности пароля (пример)
        if (password.length < 6) {
             showError(passwordMatchError, 'Пароль должен быть не менее 6 символов');
             registerPasswordInput.classList.add('input-error');
             confirmPasswordInput.classList.add('input-error');
             return;
        }

        showLoading(registerFormElement.querySelector('button[type="submit"]'));

        try {
             // !!! ЗАМЕНИТЬ НА FETCH К ВАШЕМУ API (/api/auth/register) !!!
             console.log(`Запрос на регистрацию: ${email}`);
             // Пример fetch:
            // const response = await fetch('/api/auth/register', {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     body: JSON.stringify({ firstName, lastName, email, password })
            // });
            // const data = await response.json(); // Ожидаем { success: true } или { success: false, message: '...' }
            // if (!response.ok || !data.success) throw new Error(data.message || 'Ошибка регистрации');

            // --- Если успешно ---
            console.log('Регистрация успешна (симуляция)');
            alert('Регистрация прошла успешно! Теперь вы можете войти.');
            switchToLoginBtn.click(); // Переключиться на форму входа
            // Очистить поля формы регистрации
            registerFormElement.reset();
            // --- Конец успешного блока ---

        } catch (error) {
            console.error("Ошибка регистрации:", error);
            // Показать ошибку (например, если email уже занят)
             showError(registerFormElement.querySelector('.error-message') || createErrorElement(registerFormElement), error.message || 'Не удалось зарегистрироваться. Возможно, email уже используется.');
             if (error.message && error.message.toLowerCase().includes('email')) {
                 registerEmailInput.classList.add('input-error');
             }
        } finally {
             hideLoading(registerFormElement.querySelector('button[type="submit"]'), 'Зарегистрироваться');
        }
    });

    // --- Вспомогательные функции ---

    // Функция переключения видимости пароля (глобальная, так как вызывается из HTML onclick)
    window.togglePassword = function(inputId, button) {
        const input = document.getElementById(inputId);
        const icon = button.querySelector('i');

        if (input.type === 'password') {
            input.type = 'text';
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
        } else {
            input.type = 'password';
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
        }
    }

     // Валидация совпадения паролей
    function validatePasswordMatch(passwordInput, confirmInput, errorElement) {
         const password = passwordInput.value;
         const confirmPassword = confirmInput.value;

         if (confirmPassword.length > 0 && password !== confirmPassword) {
             confirmInput.classList.add('input-error');
             passwordInput.classList.add('input-error'); // Можно подсвечивать оба поля
             showError(errorElement, 'Пароли не совпадают');
         } else {
             confirmInput.classList.remove('input-error');
             passwordInput.classList.remove('input-error'); // Снимаем подсветку с обоих
             hideError(errorElement);
         }
     }

    // Простая валидация email
    function validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(String(email).toLowerCase());
    }

     // Показать/Скрыть сообщение об ошибке
     function showError(element, message) {
        if(element) {
            element.textContent = message;
            element.classList.remove('hidden');
        }
     }
     function hideError(element) {
        if(element) {
            element.textContent = '';
            element.classList.add('hidden');
        }
     }

     // Очистка всех ошибок и подсветки полей
    function clearFormErrors() {
        document.querySelectorAll('.error-message').forEach(el => hideError(el));
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    }

    // Создание элемента для ошибки, если его нет
    function createErrorElement(formElement) {
        let errorDiv = formElement.querySelector('.form-general-error');
        if (!errorDiv) {
            errorDiv = document.createElement('p');
            errorDiv.className = 'error-message form-general-error mt-2'; // Добавляем класс для идентификации
            // Вставляем перед кнопкой отправки или в конец формы
            const submitButton = formElement.querySelector('button[type="submit"]');
            if (submitButton) {
                 formElement.insertBefore(errorDiv, submitButton);
            } else {
                 formElement.appendChild(errorDiv);
            }
        }
        return errorDiv;
    }

    // Показать сообщение об успехе в модальном окне
     function showSuccess(message) {
        successText.textContent = message;
        successMessageDiv.classList.remove('hidden');
        // Скрываем шаги, чтобы было видно только сообщение
        step1.classList.add('hidden');
        step2.classList.add('hidden');
        step3.classList.add('hidden');
     }

    // Индикаторы загрузки для кнопок
    function showLoading(buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Загрузка...'; // Font Awesome спиннер
    }

    function hideLoading(buttonElement, originalText) {
         buttonElement.disabled = false;
         buttonElement.innerHTML = originalText;
     }

}); // Конец DOMContentLoaded
  