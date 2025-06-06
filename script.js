// script.js

// --- Konfigurasi Awal ---
// >>> PENTING: GANTI URL DI BAWAH INI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA <<<
const PRODUCTS_API_URL = 'https://script.google.com/macros/s/AKfycbz0tQtwkME3kYQ8f9fSlIs4A1oC95TOsYP4Mz3c87APU_sWflvMWLgDwioWlSMiBTtrqQ/exec';
// <<< JANGAN LUPA GANTI! >>>

let cart;
try {
    const storedCart = localStorage.getItem('cart');
    // Memastikan jika storedCart adalah string "null" atau "undefined", itu diinterpretasikan sebagai null JavaScript
    if (storedCart === "null" || storedCart === "undefined" || !storedCart) {
        cart = [];
    } else {
        cart = JSON.parse(storedCart);
    }

    // Memastikan hasil parse adalah array. Jika tidak, inisialisasi ulang.
    if (!Array.isArray(cart)) {
        cart = [];
        console.warn("Keranjang dari localStorage bukan array atau tidak valid, menginisialisasi ulang.");
    }
} catch (e) {
    console.error("Gagal mem-parse keranjang dari localStorage:", e);
    cart = []; // Inisialisasi ulang jika ada error parsing
}

// Deklarasi elemen-elemen DOM. Gunakan pengecekan null di tempat penggunaan jika elemen ini opsional di HTML.
const shoppingCartSidebar = document.getElementById('shopping-cart-sidebar');
const checkoutPopup = document.getElementById('checkout-popup-overlay');
const checkoutForm = document.getElementById('checkout-form');
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPriceElement = document.getElementById('cart-total-price');
// const cartItemCountElement = document.getElementById('cart-item-count'); // TIDAK DIGUNAKAN LAGI KARENA IKON DIHEADER DIHAPUS
const closeSidebarBtn = document.getElementById('close-sidebar-btn');
const checkoutBtn = document.getElementById('checkout-btn');
const whatsappOrderBtn = document.getElementById('whatsapp-order-btn');
const closePopupBtn = document.getElementById('close-checkout-popup');
const confirmOrderBtn = document.getElementById('confirm-order-btn');
const productListContainer = document.querySelector('.product-list'); // Menggunakan querySelector untuk class
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const loadingMessage = document.getElementById('loading-products'); // ID ini harus ada di HTML Anda
// const cartIcon = document.getElementById('cart-icon'); // DIHAPUS

// Variabel global untuk menyimpan semua produk yang dimuat dari Google Sheet
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
    if (loadingMessage) { // Cek apakah elemen loadingMessage ada
        loadingMessage.style.display = 'block'; // Tampilkan pesan loading
    }

    try {
        const response = await fetch(PRODUCTS_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allProducts = data; // Simpan semua produk yang dimuat
        renderProducts(allProducts); // Render semua produk setelah dimuat
    } catch (error) {
        console.error('Error fetching products:', error);
        if (productListContainer) { // Cek apakah elemen productListContainer ada
            productListContainer.innerHTML = '<p style="text-align: center; color: red;">Gagal memuat produk. Silakan periksa URL Web App Anda, koneksi internet, atau coba lagi nanti.</p>';
        }
    } finally {
        if (loadingMessage) { // Cek apakah elemen loadingMessage ada
            loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
        }
    }
}

