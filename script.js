// script.js
// --- Konfigurasi Awal ---
// >>> PENTING: GANTI URL DI BAWAH INI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA <<<
const PRODUCTS_API_URL = 'https://script.google.com/macros/s/AKfycbzlgtrnZHoWyDP7GoZpZZrbwFF0mF3fS0DKxgMSrHIQ0qJGZv-xT1YMpfaKWl8hiUHysQ/exec'; // URL ini adalah contoh, pastikan Anda menggantinya
// <<< JANGAN LUPA GANTI! >>>

let cart;
try {
    const storedCart = localStorage.getItem('cart');
    if (storedCart === "null" || storedCart === "undefined" || !storedCart) {
        cart = [];
    } else {
        cart = JSON.parse(storedCart);
    }

    if (!Array.isArray(cart)) {
        cart = [];
        console.warn("Keranjang dari localStorage bukan array atau tidak valid, menginisialisasi ulang.");
    }
} catch (e) {
    console.error("Gagal mem-parse keranjang dari localStorage:", e);
    cart = [];
}

// Deklarasi elemen-elemen DOM.
const shoppingCartSidebar = document.getElementById('shopping-cart-sidebar');
const checkoutPopup = document.getElementById('checkout-popup-overlay'); // Pastikan ID ini benar
const checkoutForm = document.getElementById('checkout-form');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPriceElement = document.getElementById('cart-total-price');
// const cartItemCountElement = document.getElementById('cart-item-count'); // HAPUS INI
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const whatsappOrderBtn = document.getElementById('whatsapp-order-btn');
const closePopupBtn = document.getElementById('close-checkout-popup'); // Pastikan ID ini benar
const confirmOrderBtn = document.getElementById('confirm-order-btn'); // Pastikan ID ini benar
const productListContainer = document.querySelector('.product-list');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadingMessage = document.getElementById('loading-products');
// const cartIcon = document.getElementById('cart-icon'); // HAPUS INI

let allProducts = [];

// --- Fungsi Utilitas ---
function formatRupiah(angka) {
    if (isNaN(angka) || angka === null) {
        return 'Rp 0';
    }
    let reverse = angka.toString().split('').reverse().join('');
    let ribuan = reverse.match(/\d{1,3}/g);
    let hasil = ribuan.join('.').split('').reverse().join('');
    return 'Rp ' + hasil;
}

