// ========== ДАННЫЕ КВИЗА ==========
const questions = [
    { id: 'room_type', text: 'Какое помещение вы планируете оформить?', type: 'single', required: true,
      options: ['Квартира', 'Частный дом', 'Офис', 'Коммерческое помещение', 'Студия / апартаменты', 'Другое'] },
    { id: 'zones', text: 'Какие зоны нужно включить в дизайн-проект?', type: 'multiple', required: true,
      options: ['Кухня', 'Гостиная', 'Спальня', 'Детская', 'Санузел', 'Прихожая', 'Кабинет', 'Гардеробная', 'Балкон', 'Всё помещение'] },
    { id: 'area', text: 'Укажите примерную площадь помещения', type: 'slider', required: true, min: 20, max: 300, step: 5, default: 60 },
    { id: 'style', text: 'Какой стиль интерьера вам ближе?', type: 'single', required: true,
      options: ['Современный', 'Минимализм', 'Скандинавский', 'Лофт', 'Неоклассика', 'Классика', 'Не определился'] },
    { id: 'budget', text: 'Какой бюджет на реализацию интерьера вы рассматриваете?', type: 'single', required: true,
      options: ['До 500 000 ₽', '500 000 - 1 000 000 ₽', '1 000 000 - 2 000 000 ₽', 'От 2 000 000 ₽', 'Пока не знаю'] }
];

let currentStep = 0;
let answers = {
    room_type: '', zones: [], area: 60, style: '', budget: '',
    name: '', phone: '', email: '', comment: '', consent: false
};
let submitting = false;

