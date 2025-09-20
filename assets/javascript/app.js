document.addEventListener('DOMContentLoaded', () => {
    const views = document.querySelectorAll('.view');
    const navLinks = document.getElementById('nav-links');
    let currentUser = null;

    const API_BASE = '/assets/php/api.php';

    // --- View Manager ---
    const showView = (viewId) => {
        views.forEach(view => view.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
    };

    // --- UI Update Functies ---
    const updateNav = () => {
        if (currentUser) {
            navLinks.innerHTML = `
                <span class="text-reparo-gray">Welkom, ${currentUser.name}</span>
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.showView('shop-view')">Winkel</button>
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.openNav(); window.fetchCart();">Winkelmandje</button>
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.showView('orders-view'); window.fetchOrders();">Bestellingen</button>
                <button id="logout-btn" class="font-semibold text-red-500 hover:text-red-700">Uitloggen</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
        } else {
            navLinks.innerHTML = `
                <button class="font-semibold text-gray-700 hover:text-reparo" onclick="window.showView('auth-view')">Inloggen / Registreren</button>
            `;
        }
    };
    
    const renderProducts = (products) => {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = products.map(p => `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden">
                <img src="${p.image_url}" alt="${p.name}" class="w-full h-48 object-cover">
                <div class="p-4">
                    <h3 class="font-bold text-lg">${p.name}</h3>
                    <p class="text-gray-600 text-sm mt-1">${p.description}</p>
                    <div class="flex justify-between items-center mt-4">
                        <span class="font-bold text-xl">€${p.price}</span>
                        <button class="bg-reparo text-white px-4 py-2 rounded-lg hover:bg-blue-700" onclick="window.addToCart(${p.id})">Toevoegen</button>
                    </div>
                </div>
            </div>
        `).join('');
    };

    const renderCart = (cartItems) => {
        const container = document.getElementById('cart-container');
        if (cartItems.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Je winkelmandje is leeg.</p>';
            return;
        }

        let subtotal = 0;
        const itemsHtml = cartItems.map(item => {
            subtotal += item.price * item.quantity;
            return `
                <div class="flex items-center justify-between py-4 border-b">
                    <div class="flex items-center">
                        <img src="${item.image_url}" alt="${item.name}" class="w-16 h-16 object-cover rounded-lg mr-4">
                        <div>
                            <p class="font-semibold">${item.name}</p>
                            <p class="text-sm text-gray-500">Aantal: ${item.quantity}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold">€${(item.price * item.quantity).toFixed(2)}</p>
                        <button class="text-red-500 text-xs hover:underline" onclick="window.removeFromCart(${item.id})">Verwijder</button>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = `
            ${itemsHtml}
            <div class="mt-6 text-right">
                <p class="text-lg">Subtotaal: <span class="font-bold">€${subtotal.toFixed(2)}</span></p>
                <button class="mt-4 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700" onclick="window.createOrder()">Bestelling Plaatsen</button>
            </div>
        `;
    };
    
    const renderOrders = (orders) => {
        const container = document.getElementById('orders-container');
        if (orders.length === 0) {
            container.innerHTML = '<p class="text-center text-gray-500">Je hebt nog geen bestellingen geplaatst.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-center border-b pb-4 mb-4">
                    <div>
                        <p class="font-bold">Bestelling #${order.id}</p>
                        <p class="text-sm text-gray-500">Datum: ${new Date(order.order_date).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <p class="font-bold text-lg">Totaal: €${order.total_price}</p>
                </div>
                <div>
                    ${order.items.map(item => `
                        <div class="flex items-center py-2">
                            <img src="${item.image_url}" class="w-12 h-12 rounded-md mr-4">
                            <div class="flex-grow">
                                <p>${item.name}</p>
                                <p class="text-sm text-gray-500">${item.quantity} x €${item.price_per_item}</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    };


    // --- API Functies ---
    const apiFetch = async (url, options = {}) => {
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'Er is een onbekende fout opgetreden.' }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            return response.json();
        } catch (error) {
            console.error('API Fetch Error:', error);
            alert(`Fout: ${error.message}`);
            return null;
        }
    };
    
    const checkSession = async () => {
        const result = await apiFetch(`${API_BASE}?endpoint=auth&action=check_session`);
        if (result && result.status === 'success') {
            currentUser = result.user;
            showView('shop-view');
            fetchProducts();
        } else {
            currentUser = null;
            showView('auth-view');
        }
        updateNav();
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const result = await apiFetch(`${API_BASE}?endpoint=auth&action=login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (result && result.status === 'success') {
            currentUser = result.user;
            updateNav();
            showView('shop-view');
            fetchProducts();
        } else {
           document.getElementById('login-error').textContent = 'Inloggen mislukt. Controleer je gegevens.';
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const result = await apiFetch(`${API_BASE}?endpoint=auth&action=register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        if (result && result.status === 'success') {
            alert('Registratie succesvol! Je kunt nu inloggen.');
            toggleAuthForm('login');
        } else {
            document.getElementById('register-error').textContent = 'Registratie mislukt. Probeer het opnieuw.';
        }
    };

    const handleLogout = async () => {
        await apiFetch(`${API_BASE}?endpoint=auth&action=logout`);
        currentUser = null;
        updateNav();
        showView('auth-view');
    };
    
    const fetchProducts = async () => {
        const result = await apiFetch(`${API_BASE}?endpoint=products&action=get_all`);
        if(result && result.status === 'success') renderProducts(result.data);
    };
    
    window.fetchCart = async () => {
        const result = await apiFetch(`${API_BASE}?endpoint=cart&action=get`);
        if (result && result.status === 'success') renderCart(result.data);
    };

    window.addToCart = async (productId) => {
        if(!currentUser) {
            alert('Je moet ingelogd zijn om items toe te voegen.');
            return;
        }
        await apiFetch(`${API_BASE}?endpoint=cart&action=add`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ product_id: productId })
        });
        alert('Product toegevoegd aan winkelmandje!');
    };
    
    window.removeFromCart = async (cartItemId) => {
        await apiFetch(`${API_BASE}?endpoint=cart&action=remove`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_item_id: cartItemId })
        });
        fetchCart();
    };
    
    window.createOrder = async () => {
        if(confirm('Weet je zeker dat je deze bestelling wilt plaatsen?')) {
            const result = await apiFetch(`${API_BASE}?endpoint=orders&action=create`, { method: 'POST' });
            if(result && result.status === 'success') {
                alert('Bestelling succesvol geplaatst!');
                showView('orders-view');
                fetchOrders();
            }
        }
    };

    window.fetchOrders = async () => {
        const result = await apiFetch(`${API_BASE}?endpoint=orders&action=get_history`);
        if (result && result.status === 'success') renderOrders(result.data);
    };


    // --- Auth Form Toggle ---
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showLoginBtn = document.getElementById('show-login-btn');
    const showRegisterBtn = document.getElementById('show-register-btn');

    const toggleAuthForm = (formToShow) => {
        if (formToShow === 'login') {
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
            showLoginBtn.classList.add('border-reparo', 'text-reparo');
            showRegisterBtn.classList.remove('border-reparo', 'text-reparo');
        } else {
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
            showRegisterBtn.classList.add('border-reparo', 'text-reparo');
            showLoginBtn.classList.remove('border-reparo', 'text-reparo');
        }
    };
    showLoginBtn.addEventListener('click', () => toggleAuthForm('login'));
    showRegisterBtn.addEventListener('click', () => toggleAuthForm('register'));

    // --- Init ---
    // Expose functions to global scope to be accessible from inline onclick attributes
    window.showView = showView;
    window.fetchCart = fetchCart;
    window.fetchOrders = fetchOrders;
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.createOrder = createOrder;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    checkSession();
});
