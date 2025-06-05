// script.js

// --- Konfigurasi Awal ---
const PRODUCTS_API_URL = 'https://script.google.com/macros/s/AKfycbz0tQtwkME3kYQ8f9fSlIs4A1oC95TOsYP4Mz3c87APU_sWflvMWLgDwioWlSMiBTtrqQ/exec';

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

const shoppingCartSidebar = document.getElementById('shopping-cart-sidebar');
const checkoutPopup = document.getElementById('checkout-popup-overlay');
const checkoutForm = document.getElementById('checkout-form');

// Tambahkan variabel ini untuk elemen-elemen keranjang yang mungkin tidak ada di HTML
const cartItemsContainer = document.getElementById('cart-items');
const cartTotalPriceElement = document.getElementById('cart-total-price');
const cartItemCountElement = document.getElementById('cart-item-count'); // Ini adalah yang perlu kita perhatikan
const closeSidebarBtn = document.getElementById('close-sidebar-btn'); // Pastikan ID ini benar di HTML Anda
const checkoutBtn = document.getElementById('checkout-btn'); // Pastikan ID ini benar di HTML Anda
const whatsappOrderBtn = document.getElementById('whatsapp-order-btn'); // Pastikan ID ini benar di HTML Anda
const closePopupBtn = document.getElementById('close-checkout-popup'); // Pastikan ID ini benar di HTML Anda
const confirmOrderBtn = document.getElementById('confirm-order-btn'); // Pastikan ID ini benar di HTML Anda

// Variabel global untuk menyimpan semua produk yang dimuat dari Google Sheet
let allProducts = [];

// ... (fungsi formatRupiah tetap sama) ...

// --- Fungsi untuk Mengambil & Merender Produk dari Google Sheets ---
async function fetchProducts() {
    try {
        const loadingMessage = document.getElementById('loading-products'); // ID ini harus ada di HTML Anda
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
            productListContainer.innerHTML = '<p style="text-align: center; color: red;">Gagal memuat produk. Silakan periksa URL Web App Anda, koneksi internet, atau coba lagi nanti.</p>';
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
    if (!productListContainer) { // Penting: Pastikan kontainer produk ada
        console.error("Elemen '.product-list' tidak ditemukan di HTML.");
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

// ... (fungsi searchProducts tetap sama) ...

// --- Fungsi Keranjang Belanja ---
// ... (fungsi addToCart, removeFromCart, updateQuantity tetap sama) ...

function renderCart() {
    // Tambahkan pengecekan null sebelum mengakses properti
    if (!cartItemsContainer || !cartTotalPriceElement) {
        console.warn("Elemen keranjang tidak ditemukan di HTML. Rendering keranjang dibatalkan.");
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;
    let itemCount = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p class="empty-cart-message">Keranjang kosong.</p>';
        cartTotalPriceElement.textContent = formatRupiah(0);
        if (cartItemCountElement) { // Hanya update jika elemen ini ada
            cartItemCountElement.textContent = '0';
        }
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
    if (cartItemCountElement) { // Hanya update jika elemen ini ada
        cartItemCountElement.textContent = itemCount.toString();
    }
}

// ... (fungsi showCart, hideCart, openCheckoutPopup, closeCheckoutPopup, checkoutForm.addEventListener tetap sama) ...

// --- Inisialisasi Saat Halaman Dimuat ---
document.addEventListener('DOMContentLoaded', () => {
    // Event listener untuk tombol dan elemen keranjang lainnya
    // PENTING: Jangan ada event listener untuk cartIcon karena sudah dihapus dari HTML
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', hideCart);
    }
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', openCheckoutPopup);
    }
    if (whatsappOrderBtn) {
        whatsappOrderBtn.addEventListener('click', handleConfirmOrder); // Jika Anda ingin tombol WhatsApp langsung dari sidebar
    }
    if (closePopupBtn) {
        closePopupBtn.addEventListener('click', closeCheckoutPopup);
    }
    if (confirmOrderBtn) { // Ini biasanya tombol "Konfirmasi Pesanan" di dalam popup
        confirmOrderBtn.addEventListener('click', () => checkoutForm.submit()); // Menggunakan submit form
    }

    renderCart(); // Render keranjang belanja yang mungkin sudah ada di localStorage
    fetchProducts(); // Panggil fungsi untuk memuat produk dari API

    // Event listener untuk search bar
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');

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

// ... (Smooth Scrolling dan Highlight Nav Item tetap sama) ...
