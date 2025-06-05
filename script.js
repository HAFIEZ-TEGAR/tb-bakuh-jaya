let cart = [];
const shoppingCartSidebar = document.querySelector('.shopping-cart-sidebar');
const checkoutPopup = document.getElementById('checkout-popup');
const checkoutForm = document.getElementById('checkout-form');

// Function to format price to Indonesian Rupiah
function formatRupiah(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Function to add item to cart
function addToCart(productId, productName, price) {
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1
        });
    }
    renderCart();
}

// Function to remove item from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCart();
}

// Function to update item quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            renderCart();
        }
    }
}

// Function to render cart items and update total
function renderCart() {
    const cartItemsContainer = document.getElementById('cart-items');
    cartItemsContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #888;">Keranjang kosong.</p>';
        hideCart();
    } else {
        cart.forEach(item => {
            const itemElement = document.createElement('div');
            itemElement.classList.add('cart-item');
            itemElement.innerHTML = `
                <div class="item-info">
                    <span>${item.name}</span>
                    <span>${formatRupiah(item.price)}</span>
                </div>
                <div class="item-quantity-controls">
                    <button onclick="updateQuantity('${item.id}', -1)">-</button>
                    <input type="text" class="item-quantity" value="${item.quantity}" readonly>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
            cartItemsContainer.appendChild(itemElement);
            total += item.price * item.quantity;
        });
        showCart();
    }

    document.getElementById('cart-total-price').textContent = formatRupiah(total);
}

function showCart() {
    shoppingCartSidebar.classList.add('show');
}

function hideCart() {
    shoppingCartSidebar.classList.remove('show');
}

// --- FUNGSI POP-UP CHECKOUT ---
function openCheckoutPopup() {
    if (cart.length === 0) {
        alert('Keranjang belanja Anda kosong. Silakan tambahkan produk terlebih dahulu.');
        return;
    }

    const popupCartList = document.getElementById('popup-cart-list');
    popupCartList.innerHTML = ''; // Kosongkan daftar sebelum mengisi

    let totalAmount = 0;

    cart.forEach(item => {
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <span>${item.name} (${item.quantity} pcs)</span>
            <span>${formatRupiah(item.price * item.quantity)}</span>
        `;
        popupCartList.appendChild(listItem);
        totalAmount += item.price * item.quantity;
    });

    document.getElementById('popup-total-price').textContent = formatRupiah(totalAmount);

    checkoutPopup.style.display = 'flex'; // Tampilkan pop-up dengan display: flex
    document.body.style.overflow = 'hidden'; // Nonaktifkan scroll body
}

function closeCheckoutPopup() {
    checkoutPopup.style.display = 'none'; // Sembunyikan pop-up
    document.body.style.overflow = 'auto'; // Aktifkan kembali scroll body
    checkoutForm.reset(); // Reset form setelah ditutup
}

// Event listener untuk tombol "Konfirmasi Pesanan" di dalam pop-up
checkoutForm.addEventListener('submit', function(event) {
    event.preventDefault(); // Mencegah form dari reload halaman

    const customerName = document.getElementById('customer-name').value.trim();
    const customerAddress = document.getElementById('customer-address').value.trim();
    const paymentMethod = document.querySelector('input[name="payment-method"]:checked').value;

    if (!customerName || !customerAddress) {
        alert('Mohon lengkapi Nama Lengkap dan Alamat Pengiriman Anda.');
        return;
    }

    // Buat pesan WhatsApp dengan detail pesanan dan info pelanggan
    let whatsappMessage = `Halo, saya ingin memesan produk-produk berikut:\n\n`;

    cart.forEach(item => {
        whatsappMessage += `- ${item.name} (${item.quantity} pcs) - ${formatRupiah(item.price * item.quantity)}\n`;
    });

    const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    whatsappMessage += `\nTotal: ${formatRupiah(totalAmount)}`;
    whatsappMessage += `\n\n--- Detail Pelanggan ---\n`;
    whatsappMessage += `Nama: ${customerName}\n`;
    whatsappMessage += `Alamat: ${customerAddress}\n`;
    whatsappMessage += `Metode Pembayaran: ${paymentMethod}\n`;
    whatsappMessage += `\nMohon konfirmasi pesanan saya. Terima kasih!`;

    const whatsappNumber = "6281234567890"; // Ganti dengan nomor WhatsApp Anda
    const whatsappURL = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;
    window.open(whatsappURL, '_blank');

    // Kosongkan keranjang dan tutup pop-up setelah pengiriman
    cart = [];
    renderCart();
    closeCheckoutPopup();
    alert('Pesanan Anda telah dikirim! Kami akan menghubungi Anda via WhatsApp.');
});

// --- AKHIR FUNGSI POP-UP CHECKOUT ---


// Function for searching products
function searchProducts() {
    const searchTerm = document.getElementById('searchInput').value.trim().toLowerCase();
    const productCards = document.querySelectorAll('.product-card');

    productCards.forEach(card => {
        const productName = card.getAttribute('data-product-name').toLowerCase();

        if (productName.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Initial render of the cart when the page loads
document.addEventListener('DOMContentLoaded', () => {
    renderCart();
    searchProducts();
});

// Smooth scroll for navigation links
document.querySelectorAll('nav ul li a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelectorAll('nav ul li a').forEach(link => {
            link.classList.remove('active');
        });
        this.classList.add('active');

        document.querySelector(this.getAttribute('href')).scrollIntoView({
            behavior: 'smooth'
        });
    });
});

// Optional: Highlight nav item based on scroll position
window.addEventListener('scroll', () => {
    let current = '';
    const sections = document.querySelectorAll('main section[id]');
    const scrollY = window.pageYOffset;

    sections.forEach(section => {
        const sectionTop = section.offsetTop - 70;
        const sectionHeight = section.clientHeight;
        if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    document.querySelectorAll('nav ul li a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});