// --- Fungsi untuk Mengambil & Merender Produk dari Google Sheets ---
async function fetchProducts() {
    if (loadingMessage) {
        loadingMessage.style.display = 'block';
    }

    try {
        const response = await fetch(PRODUCTS_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allProducts = data;
        renderProducts(allProducts);
    } catch (error) {
        console.error('Error fetching products:', error);
        if (productListContainer) {
            productListContainer.innerHTML = '<p style="text-align: center; color: red;">Gagal memuat produk. Silakan periksa URL Web App Anda, koneksi internet, atau coba lagi nanti.</p>';
        }
    } finally {
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
    }
}

function renderProducts(productsToRender) {
    if (!productListContainer) {
        console.error("Elemen '.product-list' tidak ditemukan di HTML. Rendering produk dibatalkan.");
        return;
    }
    productListContainer.innerHTML = '';

    if (productsToRender.length === 0) {
        productListContainer.innerHTML = '<p style="text-align: center; color: #888;">Tidak ada produk ditemukan.</p>';
        return;
    }

    productsToRender.forEach(product => {
        const productId = product.ID_Produk_Internal;
        const productName = product['Product Name'];
        const price = parseFloat(product['Price']);
        const category = product['Satuan Unit'] || 'Umum';
        const imageUrl = product['Image Link'] || '';
        const stock = product['Stock'];
        const description = product['Description'] || '';
        const tampil = product['Tampil'];

        if (!productName || isNaN(price) || tampil === false) {
            console.warn('Produk dengan nama, harga tidak valid, atau disembunyikan diabaikan:', product);
            return;
        }

        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.setAttribute('data-product-id', productId);
        productCard.setAttribute('data-product-name', productName);
        productCard.setAttribute('data-price', price);
        productCard.setAttribute('data-category', category);

        const imageHtml = imageUrl ?
            `<img src="${imageUrl}" alt="${productName}" onerror="this.onerror=null;this.src='https://via.placeholder.com/150x150?text=No+Image';this.classList.add('placeholder-img');"/>` :
            `<i class="fas fa-box" style="font-size: 60px; color: #bdbdbd;"></i>`;

        productCard.innerHTML = `
            <div class="product-image">
                ${imageHtml}
                <span class="product-category">${category}</span>
            </div>
            <h3>${productName}</h3>
            <p class="product-price">${formatRupiah(price)}</p>
            <p class="product-stock">Stok: ${stock && stock !== '' ? stock : 'Tidak Tersedia'}</p>
            <p class="product-description">${description}</p>
            <button class="add-to-cart" onclick="addToCart('${productId}', '${productName}', ${price})">
                <i class="fas fa-shopping-cart"></i> Tambah ke Keranjang
            </button>
        `;
        productListContainer.appendChild(productCard);
    });
}

// --- Fungsi Pencarian Produk ---
function searchProducts() {
    if (!searchInput) {
        console.warn("Elemen 'searchInput' tidak ditemukan.");
        return;
    }
    const searchTerm = searchInput.value.trim().toLowerCase();
    const filteredProducts = allProducts.filter(product => {
        const productName = (product['Product Name'] || '').toLowerCase();
        const category = (product['Satuan Unit'] || '').toLowerCase();
        const sku = (product['SKU'] || '').toLowerCase();
        const description = (product['Description'] || '').toLowerCase();

        return productName.includes(searchTerm) ||
               category.includes(searchTerm) ||
               sku.includes(searchTerm) ||
               description.includes(searchTerm);
    });
    renderProducts(filteredProducts);
}

// --- Fungsi Keranjang Belanja ---
function addToCart(productId, productName, price) {
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ id: productId, name: productName, price: price, quantity: 1 });
    }
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    showCart(); // Pastikan keranjang muncul saat produk pertama ditambahkan
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    if (cart.length === 0) {
        hideCart(); // Sembunyikan sidebar jika keranjang kosong setelah dihapus
    }
}

function updateQuantity(productId, newQuantity) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        if (newQuantity <= 0) {
            removeFromCart(productId);
        } else {
            item.quantity = newQuantity;
            localStorage.setItem('cart', JSON.stringify(cart));
            renderCart();
        }
    }
}

function renderCart() {
    if (!cartItemsContainer || !cartTotalPriceElement) {
        console.warn("Elemen keranjang (container atau total price) tidak ditemukan di HTML. Rendering keranjang dibatalkan.");
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;
    // let itemCount = 0; // Tidak lagi digunakan untuk display di header

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Keranjang kosong.</p>';
        cartTotalPriceElement.textContent = formatRupiah(0);
        hideCart(); // Sembunyikan sidebar jika keranjang kosong
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        // itemCount += item.quantity; // Tidak lagi digunakan untuk display di header

        const cartItemDiv = document.createElement('div');
        cartItemDiv.classList.add('cart-item');
        cartItemDiv.innerHTML = `
            <span>${item.name} (${item.quantity} pcs)</span>
            <div class="cart-item-controls">
                <button onclick="updateQuantity('${item.id}', ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button onclick="updateQuantity('${item.id}', ${item.quantity + 1})">+</button>
                <span class="cart-item-price">${formatRupiah(itemTotal)}</span>
                <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">&times;</button>
            </div>
        `;
        cartItemsContainer.appendChild(cartItemDiv);
    });

    cartTotalPriceElement.textContent = formatRupiah(total);
    // if (cartItemCountElement) { cartItemCountElement.textContent = itemCount.toString(); } // HAPUS INI
    showCart(); // Pastikan keranjang tetap terbuka jika ada item
}

function showCart() {
    if (shoppingCartSidebar) {
        shoppingCartSidebar.classList.add('open');
    }
}

function hideCart() {
    if (shoppingCartSidebar) {
        shoppingCartSidebar.classList.remove('open');
    }
}

