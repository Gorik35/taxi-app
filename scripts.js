const API_KEY = 'YOUR_API_KEY'; // Замени на твой API Key
const SPREADSHEET_ID = 'YOUR_SPREADSHEET_ID'; // Замени на ID таблицы
const CLIENT_ID = 'YOUR_CLIENT_ID'; // Замени на OAuth Client ID
let gapiLoaded = false;
let cart = [];

// Инициализация Google API
function loadGapi() {
    gapi.load('client:auth2', () => {
        gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/spreadsheets'
        }).then(() => {
            gapiLoaded = true;
            checkUser();
            loadBookingTimes();
            loadProducts();
            loadOrders();
        });
    });
}

// Проверка куки и автоавторизация
function checkUser() {
    const phone = getCookie('phone');
    if (phone) {
        gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Пользователи!A2:F'
        }).then(response => {
            const users = response.result.values || [];
            const user = users.find(row => row[3] === phone);
            if (user) {
                document.getElementById('user-info').innerText = `Привет, ${user[1]}!`;
                document.getElementById('name-group').style.display = 'none';
                document.getElementById('phone-group').style.display = 'none';
                document.getElementById('store-name-group').style.display = 'none';
                document.getElementById('store-phone-group').style.display = 'none';
                showTabs(user[2]); // Показ вкладок по роли
            }
        });
    }
}

// Загрузка времени бронирования
function loadBookingTimes() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'ВремяБронирования!C2:C'
    }).then(response => {
        const times = response.result.values || [];
        const now = new Date();
        const threeHoursLater = new Date(now.getTime() + 3 * 60 * 60 * 1000);
        const select = document.getElementById('booking-time');
        times.forEach(([time]) => {
            const date = new Date(time);
            if (date >= threeHoursLater && (date.getDate() === now.getDate() || date.getDate() === now.getDate() + 1)) {
                const option = document.createElement('option');
                option.value = time;
                option.text = date.toLocaleString('ru', { dateStyle: 'short', timeStyle: 'short' });
                select.appendChild(option);
            }
        });
    });
}

// Загрузка товаров
function loadProducts() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Товары!A2:I'
    }).then(response => {
        const products = response.result.values || [];
        const categories = [...new Set(products.map(row => row[4]))];
        const subcategories = [...new Set(products.map(row => row[5]))];
        const categorySelect = document.getElementById('category-filter');
        const subcategorySelect = document.getElementById('subcategory-filter');
        categorySelect.innerHTML = '<option value="">Все</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
        subcategorySelect.innerHTML = '<option value="">Все</option>' + subcategories.map(s => `<option value="${s}">${s}</option>`).join('');

        const productsDiv = document.getElementById('products');
        products.forEach(row => {
            const [id, name, desc, price, cat, subcat, photo, stock] = row;
            const card = `
                <div class="col-md-4 mb-3">
                    <div class="card">
                        ${photo ? `<img src="${photo}" class="card-img-top" alt="${name}">` : ''}
                        <div class="card-body">
                            <h5 class="card-title">${name}</h5>
                            <p class="card-text">${desc}</p>
                            <p class="card-text">Цена: ${price} ₽</p>
                            <button class="btn btn-warning" onclick="addToCart('${id}')">В корзину</button>
                        </div>
                    </div>
                </div>
            `;
            productsDiv.innerHTML += card;
        });

        categorySelect.addEventListener('change', filterProducts);
        subcategorySelect.addEventListener('change', filterProducts);
    });
}

function filterProducts() {
    const category = document.getElementById('category-filter').value;
    const subcategory = document.getElementById('subcategory-filter').value;
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Товары!A2:I'
    }).then(response => {
        const products = response.result.values || [];
        const productsDiv = document.getElementById('products');
        productsDiv.innerHTML = '';
        products.forEach(row => {
            const [id, name, desc, price, cat, subcat, photo, stock] = row;
            if ((category === '' || cat === category) && (subcategory === '' || subcat === subcategory)) {
                const card = `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            ${photo ? `<img src="${photo}" class="card-img-top" alt="${name}">` : ''}
                            <div class="card-body">
                                <h5 class="card-title">${name}</h5>
                                <p class="card-text">${desc}</p>
                                <p class="card-text">Цена: ${price} ₽</p>
                                <button class="btn btn-warning" onclick="addToCart('${id}')">В корзину</button>
                            </div>
                        </div>
                    </div>
                `;
                productsDiv.innerHTML += card;
            }
        });
    });
}

function addToCart(productId) {
    cart.push(productId);
    alert(`Товар ${productId} добавлен в корзину!`);
}