// ========== УВЕДОМЛЕНИЯ ==========
function showToast(message, type = 'info') {
    let toast = document.getElementById('toastNotification');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toastNotification';
        toast.className = 'toast-notification';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast-notification ${type} show`;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ========== TELEGRAM ОТПРАВКА ==========
// ⚠️ СЮДА ВСТАВЬ СВОЙ ТОКЕН И CHAT_ID ⚠️
const BOT_TOKEN = '';  // Вставь сюда токен от @BotFather
const CHAT_ID = '';    // Вставь сюда chat_id от @userinfobot

async function sendToTelegram(payload) {
    if (!BOT_TOKEN || !CHAT_ID) {
        console.log('Telegram не настроен');
        return false;
    }
    
    const message = `НОВАЯ ЗАЯВКА НА ДИЗАЙН-ПРОЕКТ
————————————————
Тип: ${payload.room_type}
Площадь: ${payload.area} м²
Стиль: ${payload.style}
Бюджет: ${payload.budget}
Зоны: ${payload.zones?.join(', ') || '—'}
————————————————
Имя: ${payload.name || '—'}
Телефон: ${payload.phone}
Email: ${payload.email || '—'}
Комментарий: ${payload.comment || '—'}
————————————————
Время: ${new Date(payload.timestamp).toLocaleString('ru-RU')}`;
    
    try {
        const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_ID, text: message })
        });
        return response.ok;
    } catch (error) {
        console.error('Ошибка:', error);
        return false;
    }
}

// ========== СОХРАНЕНИЕ ==========
function saveToStorage(payload) {
    const submissions = JSON.parse(localStorage.getItem('design_quiz_submissions') || '[]');
    submissions.push(payload);
    localStorage.setItem('design_quiz_submissions', JSON.stringify(submissions));
}

async function submitQuizData() {
    const payload = {
        ...answers,
        page_url: window.location.href,
        timestamp: new Date().toISOString()
    };
    
    saveToStorage(payload);
    const tgSent = await sendToTelegram(payload);
    
    if (tgSent) {
        showToast('Заявка отправлена! Мы свяжемся с вами', 'success');
    } else {
        showToast('Заявка сохранена! Мы свяжемся с вами', 'success');
    }
    
    console.log('Заявка:', payload);
    return true;
}

// ========== ВАЛИДАЦИЯ ==========
function validatePhone(phone) {
    const numbers = phone.replace(/[^0-9+]/g, '').replace(/[^0-9]/g, '');
    return numbers.length >= 10;
}

function validateQuestion() {
    const q = questions[currentStep];
    if (q.type === 'single' && !answers[q.id]) {
        showToast('Выберите вариант ответа', 'error');
        return false;
    }
    if (q.type === 'multiple' && (!answers.zones || answers.zones.length === 0)) {
        showToast('Выберите хотя бы одну зону', 'error');
        return false;
    }
    return true;
}

function validateForm() {
    const phone = document.getElementById('phone')?.value.trim() || '';
    const consent = document.getElementById('consent')?.checked || false;
    
    if (!validatePhone(phone)) {
        showToast('Введите корректный номер телефона', 'error');
        return false;
    }
    if (!consent) {
        showToast('Подтвердите согласие на обработку данных', 'error');
        return false;
    }
    
    answers.phone = phone;
    answers.consent = consent;
    answers.name = document.getElementById('name')?.value || '';
    answers.email = document.getElementById('email')?.value || '';
    answers.comment = document.getElementById('comment')?.value || '';
    
    return true;
}

// ========== РЕНДЕРИНГ ==========
function render() {
    const app = document.getElementById('app');
    if (!app) return;
    
    if (currentStep < questions.length) {
        app.innerHTML = renderQuestion();
        attachQuestionEvents();
    } else if (currentStep === questions.length) {
        app.innerHTML = renderForm();
        attachFormEvents();
    } else {
        app.innerHTML = renderSuccess();
        attachSuccessEvents();
    }
    updateProgress();
}

function renderQuestion() {
    const q = questions[currentStep];
    let html = `<div class="card">
        <div class="progress-area">
            <div class="progress-bar"><div class="progress-fill"></div></div>
            <div class="steps-text">${currentStep + 1} из ${questions.length + 1}</div>
        </div>
        <h2 class="question-text">${q.text}</h2>`;
    
    if (q.type === 'single') {
        html += `<div class="options-grid">`;
        q.options.forEach(opt => {
            html += `<button class="option-btn ${answers[q.id] === opt ? 'selected' : ''}" data-value="${opt.replace(/'/g, '&#39;')}">${opt}</button>`;
        });
        html += `</div>`;
    }
    
    if (q.type === 'multiple') {
        html += `<div class="checkbox-group" id="checkboxGroup">`;
        q.options.forEach(opt => {
            const checked = answers.zones?.includes(opt);
            html += `<label class="checkbox-card ${checked ? 'selected' : ''}">
                <input type="checkbox" value="${opt.replace(/'/g, '&#39;')}" ${checked ? 'checked' : ''}>
                <span>${opt}</span>
            </label>`;
        });
        html += `</div>`;
    }
    
    if (q.type === 'slider') {
        html += `<div class="slider-container">
            <div class="slider-label"><span>Площадь</span><span>${answers.area} м²</span></div>
            <input type="range" id="areaSlider" min="${q.min}" max="${q.max}" step="${q.step}" value="${answers.area}">
            <div class="area-value">${answers.area} м²</div>
        </div>`;
    }
    
    html += `<div class="nav-buttons">`;
    if (currentStep > 0) {
        html += `<button class="btn btn-secondary" id="backBtn">Назад</button>`;
    } else {
        html += `<div></div>`;
    }
    html += `<button class="btn btn-primary" id="nextBtn">Далее</button>`;
    html += `</div></div>`;
    
    return html;
}

function renderForm() {
    return `<div class="card">
        <div class="progress-area">
            <div class="progress-bar"><div class="progress-fill"></div></div>
            <div class="steps-text">${questions.length + 1} из ${questions.length + 1}</div>
        </div>
        <h2 class="question-text">Оставьте контакты</h2>
        
        <div class="form-group">
            <label>Имя</label>
            <input type="text" id="name" placeholder="Иван" value="${answers.name.replace(/"/g, '&quot;')}">
        </div>
        
        <div class="form-group">
            <label>Телефон</label>
            <input type="tel" id="phone" placeholder="+7 900 123-45-67" value="${answers.phone}">
        </div>
        
        <div class="form-group">
            <label>Email</label>
            <input type="email" id="email" placeholder="ivan@example.ru" value="${answers.email}">
        </div>
        
        <div class="form-group">
            <label>Комментарий</label>
            <textarea id="comment" rows="3" placeholder="Ваши пожелания...">${answers.comment.replace(/</g, '&lt;')}</textarea>
        </div>
        
        <label class="checkbox-row">
            <input type="checkbox" id="consent" ${answers.consent ? 'checked' : ''}>
            <span>Согласен на обработку персональных данных</span>
        </label>
        
        <div class="nav-buttons">
            <button class="btn btn-secondary" id="backBtn">Назад</button>
            <button class="btn btn-primary" id="submitBtn">Отправить заявку</button>
        </div>
    </div>`;
}

function renderSuccess() {
    return `<div class="card success-message">
        <h3>Заявка отправлена</h3>
        <p>Мы свяжемся с вами в ближайшее время для обсуждения дизайн-проекта</p>
        <button class="btn btn-primary" id="restartBtn">Новая заявка</button>
    </div>`;
}

// ========== СОБЫТИЯ ==========
function attachQuestionEvents() {
    const q = questions[currentStep];
    
    if (q.type === 'single') {
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                answers[q.id] = btn.dataset.value;
                render();
                setTimeout(() => {
                    if (validateQuestion()) {
                        currentStep++;
                        render();
                    }
                }, 150);
            });
        });
    }
    
    if (q.type === 'multiple') {
        const updateZones = () => {
            answers.zones = Array.from(document.querySelectorAll('#checkboxGroup input:checked')).map(cb => cb.value);
            document.querySelectorAll('.checkbox-card').forEach(card => {
                if (card.querySelector('input')?.checked) {
                    card.classList.add('selected');
                } else {
                    card.classList.remove('selected');
                }
            });
        };
        document.querySelectorAll('#checkboxGroup input').forEach(cb => cb.addEventListener('change', updateZones));
        updateZones();
    }
    
    if (q.type === 'slider') {
        const slider = document.getElementById('areaSlider');
        if (slider) {
            slider.addEventListener('input', () => {
                answers.area = parseInt(slider.value);
                render();
            });
        }
    }
    
    document.getElementById('nextBtn')?.addEventListener('click', () => {
        if (validateQuestion()) {
            currentStep++;
            render();
        }
    });
    
    document.getElementById('backBtn')?.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            render();
        }
    });
}

function attachFormEvents() {
    document.getElementById('backBtn')?.addEventListener('click', () => {
        currentStep--;
        render();
    });
    
    document.getElementById('submitBtn')?.addEventListener('click', async () => {
        if (submitting) return;
        
        if (!validateForm()) return;
        
        submitting = true;
        const btn = document.getElementById('submitBtn');
        btn.textContent = 'Отправка...';
        btn.disabled = true;
        
        try {
            await submitQuizData();
            currentStep = questions.length + 1;
            render();
        } catch (error) {
            showToast('Ошибка отправки, попробуйте ещё раз', 'error');
            btn.textContent = 'Отправить заявку';
            btn.disabled = false;
        } finally {
            submitting = false;
        }
    });
}

function attachSuccessEvents() {
    document.getElementById('restartBtn')?.addEventListener('click', () => {
        currentStep = 0;
        answers = {
            room_type: '', zones: [], area: 60, style: '', budget: '',
            name: '', phone: '', email: '', comment: '', consent: false
        };
        render();
    });
}

function updateProgress() {
    const total = questions.length + 1;
    let step = currentStep + 1;
    if (currentStep === questions.length) step = total;
    const percent = (step / total) * 100;
    const fill = document.querySelector('.progress-fill');
    if (fill) fill.style.width = `${percent}%`;
}

// ========== ЗАПУСК ==========
document.addEventListener('DOMContentLoaded', () => {
    render();
});