// --- Fungsi Pop-up Checkout ---
function openCheckoutPopup() {
    if (cart.length === 0) {
        alert('Keranjang Anda kosong. Silakan tambahkan produk terlebih dahulu.');
        return;
    }
    const popupCartItems = document.getElementById('popup-cart-items'); // Pastikan ID ini benar
    const popupCartTotalPrice = document.getElementById('popup-cart-total-price'); // Pastikan ID ini benar

    if (!popupCartItems || !popupCartTotalPrice || !checkoutPopup) {
        console.warn("Elemen popup checkout tidak ditemukan di HTML.");
        return;
    }

    popupCartItems.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('popup-cart-item');
        itemDiv.innerHTML = `
            <span>${item.name} (${item.quantity} pcs)</span>
            <span>${formatRupiah(itemTotal)}</span>
        `;
        popupCartItems.appendChild(itemDiv);
    });
    popupCartTotalPrice.textContent = formatRupiah(total);
    checkoutPopup.classList.add('open');
    hideCart();
}

function closeCheckoutPopup() {
    if (checkoutPopup) {
        checkoutPopup.classList.remove('open');
    }
}

if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const customerName = document.getElementById('customer-name').value;
        const customerAddress = document.getElementById('customer-address').value;
        const paymentMethodElement = document.querySelector('input[name="payment-method"]:checked');
        const paymentMethod = paymentMethodElement ? paymentMethodElement.value : 'Tidak dipilih';

        let orderSummary = `Halo Admin Bakuh, saya ingin memesan produk-produk berikut:\n\n`;
        let totalOrderPrice = 0;

        cart.forEach(item => {
            orderSummary += `- ${item.name} (${item.quantity} pcs) - ${formatRupiah(item.price)}/pcs = ${formatRupiah(item.price * item.quantity)}\n`;
            totalOrderPrice += item.price * item.quantity;
        });

        orderSummary += `\nTotal Harga: ${formatRupiah(totalOrderPrice)}`;
        orderSummary += `\nMetode Pembayaran: ${paymentMethod}`;
        orderSummary += `\nNama Lengkap: ${customerName}`;
        orderSummary += `\nAlamat Pengiriman: ${customerAddress}`;
        orderSummary += `\n\nTerima kasih!`;

        // Nomor WhatsApp tujuan
        const whatsappNumber = '6282113804174'; // Ganti dengan nomor WhatsApp Anda yang benar

        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(orderSummary)}`;
        window.open(whatsappUrl, '_blank');

        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart();
        closeCheckoutPopup();
        alert('Pesanan Anda telah dikirim ke WhatsApp!');
    });
}

// --- Inisialisasi Saat Halaman Dimuat ---
document.addEventListener('DOMContentLoaded', () => {
    // Event listener untuk tombol dan elemen keranjang lainnya
    // cartIcon.addEventListener('click', showCart); // HAPUS INI
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', hideCart);
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckoutPopup);
    }
    if (whatsappOrderBtn) {
        whatsappOrderBtn.addEventListener('click', () => {
             // Langsung buka checkout popup, lalu form akan handle pengiriman WA
            openCheckoutPopup();
        });
    }
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', closeCheckoutPopup);
    }
    if (confirmOrderBtn) {
        confirmOrderBtn.addEventListener('click', () => {
            if (checkoutForm) {
                checkoutForm.submit();
            } else {
                alert("Elemen form checkout tidak ditemukan.");
            }
        });
    }

    renderCart(); // Panggil renderCart untuk memastikan sidebar tersembunyi jika keranjang kosong saat dimuat
    fetchProducts();

    if (searchButton) {
        searchButton.addEventListener('click', searchProducts);
    }
    if (searchInput) {
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                searchProducts();
            }
        });
    }
});

// --- Smooth Scrolling untuk Navigasi ---
document.querySelectorAll('nav a').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// --- Highlight Nav Item Saat Scroll (Opsional) ---
const sections = document.querySelectorAll('section');
const navLi = document.querySelectorAll('nav ul li a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - sectionHeight / 3) {
            current = section.getAttribute('id');
        }
    });

    navLi.forEach(li => {
        li.classList.remove('active');
        if (li.getAttribute('href').includes(current)) {
            li.classList.add('active');
        }
    });
});
