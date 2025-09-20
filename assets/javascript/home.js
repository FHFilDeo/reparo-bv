        // Lucide icons
        lucide.createIcons();

        // Mobile menu toggle
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        mobileMenuButton.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
            document.getElementsByClassName('icon-wrapper')[0].classList.toggle('open')
        });

        // Single-page navigation
        const sections = document.querySelectorAll('.section');
        const navLinks = document.querySelectorAll('.nav-link');
        const mobileNavLinks = document.querySelectorAll('#mobile-menu a');

        function showSection(id) {
            // Hide all sections
            sections.forEach(section => {
                section.classList.remove('active');
            });
            // Show the target section
            const targetSection = document.getElementById(id);
            if(targetSection) {
                targetSection.classList.add('active');
            }

            // Update active nav link
            navLinks.forEach(link => {
                link.classList.remove('active');
                if(link.getAttribute('href') === `#${id}`) {
                    link.classList.add('active');
                }
            });
            
            // Close mobile menu on click
            mobileMenu.classList.add('hidden');
            document.getElementsByClassName('icon-wrapper')[0].classList.remove('open')
            
            // Scroll to top of the page to show the section
            window.scrollTo(0, 0);
        }

        document.addEventListener('DOMContentLoaded', () => {
    const views = document.querySelectorAll('.view');
    const navLinks = document.getElementById('nav-links');
    let currentUser = null;

    const API_BASE = '/assets/php/api.php';

    // --- UI Update Functies ---
    const updateNav = () => {
        if (currentUser) {
            navLinks.innerHTML = `
                <span class="text-reparo-gray">Welkom, ${currentUser.name}</span>
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.showSection('shop-view')">Winkel</button>
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.showSection('cart-view'); window.fetchCart();">Winkelmandje</button>
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.showSection('orders-view'); window.fetchOrders();">Bestellingen</button>
                <button id="logout-btn" class="font-semibold text-red-500 hover:text-red-700">Uitloggen</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', handleLogout);
        } else {
            navLinks.innerHTML = `
                <button class="font-semibold text-reparo-gray hover:text-reparo" onclick="window.showSection('auth-view')">Inloggen / Registreren</button>
            `;
        }
    };
    
    const renderProducts = (products) => {
        const grid = document.getElementById('product-grid');
        grid.innerHTML = products.map(p => `
            <div class="bg-white rounded-lg shadow-md overflow-hidden group">
                <div class="relative">
                    <img src="${p.image_url}" alt="${p.name}" class="w-full h-64 object-cover">
                    <div class="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                        <span class"font-bold text-xl">€${p.price}
                        <span id="${p.id}" class="text-white font-bold text-lg cursor-pointer hover:underline">Toevoegen</span>
                    </div>
                </div>
                <div class="p-4">
                    <h3 class="text-lg font-semibold">${p.name}</h3>
                    <p class="text-reparo-gray">${p.description}</p>
                </div>
            </div>
        `).join('');
    };

    const renderCart = (cartItems) => {
        const container = document.getElementById('cart-container');
        if (cartItems.length === 0) {
            container.innerHTML = '<p class="text-center text-reparo-gray">Je winkelmandje is leeg.</p>';
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
                            <p class="text-sm text-reparo-gray">Aantal: ${item.quantity}</p>
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
            container.innerHTML = '<p class="text-center text-reparo-gray">Je hebt nog geen bestellingen geplaatst.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="bg-white p-6 rounded-lg shadow-lg">
                <div class="flex justify-between items-center border-b pb-4 mb-4">
                    <div>
                        <p class="font-bold">Bestelling #${order.id}</p>
                        <p class="text-sm text-reparo-gray">Datum: ${new Date(order.order_date).toLocaleDateString('nl-NL')}</p>
                    </div>
                    <p class="font-bold text-lg">Totaal: €${order.total_price}</p>
                </div>
                <div>
                    ${order.items.map(item => `
                        <div class="flex items-center py-2">
                            <img src="${item.image_url}" class="w-12 h-12 rounded-md mr-4">
                            <div class="flex-grow">
                                <p>${item.name}</p>
                                <p class="text-sm text-reparo-gray">${item.quantity} x €${item.price_per_item}</p>
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
            showSection('shop-view');
            fetchProducts();
        } else {
            currentUser = null;
            showSection('auth-view');
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
            showSection('shop-view');
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
        showSection('auth-view');
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
                showSection('orders-view');
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
    window.showSection = showSection;
    window.fetchCart = fetchCart;
    window.fetchOrders = fetchOrders;
    window.addToCart = addToCart;
    window.removeFromCart = removeFromCart;
    window.createOrder = createOrder;

    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    checkSession();
});


        // Set initial active state based on hash or default to home
        document.addEventListener('DOMContentLoaded', () => {
            const hash = window.location.hash.substring(1);
            if (hash) {
                showSection(hash);
            } else {
                showSection('home');
            }
        });
        
        // Handle nav link clicks
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = e.target.getAttribute('href').substring(1);
                showSection(id);
                window.history.pushState(null, null, `#${id}`);
            });
        });
        
        mobileNavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const id = e.target.getAttribute('href').substring(1);
                showSection(id);
                window.history.pushState(null, null, `#${id}`);
            });
        });


        // --- NIEUWE CODE VOOR FORMULIER VERZENDING ---
        const reparatieForm = document.getElementById('reparatieForm');
        const formResponseContainer = document.getElementById('form-response');
        const formContainer = document.getElementById('form-container');

        reparatieForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const submitButton = reparatieForm.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.innerHTML = 'Moment...';
            formResponseContainer.innerHTML = '';

            const formData = new FormData(reparatieForm);

            fetch('/assets/php/handler.php', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json().then(data => ({ ok: response.ok, data })))
            .then(({ ok, data }) => {
                if (ok) {
                    reparatieForm.style.display = 'none';
                    formContainer.innerHTML = `<div class="text-center p-4 bg-green-100 text-green-800 rounded-lg">${data.message}</div>`;
                } else {
                    throw new Error(data.message || 'Er is een onbekende serverfout opgetreden.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                formResponseContainer.innerHTML = `<div class="mt-4 text-center p-3 bg-red-100 text-red-800 rounded-lg">${error.message}</div>`;
                submitButton.disabled = false;
                submitButton.innerHTML = 'Verstuur aanvraag';
            });
        });

        // Footer year
        document.getElementById('year').textContent = new Date().getFullYear();
        
        // Hyperlinks
        const mailto = document.getElementById('mailto')
        const tel = document.getElementById('tel')
        const instagram = document.getElementById('instagram')
        const facebook = document.getElementById('facebook')
        const whatsapp = document.getElementById('whatsapp')
        function testimonial(id) {
            return document.getElementById("testimonial" + id)
        }
        function service(id){
            return document.getElementById("service" + id)
        }
        mailto.onclick = () => {window.open('mailto:' + mailto.innerText, "_self")}
        tel.onclick = () => {window.open('tel:+31548201012', "_self")}
        instagram.onclick = () => {window.open('https://facebook.com/Reparonl', "_blank")}
        facebook.onclick = () => {window.open('https://instagram.com/Reparonl', "_blank")}
        whatsapp.onclick = () => {window.open('https://api.whatsapp.com/send/?phone=31627100140&type=phone_number&app_absent=0&text=Ik%20heb%20een%20vraag', "_blank")}
        testimonial('1').onclick = () => {window.open('https://maps.app.goo.gl/BYkYmDmkA5cmt1nV8', "_blank")}
        testimonial('2').onclick = () => {window.open('https://maps.app.goo.gl/ksBbNyYbvMmTxeKN6', "_blank")}
        testimonial('3').onclick = () => {window.open('https://maps.app.goo.gl/L7bNehVJmkiQg5R46', "_blank")}
        testimonial('main').onclick = () => {window.open('https://www.google.com/maps/place/Reparo/@52.3180069,6.51637,14z/data=!4m8!3m7!1s0x47c7f702d3a3aa6b:0x71b1400796d9c27c!8m2!3d52.3226771!4d6.5042366!9m1!1b1!16s%2Fg%2F1s049m4rp?entry=ttu&g_ep=EgoyMDI1MDgyNS4wIKXMDSoASAFQAw%3D%3D0', "_blank")}
        service('1').onclick = () => {showSection("producten")}
        service('2').onclick = () => {showSection("reparaties")}
        service('3').onclick = () => {showSection("producten"); openPage("accessoires", document.getElementById('accessoiresBTN'))}

        // Producten API
        function openPage(pageName, thisEMT) {
            // Hide all elements with class="tabcontent" by default */
        var i, tabcontent, tablinks;
        tabcontent = document.getElementsByTagName("tabsection");
        tablinks = document.getElementsByClassName("tablink");
        for (i = 0; i < tabcontent.length; i++) {
            tabcontent[i].classList.add('hidden');
            tablinks[i].classList.remove('underline');
        }
            // Show the specific tab content
        document.getElementById(pageName).classList.remove('hidden');
        thisEMT.classList.add('underline')
    }
            // Get the element with id="defaultOpen" and click on it
        document.getElementById("defaultOpen").click();