function renderProducts(productsToRender) {
    if (!productListContainer) { // Penting: Pastikan kontainer produk ada sebelum memanipulasinya
        console.error("Elemen '.product-list' tidak ditemukan di HTML. Rendering produk dibatalkan.");
        return;
    }
    productListContainer.innerHTML = ''; // Kosongkan container sebelum merender

    if (productsToRender.length === 0) {
        productListContainer.innerHTML = '<p style="text-align: center; color: #888;">Tidak ada produk ditemukan.</p>';
        return;
    }

    productsToRender.forEach(product => {
        // --- Sesuaikan nama properti dengan header Google Sheet Anda ---
        const productId = product.ID_Produk_Internal;
        const productName = product['Product Name'];
        const price = parseFloat(product['Price']);
        const category = product['Satuan Unit'] || 'Umum'; // Jika 'Satuan Unit' juga digunakan sebagai kategori
        const imageUrl = product['Image URL'] || '';
        const stock = product['Stock'];
        const description = product['Description'] || '';
        const tampil = product['Tampil']; // Ambil nilai 'Tampil'

        // Lewati produk jika Product Name atau Price tidak valid ATAU jika Tampil adalah FALSE
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
    if (!searchInput) { // Cek apakah elemen searchInput ada
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
    // Opsional: Jika keranjang kosong setelah dihapus, sembunyikan sidebar
    if (cart.length === 0) {
        hideCart();
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
    // Tambahkan pengecekan null sebelum mengakses properti
    if (!cartItemsContainer || !cartTotalPriceElement) {
        console.warn("Elemen keranjang (container atau total price) tidak ditemukan di HTML. Rendering keranjang dibatalkan.");
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let itemCount = 0; // Tidak lagi digunakan untuk display di header

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Keranjang kosong.</p>';
        cartTotalPriceElement.textContent = formatRupiah(0);
        // Sembunyikan sidebar jika keranjang kosong
        hideCart();
        return;
    }

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        itemCount += item.quantity;

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
    // Tidak ada lagi `cartItemCountElement.textContent` di sini
    showCart(); // Pastikan keranjang tetap terbuka jika ada item
}

function showCart() {
    if (shoppingCartSidebar) { // Cek apakah elemen sidebar ada
        shoppingCartSidebar.classList.add('open');
    }
}

function hideCart() {
    if (shoppingCartSidebar) { // Cek apakah elemen sidebar ada
        shoppingCartSidebar.classList.remove('open');
    }
}

// --- Fungsi Pop-up Checkout ---
function openCheckoutPopup() {
    if (cart.length === 0) {
        alert('Keranjang Anda kosong. Silakan tambahkan produk terlebih dahulu.');
        return;
    }
    const popupCartItems = document.getElementById('popup-cart-items');
    const popupCartTotalPrice = document.getElementById('popup-cart-total-price');

    // Tambahkan pengecekan null untuk elemen popup
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
    hideCart(); // Sembunyikan sidebar keranjang saat pop-up checkout muncul
}

function closeCheckoutPopup() {
    if (checkoutPopup) { // Cek apakah elemen popup ada
        checkoutPopup.classList.remove('open');
    }
}

// Pastikan checkoutForm ada sebelum menambahkan event listener
if (checkoutForm) {
    checkoutForm.addEventListener('submit', function(event) {
        event.preventDefault(); // Mencegah form dari reload halaman

        const customerName = document.getElementById('customer-name').value;
        const customerAddress = document.getElementById('customer-address').value;
        const paymentMethodElement = document.querySelector('input[name="payment-method"]:checked');
        const paymentMethod = paymentMethodElement ? paymentMethodElement.value : 'Tidak dipilih'; // Penanganan jika tidak ada yang dipilih

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
        // const whatsappNumber = '6281234567890'; // Ganti dengan nomor WhatsApp Anda

        const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(orderSummary)}`;
        window.open(whatsappUrl, '_blank');

        // Kosongkan keranjang setelah pesanan dikirim
        cart = [];
        localStorage.setItem('cart', JSON.stringify(cart));
        renderCart(); // Ini akan juga menyembunyikan sidebar karena keranjang kosong
        closeCheckoutPopup();
        alert('Pesanan Anda telah dikirim ke WhatsApp!');
    });
}


// --- Inisialisasi Saat Halaman Dimuat ---
document.addEventListener('DOMContentLoaded', () => {
    // Event listener untuk tombol dan elemen keranjang lainnya
    // cartIcon.addEventListener('click', showCart); // DIHAPUS
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', hideCart);
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckoutPopup);
    }
    if (whatsappOrderBtn) {
        whatsappOrderBtn.addEventListener('click', () => {
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

    renderCart(); // Render keranjang belanja yang mungkin sudah ada di localStorage (ini juga akan show/hide sidebar)
    fetchProducts(); // Panggil fungsi untuk memuat produk dari API

    // Event listener untuk search bar
    if (searchButton) { // Cek apakah elemen searchButton ada
        searchButton.addEventListener('click', searchProducts);
    }
    if (searchInput) { // Cek apakah elemen searchInput ada
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