// Загрузка заказов
function loadOrders() {
    const phone = getCookie('phone');
    if (!phone) return;
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'ЗаказыТакси!A2:K'
    }).then(response => {
        const orders = response.result.values || [];
        const orderList = document.getElementById('order-list');
        orderList.innerHTML = '';
        orders.forEach(row => {
            const [id, userId, driverId, start, end, , , status, amount] = row;
            gapi.client.sheets.spreadsheets.values.get({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Пользователи!A2:F'
            }).then(userResponse => {
                const users = userResponse.result.values || [];
                const user = users.find(u => u[0] === userId);
                if (user && user[3] === phone) {
                    const card = `
                        <div class="card mb-3">
                            <div class="card-body">
                                <h5 class="card-title">Заказ ${id} (Такси)</h5>
                                <p>От: ${start}</p>
                                <p>До: ${end}</p>
                                <p>Статус: ${status}</p>
                                <p>Сумма: ${amount || 'Не указана'}</p>
                                ${driverId ? `<p>Водитель: ${users.find(u => u[0] === driverId)?.[4] || ''}</p>` : ''}
                                <button class="btn btn-warning" onclick="showComments('${id}', 'Такси')">Комментарии</button>
                            </div>
                        </div>
                    `;
                    orderList.innerHTML += card;
                }
            });
        });
    });
    // Аналогично для ЗаказыМагазина
}

// Комментарии
function showComments(orderId, orderType) {
    document.getElementById('comment-order-id').value = orderId;
    document.getElementById('comment-order-type').value = orderType;
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Комментарии!A2:F'
    }).then(response => {
        const comments = response.result.values || [];
        const orderList = document.getElementById('order-list');
        orderList.innerHTML += '<h5>Комментарии</h5>';
        comments.forEach(row => {
            if (row[1] === orderId && row[2] === orderType) {
                orderList.innerHTML += `<p>${row[4]} (от ${row[3]})</p>`;
            }
        });
    });
}

document.getElementById('comment-form').addEventListener('submit', e => {
    e.preventDefault();
    const text = document.getElementById('comment-text').value;
    const orderId = document.getElementById('comment-order-id').value;
    const orderType = document.getElementById('comment-order-type').value;
    const userId = getCookie('userId');
    const commentId = `C${('000' + (Math.floor(Math.random() * 1000))).slice(-3)}`;
    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Комментарии!A2:F',
        valueInputOption: 'RAW',
        resource: {
            values: [[commentId, orderId, orderType, userId, text, new Date().toISOString()]]
        }
    }).then(() => {
        alert('Комментарий добавлен!');
        document.getElementById('comment-text').value = '';
    });
});

// Отправка заказа такси
document.getElementById('taxi-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('name').value;
    const phone = document.getElementById('phone').value;
    const startAddress = document.getElementById('start-address').value;
    const endAddress = document.getElementById('end-address').value;
    const bookingTime = document.getElementById('booking-time').value;
    const amount = document.getElementById('amount').value || '';

    if (phone && !/^(\+7|8)\d{10}$/.test(phone)) {
        alert('Телефон должен быть в формате +79991234567 или 89991234567');
        return;
    }

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Пользователи!A2:F'
    }).then(response => {
        const users = response.result.values || [];
        let user = users.find(row => row[3] === phone);
        let userId;

        if (!user && name && phone) {
            userId = `U${('000' + (users.length + 1)).slice(-3)}`;
            gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Пользователи!A2:F',
                valueInputOption: 'RAW',
                resource: { values: [[userId, name, 'Пассажир', phone, '', new Date().toISOString()]] }
            }).then(() => createOrder(userId));
            setCookie('phone', phone, 30);
            setCookie('userId', userId, 30);
        } else {
            userId = user[0];
            createOrder(userId);
        }
    });

    function createOrder(userId) {
        const orderId = `T${('000' + (Math.floor(Math.random() * 1000))).slice(-3)}`;
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ЗаказыТакси!A2:K',
            valueInputOption: 'RAW',
            resource: {
                values: [[orderId, userId, '', startAddress, endAddress, new Date().toISOString(), bookingTime, 'Создан', amount, 'Ожидает', new Date().toISOString()]]
            }
        }).then(() => {
            alert('Заказ создан!');
            loadOrders();
        });
    }
});

// Отправка заказа магазина
document.getElementById('store-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('store-name').value;
    const phone = document.getElementById('store-phone').value;
    const deliveryAddress = document.getElementById('delivery-address').value;

    if (phone && !/^(\+7|8)\d{10}$/.test(phone)) {
        alert('Телефон должен быть в формате +79991234567 или 89991234567');
        return;
    }

    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Пользователи!A2:F'
    }).then(response => {
        const users = response.result.values || [];
        let user = users.find(row => row[3] === phone);
        let userId;

        if (!user && name && phone) {
            userId = `U${('000' + (users.length + 1)).slice(-3)}`;
            gapi.client.sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: 'Пользователи!A2:F',
                valueInputOption: 'RAW',
                resource: { values: [[userId, name, 'Пассажир', phone, '', new Date().toISOString()]] }
            }).then(() => createStoreOrder(userId));
            setCookie('phone', phone, 30);
            setCookie('userId', userId, 30);
        } else {
            userId = user[0];
            createStoreOrder(userId);
        }
    });

    function createStoreOrder(userId) {
        const orderId = `S${('000' + (Math.floor(Math.random() * 1000))).slice(-3)}`;
        gapi.client.sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: 'ЗаказыМагазина!A2:L',
            valueInputOption: 'RAW',
            resource: {
                values: [[orderId, userId, cart.join(','), deliveryAddress, new Date().toISOString(), 'Создан', '', 'Ожидает', new Date().toISOString(), '', '', 'Ожидает']]
            }
        }).then(() => {
            alert('Заказ магазина создан!');
            cart = [];
            loadOrders();
        });
    }
});

