// script.js

// --- Konfigurasi Awal ---
const PRODUCTS_API_URL = 'https://script.google.com/macros/s/AKfycbz0tQtwkME3kYQ8f9fSlIs4A1oC95TOsYP4Mz3c87APU_sWflvMWLgDwioWlSMiBTtrqQ/exec'; // <<< GANTI DENGAN URL WEB APP ANDA DI SINI
let cart = JSON.parse(localStorage.getItem('cart')) || []; // Muat keranjang dari localStorage
const shoppingCartSidebar = document.getElementById('shopping-cart-sidebar');
const checkoutPopup = document.getElementById('checkout-popup-overlay');
const checkoutForm = document.getElementById('checkout-form');

// Variabel global untuk menyimpan semua produk yang dimuat dari Google Sheet
let allProducts = [];

// --- Fungsi Utilitas ---
function formatRupiah(angka) {
    let reverse = angka.toString().split('').reverse().join('');
    let ribuan = reverse.match(/\d{1,3}/g);
    let hasil = ribuan.join('.').split('').reverse().join('');
    return 'Rp ' + hasil;
}

// --- Fungsi untuk Mengambil & Merender Produk dari Google Sheets ---
async function fetchProducts() {
    try {
        const loadingMessage = document.getElementById('loading-products');
        if (loadingMessage) {
            loadingMessage.style.display = 'block'; // Tampilkan pesan loading
        }

        const response = await fetch(PRODUCTS_API_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        allProducts = data; // Simpan semua produk yang dimuat
        renderProducts(allProducts); // Render semua produk setelah dimuat
    } catch (error) {
        console.error('Error fetching products:', error);
        const productListContainer = document.querySelector('.product-list');
        if (productListContainer) {
            productListContainer.innerHTML = '<p style="text-align: center; color: red;">Gagal memuat produk. Silakan coba lagi nanti.</p>';
        }
    } finally {
        const loadingMessage = document.getElementById('loading-products');
        if (loadingMessage) {
            loadingMessage.style.display = 'none'; // Sembunyikan pesan loading
        }
    }
}

function renderProducts(productsToRender) {
    const productListContainer = document.querySelector('.product-list');
    productListContainer.innerHTML = ''; // Kosongkan container sebelum merender

    if (productsToRender.length === 0) {
        productListContainer.innerHTML = '<p style="text-align: center; color: #888;">Tidak ada produk ditemukan.</p>';
        return;
    }

    productsToRender.forEach(product => {
        // --- Sesuaikan nama properti dengan header Google Sheet Anda ---
        const productId = product.ID_Produk_Internal; // ID Internal dari Apps Script
        const productName = product['Product Name']; // Nama Produk dari Sheet
        const price = parseFloat(product['Price']); // Harga dari Sheet, pastikan jadi angka
        const category = product['Satuan Unit'] || 'Umum'; // Contoh: pakai Satuan Unit sebagai Kategori
        const imageUrl = product['Image URL'] || ''; // URL Gambar dari Sheet
        const stock = product['Stock']; // Stok dari Sheet
        const description = product['Description'] || ''; // Deskripsi dari Sheet

        // Default warna dan ikon jika tidak ada kolom di sheet Anda
        // Jika Anda menambahkan kolom 'Warna_Card' dan 'Ikon_FontAwesome' di sheet, Anda bisa ambil dari product.Warna_Card dan product.Ikon_FontAwesome
        const cardColor = '#f0f0f0';
        const iconClass = 'fa-box';

        // Lewati produk jika Product Name atau Price tidak valid
        if (!productName || isNaN(price)) {
            console.warn('Produk dengan nama atau harga tidak valid diabaikan:', product);
            return;
        }

        // Filter produk yang tidak ingin ditampilkan (jika ada kolom 'Tampil' di sheet dengan nilai 'FALSE')
        // Saat ini, Apps Script menyetel `product.Tampil = true;` secara default.
        // Jika Anda ingin mengontrol dari sheet, ubah di Apps Script dan pastikan nilai di sheet adalah string 'FALSE'.
        if (product.Tampil === false || product.Tampil === 'FALSE') {
            return;
        }

        const productCard = document.createElement('div');
        productCard.classList.add('product-card');
        productCard.setAttribute('data-product-id', productId);
        productCard.setAttribute('data-product-name', productName);
        productCard.setAttribute('data-price', price);
        productCard.setAttribute('data-category', category);

        productCard.innerHTML = `
            <div class="product-image" style="background-color: ${cardColor};">
                ${imageUrl ? `<img src="${imageUrl}" alt="${productName}" />` : `<i class="fas ${iconClass}" style="font-size: 50px; color: white;"></i>`}
                <span class="product-category">${category}</span>
            </div>
            <h3>${productName}</h3>
            <p class="product-price">${formatRupiah(price)}</p>
            <p class="product-stock">Stok: ${stock || 'Tidak Tersedia'}</p>
            <p class="product-description" style="font-size: 0.9em; color: #777; margin-top: 5px;">${description}</p>
            <button class="add-to-cart" onclick="addToCart('${productId}', '${productName}', ${price})">
                <i class="fas fa-shopping-cart"></i> Tambah ke Keranjang
            </button>
        `;
        productListContainer.appendChild(productCard);
    });
}

// --- Fungsi Pencarian Produk ---
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const filteredProducts = allProducts.filter(product => {
        const productName = (product['Product Name'] || '').toLowerCase(); //
        const category = (product['Satuan Unit'] || '').toLowerCase(); //
        const sku = (product['SKU'] || '').toLowerCase(); //
        const description = (product['Description'] || '').toLowerCase(); //

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
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
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
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalPriceElement = document.getElementById('cart-total-price');
    const cartItemCountElement = document.getElementById('cart-item-count');

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Keranjang kosong.</p>';
        cartTotalPriceElement.textContent = formatRupiah(0);
        cartItemCountElement.textContent = '0';
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
    cartItemCountElement.textContent = itemCount.toString();
}

function showCart() {
    shoppingCartSidebar.classList.add('open');
}

function hideCart() {
    shoppingCartSidebar.classList.remove('open');
}

// --- Fungsi Pop-up Checkout ---
function openCheckoutPopup() {
    if (cart.length === 0) {
        alert('Keranjang Anda kosong. Silakan tambahkan produk terlebih dahulu.');
        return;
    }
    const popupCartItems = document.getElementById('popup-cart-items');
    const popupCartTotalPrice = document.getElementById('popup-cart-total-price');
    
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
    checkoutPopup.classList.remove('open');
}

checkoutForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Mencegah form dari reload halaman

    const customerName = document.getElementById('customer-name').value;
    const customerAddress = document.getElementById('customer-address').value;
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

    let orderSummary = `Halo, saya ingin memesan produk-produk berikut:\n\n`;
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
    const whatsappNumber = '6282113804174'; // Ganti dengan nomor WhatsApp Anda

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(orderSummary)}`;
    window.open(whatsappUrl, '_blank');

    // Kosongkan keranjang setelah pesanan dikirim
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    renderCart();
    closeCheckoutPopup();
    alert('Pesanan Anda telah dikirim ke WhatsApp!');
});

// --- Inisialisasi Saat Halaman Dimuat ---
document.addEventListener('DOMContentLoaded', () => {
    renderCart(); // Render keranjang belanja yang mungkin sudah ada di localStorage
    fetchProducts(); // Panggil fungsi untuk memuat produk dari API
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