// Проверка пароля админки
function checkAdminPassword() {
    const password = document.getElementById('admin-password').value;
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Настройки!A2:B'
    }).then(response => {
        const settings = response.result.values || [];
        if (settings.find(row => row[0] === 'ПарольАдминки' && row[1] === password)) {
            document.getElementById('admin-content').style.display = 'block';
            loadUsers();
        } else {
            alert('Неверный пароль');
        }
    });
}

// Загрузка пользователей для админки
function loadUsers() {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Пользователи!A2:F'
    }).then(response => {
        const users = response.result.values || [];
        const userList = document.getElementById('user-list');
        userList.innerHTML = '';
        users.forEach(row => {
            const [id, name, role, phone, card] = row;
            const userCard = `
                <div class="card mb-3">
                    <div class="card-body">
                        <p>Имя: ${name}</p>
                        <p>Телефон: ${phone}</p>
                        <div class="form-group">
                            <label>Роль</label>
                            <select class="form-control" onchange="updateRole('${id}', this.value)">
                                <option value="Пассажир" ${role === 'Пассажир' ? 'selected' : ''}>Пассажир</option>
                                <option value="Водитель" ${role === 'Водитель' ? 'selected' : ''}>Водитель</option>
                                <option value="Сборщик" ${role === 'Сборщик' ? 'selected' : ''}>Сборщик</option>
                                <option value="Админ" ${role === 'Админ' ? 'selected' : ''}>Админ</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Номер карты</label>
                            <input type="text" class="form-control" value="${card || ''}" onchange="updateCard('${id}', this.value)">
                        </div>
                    </div>
                </div>
            `;
            userList.innerHTML += userCard;
        });
    });
}

function updateRole(userId, role) {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Пользователи!A2:F'
    }).then(response => {
        const users = response.result.values || [];
        const rowIndex = users.findIndex(row => row[0] === userId) + 2;
        gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Пользователи!C${rowIndex}`,
            valueInputOption: 'RAW',
            resource: { values: [[role]] }
        }).then(() => alert('Роль обновлена!'));
    });
}

function updateCard(userId, card) {
    gapi.client.sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Пользователи!A2:F'
    }).then(response => {
        const users = response.result.values || [];
        const rowIndex = users.findIndex(row => row[0] === userId) + 2;
        gapi.client.sheets.spreadsheets.values.update({
            spreadsheetId: SPREADSHEET_ID,
            range: `Пользователи!E${rowIndex}`,
            valueInputOption: 'RAW',
            resource: { values: [[card]] }
        }).then(() => alert('Номер карты обновлён!'));
    });
}

// Добавление товара
document.getElementById('product-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('product-name').value;
    const desc = document.getElementById('product-description').value;
    const price = document.getElementById('product-price').value;
    const category = document.getElementById('product-category').value;
    const subcategory = document.getElementById('product-subcategory').value;
    const photo = document.getElementById('product-photo').value;
    const stock = document.getElementById('product-stock').value;
    const productId = `P${('000' + (Math.floor(Math.random() * 1000))).slice(-3)}`;

    gapi.client.sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: 'Товары!A2:I',
        valueInputOption: 'RAW',
        resource: {
            values: [[productId, name, desc, price, category, subcategory, photo, stock, new Date().toISOString()]]
        }
    }).then(() => {
        alert('Товар добавлен!');
        loadProducts();
    });
});

// Управление вкладками по роли
function showTabs(role) {
    document.getElementById('admin-tab').style.display = role === 'Админ' ? 'block' : 'none';
    // Добавить вкладки для Водитель/Сборщик (Доступные заказы, Мои заказы)
}

// Куки
function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    document.cookie = `${name}=${value};expires=${date.toUTCString()};path=/`;
}

function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop().split(';').shift() : null;
}

// Заглушка для СБП (интеграция через API банка)
function initiateSBP(orderId, amount, cardNumber) {
    // Пример: fetch('https://api.bank.ru/sbp', { method: 'POST', body: JSON.stringify({ orderId, amount, cardNumber }) })
    alert(`Оплата через СБП для заказа ${orderId} на сумму ${amount} (карта ${cardNumber})`);
}

// Загрузка Google API
loadGapi();