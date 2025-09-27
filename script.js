// Global variables and state management
let currentUser = null;
let cart = [];
let orders = [];
let allOrders = [];
let products = [];
let currentSection = 'home';
let currentCheckoutStep = 1;
let isAdmin = false;

// Sample product data
const sampleProducts = [
    {
        id: 1,
        name: "Premium Wireless Headphones",
        category: "electronics",
        price: 299.99,
        originalPrice: 399.99,
        image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=300&fit=crop&crop=center",
        description: "High-quality wireless headphones with noise cancellation and premium sound quality.",
        rating: 4.8,
        reviews: 234,
        badge: "Bestseller"
    },
    {
        id: 2,
        name: "Smart Fitness Watch",
        category: "electronics",
        price: 199.99,
        originalPrice: 249.99,
        image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=300&fit=crop&crop=center",
        description: "Track your fitness goals with this advanced smartwatch featuring heart rate monitoring.",
        rating: 4.6,
        reviews: 156,
        badge: "New"
    },
    {
        id: 3,
        name: "Designer Leather Jacket",
        category: "fashion",
        price: 189.99,
        originalPrice: 299.99,
        image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=300&fit=crop&crop=center",
        description: "Genuine leather jacket with modern design, perfect for any occasion.",
        rating: 4.9,
        reviews: 89,
        badge: "Sale"
    },
    {
        id: 4,
        name: "Modern Coffee Table",
        category: "home",
        price: 149.99,
        originalPrice: null,
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&h=300&fit=crop&crop=center",
        description: "Elegant coffee table that complements any modern living room decor.",
        rating: 4.7,
        reviews: 67,
        badge: null
    },
    {
        id: 5,
        name: "Professional Running Shoes",
        category: "sports",
        price: 129.99,
        originalPrice: 179.99,
        image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=300&fit=crop&crop=center",
        description: "Lightweight running shoes designed for professional athletes and fitness enthusiasts.",
        rating: 4.5,
        reviews: 198,
        badge: "Popular"
    },
    {
        id: 6,
        name: "Luxury Skincare Set",
        category: "fashion",
        price: 89.99,
        originalPrice: 120.99,
        image: "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&h=300&fit=crop&crop=center",
        description: "Complete skincare routine with premium organic ingredients for radiant skin.",
        rating: 4.8,
        reviews: 145,
        badge: "Organic"
    },
    {
        id: 7,
        name: "4K Gaming Monitor",
        category: "electronics",
        price: 449.99,
        originalPrice: 599.99,
        image: "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=300&fit=crop&crop=center",
        description: "Ultra-wide 4K gaming monitor with HDR support and 144Hz refresh rate.",
        rating: 4.9,
        reviews: 312,
        badge: "Gaming"
    },
    {
        id: 8,
        name: "Minimalist Desk Lamp",
        category: "home",
        price: 79.99,
        originalPrice: null,
        image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=400&h=300&fit=crop&crop=center",
        description: "Adjustable LED desk lamp with touch controls and wireless charging base.",
        rating: 4.6,
        reviews: 78,
        badge: null
    }
];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadProducts();
    updateCartUI();
    loadStoredData();
});

// Initialize application
function initializeApp() {
    products = [...sampleProducts];
    
    // Check if user is logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        updateUserUI();
    }
    
    // Load cart from localStorage
    const savedCart = localStorage.getItem('cart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
    }
    
    // Load orders from localStorage
    const savedOrders = localStorage.getItem('orders');
    if (savedOrders) {
        orders = JSON.parse(savedOrders);
        allOrders = [...orders];
    }
    
    // Initialize navbar scroll effect
    window.addEventListener('scroll', handleNavbarScroll);
    
    // Set up intersection observer for animations
    setupIntersectionObserver();
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', handleSearch);
    
    // Cart functionality
    document.getElementById('cartBtn').addEventListener('click', openCart);
    document.getElementById('closeCart').addEventListener('click', closeCart);
    document.getElementById('checkoutBtn').addEventListener('click', openCheckoutModal);
    
    // Login functionality
    document.getElementById('loginBtn').addEventListener('click', openLoginModal);
    document.getElementById('authForm').addEventListener('submit', handleAuth);
    
    // Add Product functionality
    const addProductBtn = document.getElementById("addProductBtn");
    if (addProductBtn) {
        addProductBtn.addEventListener("click", () => {
            openAddProductModal();
        });
    }

    // Add Product form submission
    const addProductForm = document.getElementById("addProductForm");
    if (addProductForm) {
        addProductForm.addEventListener("submit", (e) => {
            e.preventDefault();

            const newProduct = {
                id: products.length + 1,
                name: document.getElementById("productName").value,
                price: parseFloat(document.getElementById("productPrice").value),
                category: document.getElementById("productCategory").value.toLowerCase(),
                image: document.getElementById("productImage").value,
                description: "",
                rating: 0,
                reviews: 0
            };

            // Add product to products array
            products.push(newProduct);

            // Re-render product management table
            updateAdminProducts();

            // Close modal and reset form
            closeAddProductModal();
            addProductForm.reset();

            // Show success message
            showToast("Product added successfully!", "success");
        });
    }
    
    // Filter tabs
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', handleCategoryFilter);
    });
    
    // Admin tabs
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', handleAdminTab);
    });
    
    // Load more products
    document.getElementById('loadMoreBtn').addEventListener('click', loadMoreProducts);
    
    // Close modals when clicking outside
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === overlay) {
                closeAllModals();
            }
        });
    });
    
    // Checkout form handling
    document.getElementById('checkoutForm').addEventListener('submit', function(e) {
        e.preventDefault();
    });
    
    // Payment method selection
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', handlePaymentMethodSelection);
    });
}

// Handle navbar scroll effect
function handleNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
}

// Setup intersection observer for animations
function setupIntersectionObserver() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });
    
    // Observe product cards
    setTimeout(() => {
        document.querySelectorAll('.product-card').forEach(card => {
            observer.observe(card);
        });
    }, 100);
}

// Navigation handling
function handleNavigation(e) {
    e.preventDefault();
    const href = e.target.getAttribute('href');
    const sectionId = href.substring(1);
    showSection(sectionId);
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
}

// Show specific section
// function showSection(sectionId) {
//     // Hide all sections
//     document.querySelectorAll('section').forEach(section => {
//         section.style.display = 'none';
//     });
    
//     // Show target section
//     const targetSection = document.getElementById(sectionId);
//     if (targetSection) {
//         targetSection.style.display = 'block';
//         currentSection = sectionId;
        
//         // Load section-specific data
//         if (sectionId === 'orders') {
//             loadUserOrders();
//         } else if (sectionId === 'admin') {
//             loadAdminData();
//         }
//     }
// }
function showSection(sectionId) {
    // hide all sections
    document.querySelectorAll("section").forEach(sec => sec.style.display = "none");
    
    // show requested section
    const section = document.getElementById(sectionId);
    if (section) section.style.display = "block";

    // if admin is shown, load data
    if (sectionId === "admin") {
        loadAdminData();
    }
}

// Smooth scroll to products
function scrollToProducts() {
    showSection('products');
    document.getElementById('products').scrollIntoView({ 
        behavior: 'smooth' 
    });
    
    // Update nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector('[href="#products"]').classList.add('active');
}

// Load and display products
function loadProducts(category = 'all') {
    const productsGrid = document.getElementById('productsGrid');
    let filteredProducts = products;
    
    if (category !== 'all') {
        filteredProducts = products.filter(product => product.category === category);
    }
    
    productsGrid.innerHTML = '';
    
    filteredProducts.forEach((product, index) => {
        const productCard = createProductCard(product);
        productCard.style.animationDelay = `${index * 0.1}s`;
        productsGrid.appendChild(productCard);
    });
    
    // Re-setup intersection observer
    setTimeout(setupIntersectionObserver, 100);
}

// Create product card element
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
        <div class="product-image">
            <img src="${product.image}" alt="${product.name}" onerror="this.src='https://via.placeholder.com/400x300?text=Product+Image'">
            ${product.badge ? `<div class="product-badge">${product.badge}</div>` : ''}
            <div class="product-actions">
                <button class="action-btn" onclick="addToWishlist(${product.id})" title="Add to Wishlist">
                    <i class="fas fa-heart"></i>
                </button>
                <button class="action-btn" onclick="quickView(${product.id})" title="Quick View">
                    <i class="fas fa-eye"></i>
                </button>
            </div>
        </div>
        <div class="product-info">
            <div class="product-category">${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</div>
            <h3 class="product-title">${product.name}</h3>
            <p class="product-description">${product.description}</p>
            <div class="product-rating">
                <div class="stars">
                    ${generateStars(product.rating)}
                </div>
                <span class="rating-count">(${product.reviews})</span>
            </div>
            <div class="product-price">
                <div>
                    <span class="price-current">$${product.price}</span>
                    ${product.originalPrice ? `<span class="price-original">$${product.originalPrice}</span>` : ''}
                </div>
            </div>
            <button class="add-to-cart-btn" onclick="addToCart(${product.id})">
                <i class="fas fa-shopping-cart"></i>
                Add to Cart
            </button>
        </div>
    `;
    return card;
}

// Generate star rating
function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star star"></i>';
    }
    
    if (hasHalfStar) {
        stars += '<i class="fas fa-star-half-alt star"></i>';
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
        stars += '<i class="fas fa-star star empty"></i>';
    }
    
    return stars;
}

// Category filter handling
function handleCategoryFilter(e) {
    const category = e.target.dataset.category;
    
    // Update active filter
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Filter products
    loadProducts(category);
}

// Search functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const allProducts = document.querySelectorAll('.product-card');
    
    allProducts.forEach(card => {
        const title = card.querySelector('.product-title').textContent.toLowerCase();
        const description = card.querySelector('.product-description').textContent.toLowerCase();
        const category = card.querySelector('.product-category').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// Cart functionality
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }
    
    updateCartUI();
    saveCartToStorage();
    showToast('Product added to cart!', 'success');
    
    // Add animation effect
    const cartBtn = document.getElementById('cartBtn');
    cartBtn.classList.add('scale-in');
    setTimeout(() => cartBtn.classList.remove('scale-in'), 300);
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartUI();
    saveCartToStorage();
    showToast('Product removed from cart', 'info');
}

// Update cart quantity
function updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }
    
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        updateCartUI();
        saveCartToStorage();
        updateOrderSummary(); // Update checkout modal totals if it's open
    }
}

// Update cart UI
function updateCartUI() {
    const cartCount = document.getElementById('cartCount');
    const cartItems = document.getElementById('cartItems');
    const cartEmpty = document.getElementById('cartEmpty');
    const cartFooter = document.getElementById('cartFooter');
    const cartSubtotal = document.getElementById('cartSubtotal');
    const cartTotal = document.getElementById('cartTotal');
    
    // Update cart count
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    
    // Update order summary in checkout if it's open
    updateOrderSummary();
    
    if (cart.length === 0) {
        cartItems.style.display = 'none';
        cartEmpty.style.display = 'block';
        cartFooter.style.display = 'none';
    } else {
        cartItems.style.display = 'block';
        cartEmpty.style.display = 'none';
        cartFooter.style.display = 'block';
        
        // Render cart items
        cartItems.innerHTML = cart.map(item => `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80x80?text=Product'">
                <div class="cart-item-info">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">$${item.price}</div>
                    <div class="quantity-controls">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" class="quantity-input" value="${item.quantity}" 
                               onchange="updateCartQuantity(${item.id}, parseInt(this.value))" min="1">
                        <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <button class="remove-item" onclick="removeFromCart(${item.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
        
        // Calculate totals
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartSubtotal.textContent = `$${subtotal.toFixed(2)}`;
        cartTotal.textContent = `$${subtotal.toFixed(2)}`;
    }
}

// Open/close cart
function openCart() {
    document.getElementById('cartSidebar').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCart() {
    document.getElementById('cartSidebar').classList.remove('open');
    document.body.style.overflow = 'auto';
}

// Authentication
function openLoginModal() {
    document.getElementById('loginModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function switchAuthMode(mode) {
    const authTitle = document.getElementById('authTitle');
    const authButtonText = document.getElementById('authButtonText');
    const nameGroup = document.getElementById('nameGroup');
    const confirmPasswordGroup = document.getElementById('confirmPasswordGroup');
    const authTabs = document.querySelectorAll('.auth-tab');
    
    authTabs.forEach(tab => tab.classList.remove('active'));
    
    if (mode === 'login') {
        authTitle.textContent = 'Sign In';
        authButtonText.textContent = 'Sign In';
        nameGroup.style.display = 'none';
        confirmPasswordGroup.style.display = 'none';
        document.querySelector('.auth-tab').classList.add('active');
    } else {
        authTitle.textContent = 'Sign Up';
        authButtonText.textContent = 'Sign Up';
        nameGroup.style.display = 'block';
        confirmPasswordGroup.style.display = 'block';
        document.querySelectorAll('.auth-tab')[1].classList.add('active');
    }
}

function handleAuth(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    const name = formData.get('name');
    const mode = document.getElementById('authTitle').textContent.toLowerCase().includes('sign in') ? 'login' : 'register';
    
    if (mode === 'register') {
        const confirmPassword = formData.get('confirmPassword');
        if (password !== confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }
    }
    
    // Simulate authentication
    showLoadingOverlay();
    
    setTimeout(() => {
        if (mode === 'login') {
            // Check if admin credentials
            if (email === 'admin@shopify.com' && password === 'admin123') {
                currentUser = { email, name: 'Admin', isAdmin: true };
                isAdmin = true;
                document.getElementById('adminLink').style.display = 'block';
            } else {
                currentUser = { email, name: name || 'User', isAdmin: false };
            }
        } else {
            currentUser = { email, name, isAdmin: false };
        }
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        updateUserUI();
        closeLoginModal();
        hideLoadingOverlay();
        showToast(`Welcome${currentUser.name ? ', ' + currentUser.name : ''}!`, 'success');
    }, 1500);
}

function updateUserUI() {
    const loginBtn = document.getElementById('loginBtn');
    if (currentUser) {
        loginBtn.innerHTML = `
            <i class="fas fa-user"></i>
            <span>${currentUser.name}</span>
        `;
        loginBtn.onclick = logout;
        
        if (currentUser.isAdmin) {
            document.getElementById('adminLink').style.display = 'block';
            isAdmin = true;
        }
    } else {
        loginBtn.innerHTML = `
            <i class="fas fa-user"></i>
            <span>Login</span>
        `;
        loginBtn.onclick = openLoginModal;
        document.getElementById('adminLink').style.display = 'none';
        isAdmin = false;
    }
}

function logout() {
    currentUser = null;
    isAdmin = false;
    localStorage.removeItem('currentUser');
    updateUserUI();
    showToast('Logged out successfully', 'info');
    
    if (currentSection === 'admin' || currentSection === 'orders') {
        showSection('home');
        document.querySelector('[href="#home"]').classList.add('active');
        document.querySelectorAll('.nav-link').forEach(link => {
            if (link.getAttribute('href') !== '#home') {
                link.classList.remove('active');
            }
        });
    }
}

function loadAdminData() {
    updateAdminOrders();
    updateAdminProducts();

    // only run metrics if analytics panel exists in DOM
    if (document.getElementById("totalOrders")) {
        updateAdminMetrics();
    }
}

function updateAdminMetrics() {
    const totalOrdersEl = document.getElementById("totalOrders");
    const totalRevenueEl = document.getElementById("totalRevenue");
    const totalCustomersEl = document.getElementById("totalCustomers");

    if (!totalOrdersEl || !totalRevenueEl || !totalCustomersEl) {
        console.warn("Admin analytics section not yet visible");
        return;
    }

    totalOrdersEl.textContent = allOrders.length;

    const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
    totalRevenueEl.textContent = `$${totalRevenue.toFixed(2)}`;

    const uniqueCustomers = new Set(allOrders.map(order => order.customer.email)).size;
    totalCustomersEl.textContent = uniqueCustomers;
}


// Checkout functionality
function openCheckoutModal() {
    if (!currentUser) {
        showToast('Please login to proceed with checkout', 'warning');
        openLoginModal();
        return;
    }
    
    if (cart.length === 0) {
        showToast('Your cart is empty!', 'warning');
        return;
    }
    
    document.getElementById('checkoutModal').classList.add('active');
    document.body.style.overflow = 'hidden';
    currentCheckoutStep = 1;
    updateCheckoutStep();
    populateOrderSummary();
}

function closeCheckoutModal() {
    document.getElementById('checkoutModal').classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openAddProductModal() {
    document.getElementById("addProductModal").style.display = "flex";
    document.body.style.overflow = 'hidden';
}

function closeAddProductModal() {
    document.getElementById("addProductModal").style.display = "none";
    document.body.style.overflow = 'auto';
}

function nextCheckoutStep() {
    if (currentCheckoutStep < 3) {
        if (validateCurrentStep()) {
            currentCheckoutStep++;
            updateCheckoutStep();
        }
    }
}

function prevCheckoutStep() {
    if (currentCheckoutStep > 1) {
        currentCheckoutStep--;
        updateCheckoutStep();
    }
}

function validateCurrentStep() {
    const currentForm = document.querySelector(`.form-step[data-step="${currentCheckoutStep}"]`);
    const inputs = currentForm.querySelectorAll('input[required], select[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!input.value) {
            isValid = false;
            input.classList.add('invalid');
            showToast(`Please fill in ${input.previousElementSibling.textContent}`, 'error');
        } else {
            input.classList.remove('invalid');
        }
    });
    
    // Simplified validation for dummy orders
    if (currentCheckoutStep === 2 && isValid) {
        const cardNumber = document.getElementById('cardNumber').value;
        const expiryDate = document.getElementById('expiryDate').value;
        const cvv = document.getElementById('cvv').value;
        
        // For testing, accept any card number that's at least 8 digits
        if (!/^\d{8,}$/.test(cardNumber.replace(/\s/g, ''))) {
            showToast('For testing: Enter at least 8 digits', 'warning');
            return false;
        }
        
        // For testing, accept any date in MM/YY format
        if (!/^\d{2}\/\d{2}$/.test(expiryDate)) {
            showToast('For testing: Use MM/YY format', 'warning');
            return false;
        }
        
        // For testing, accept any 3-digit number
        if (!/^\d{3}$/.test(cvv)) {
            showToast('For testing: Enter any 3 digits', 'warning');
            return false;
        }
    }
    
    return isValid;
}

function updateCheckoutStep() {
    const steps = document.querySelectorAll('.step');
    const formSteps = document.querySelectorAll('.form-step');
    
    // Update steps
    steps.forEach((step, index) => {
        if (index + 1 <= currentCheckoutStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Update form visibility
    formSteps.forEach((step, index) => {
        if (index + 1 === currentCheckoutStep) {
            step.classList.add('active');
        } else {
            step.classList.remove('active');
        }
    });
    
    // Update buttons
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const confirmBtn = document.getElementById('confirmOrderBtn');
    
    prevBtn.style.display = currentCheckoutStep === 1 ? 'none' : '';
    nextBtn.style.display = currentCheckoutStep === 3 ? 'none' : '';
    confirmBtn.style.display = currentCheckoutStep === 3 ? '' : 'none';
    
    // Update summary for final step
    if (currentCheckoutStep === 3) {
        updateOrderReview();
    }
    
    // Scroll to top of form
    document.querySelector('.checkout-modal').scrollTop = 0;
}

function updateOrderReview() {
    
    // Update buttons
    const prevBtn = document.getElementById('prevStepBtn');
    const nextBtn = document.getElementById('nextStepBtn');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    
    prevBtn.style.display = currentCheckoutStep === 1 ? 'none' : 'inline-flex';
    
    if (currentCheckoutStep === 3) {
        nextBtn.style.display = 'none';
        placeOrderBtn.style.display = 'inline-flex';
    } else {
        nextBtn.style.display = 'inline-flex';
        placeOrderBtn.style.display = 'none';
    }
}

function populateOrderSummary() {
    updateOrderSummary();
    const orderSummary = document.getElementById('orderSummary');
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    orderSummary.innerHTML = `
        <div class="order-items">
            ${cart.map(item => `
                <div class="order-product">
                    <img src="${item.image}" alt="${item.name}" class="order-product-image" onerror="this.src='https://via.placeholder.com/60x60?text=Product'">
                    <div class="order-product-info">
                        <div class="order-product-name">${item.name}</div>
                        <div class="order-product-details">Quantity: ${item.quantity}</div>
                    </div>
                    <div class="order-product-price">$${(item.price * item.quantity).toFixed(2)}</div>
                </div>
            `).join('')}
        </div>
        <div class="cart-total">
            <div class="total-row">
                <span>Subtotal:</span>
                <span>$${subtotal.toFixed(2)}</span>
            </div>
            <div class="total-row">
                <span>Shipping:</span>
                <span>Free</span>
            </div>
            <div class="total-row">
                <span>Tax:</span>
                <span>$${(subtotal * 0.08).toFixed(2)}</span>
            </div>
            <div class="total-row total-final">
                <span>Total:</span>
                <span>$${(subtotal * 1.08).toFixed(2)}</span>
            </div>
        </div>
    `;
}

function handlePaymentMethodSelection(e) {
    document.querySelectorAll('.payment-method').forEach(method => {
        method.classList.remove('active');
    });
    e.currentTarget.classList.add('active');
}

function placeOrder() {
    showLoadingOverlay();
    
    setTimeout(() => {
        const orderId = 'ORD-' + Date.now();
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const tax = subtotal * 0.08;
        const total = subtotal + tax;
        
        const order = {
            id: orderId,
            items: [...cart],
            subtotal: subtotal,
            tax: tax,
            total: total,
            date: new Date().toISOString(),
            status: 'Processing',
            customer: currentUser
        };
        
        orders.push(order);
        allOrders.push(order);
        
        // Clear cart
        cart = [];
        
        // Save to storage
        saveOrdersToStorage();
        saveCartToStorage();
        
        // Update UI
        updateCartUI();
        closeCheckoutModal();
        hideLoadingOverlay();
        
        showToast(`Order ${orderId} placed successfully!`, 'success');
        
        // Show order confirmation
        setTimeout(() => {
            showSection('orders');
            document.querySelector('[href="#orders"]').classList.add('active');
            document.querySelectorAll('.nav-link').forEach(link => {
                if (link.getAttribute('href') !== '#orders') {
                    link.classList.remove('active');
                }
            });

            // Send email notification (simulated)
            console.log('Sending order confirmation email to:', currentUser.email, 'for order:', orderId);
        }, 1000);
    }, 2000);
}

// Orders functionality
function loadUserOrders() {
    const ordersContainer = document.getElementById('ordersContainer');
    
    if (!currentUser) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-user-lock empty-icon"></i>
                <h3>Please login to view orders</h3>
                <p>Sign in to track your purchase history</p>
                <button class="cta-button" onclick="openLoginModal()">
                    Sign In
                </button>
            </div>
        `;
        return;
    }
    
    const userOrders = orders.filter(order => order.customer.email === currentUser.email);
    
    if (userOrders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-shopping-bag empty-icon"></i>
                <h3>No orders yet</h3>
                <p>Start shopping to see your orders here</p>
                <button class="cta-button" onclick="showSection('products')">
                    Start Shopping
                </button>
            </div>
        `;
    } else {
        ordersContainer.innerHTML = userOrders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <div class="order-id">Order ${order.id}</div>
                    <div class="order-date">${new Date(order.date).toLocaleDateString()}</div>
                    <div class="order-status status-${order.status.toLowerCase()}">${order.status}</div>
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-product">
                            <img src="${item.image}" alt="${item.name}" class="order-product-image" onerror="this.src='https://via.placeholder.com/60x60?text=Product'">
                            <div class="order-product-info">
                                <div class="order-product-name">${item.name}</div>
                                <div class="order-product-details">Quantity: ${item.quantity}</div>
                            </div>
                            <div class="order-product-price">$${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">Total: $${order.total.toFixed(2)}</div>
            </div>
        `).join('');
    }
}

// Admin functionality
function loadAdminData() {
    if (!isAdmin) {
        document.getElementById('admin').innerHTML = `
            <div class="container">
                <div class="empty-state">
                    <i class="fas fa-lock empty-icon"></i>
                    <h3>Access Denied</h3>
                    <p>You don't have permission to access this section</p>
                </div>
            </div>
        `;
        return;
    }
    
    updateAdminMetrics();
    loadAdminOrders();
}

function updateAdminMetrics() {
    document.getElementById('totalOrders').textContent = allOrders.length;
    
    const totalRevenue = allOrders.reduce((sum, order) => sum + order.total, 0);
    document.getElementById('totalRevenue').textContent = `$${totalRevenue.toFixed(2)}`;
    
    const uniqueCustomers = new Set(allOrders.map(order => order.customer.email)).size;
    document.getElementById('totalCustomers').textContent = uniqueCustomers;
}

function loadAdminOrders() {
    const adminOrdersList = document.getElementById('adminOrdersList');
    
    if (allOrders.length === 0) {
        adminOrdersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clipboard-list empty-icon"></i>
                <h3>No orders found</h3>
                <p>Orders will appear here once customers start purchasing</p>
            </div>
        `;
    } else {
        adminOrdersList.innerHTML = allOrders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <div class="order-id">Order ${order.id}</div>
                    <div class="order-date">${new Date(order.date).toLocaleDateString()}</div>
                    <div class="order-status status-${order.status.toLowerCase()}">${order.status}</div>
                </div>
                <div class="order-customer">
                    <strong>Customer:</strong> ${order.customer.name} (${order.customer.email})
                </div>
                <div class="order-items">
                    ${order.items.map(item => `
                        <div class="order-product">
                            <img src="${item.image}" alt="${item.name}" class="order-product-image" onerror="this.src='https://via.placeholder.com/60x60?text=Product'">
                            <div class="order-product-info">
                                <div class="order-product-name">${item.name}</div>
                                <div class="order-product-details">Quantity: ${item.quantity}</div>
                            </div>
                            <div class="order-product-price">$${(item.price * item.quantity).toFixed(2)}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="order-total">Total: $${order.total.toFixed(2)}</div>
                <div class="order-actions" style="margin-top: 16px;">
                    <select class="status-select" onchange="updateOrderStatus('${order.id}', this.value)">
                        <option value="Processing" ${order.status === 'Processing' ? 'selected' : ''}>Processing</option>
                        <option value="Shipped" ${order.status === 'Shipped' ? 'selected' : ''}>Shipped</option>
                        <option value="Delivered" ${order.status === 'Delivered' ? 'selected' : ''}>Delivered</option>
                    </select>
                </div>
            </div>
        `).join('');
    }
}

function handleAdminTab(e) {
    const tabName = e.target.dataset.tab;
    
    // Update active tab
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Show corresponding panel
    document.querySelectorAll('.admin-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    document.getElementById(`admin${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).style.display = 'block';
    
    if (tabName === 'analytics') {
        updateAdminMetrics();
    }
}

function updateOrderStatus(orderId, newStatus) {
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
        order.status = newStatus;
        
        // Update in user orders as well
        const userOrder = orders.find(o => o.id === orderId);
        if (userOrder) {
            userOrder.status = newStatus;
        }
        
        saveOrdersToStorage();
        showToast(`Order ${orderId} status updated to ${newStatus}`, 'success');
    }
}

// Utility functions
function addToWishlist(productId) {
    showToast('Added to wishlist!', 'success');
}

function quickView(productId) {
    showToast('Quick view feature coming soon!', 'info');
}

function loadMoreProducts() {
    // Simulate loading more products
    showLoadingOverlay();
    setTimeout(() => {
        hideLoadingOverlay();
        showToast('All products loaded!', 'info');
        document.getElementById('loadMoreBtn').style.display = 'none';
    }, 1000);
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <i class="${icons[type]} toast-icon"></i>
        <span class="toast-message">${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    toastContainer.appendChild(toast);
    
    // Show toast
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 5000);
}

function showLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoadingOverlay() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function closeAllModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Storage functions
function saveCartToStorage() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function saveOrdersToStorage() {
    localStorage.setItem('orders', JSON.stringify(orders));
    localStorage.setItem('allOrders', JSON.stringify(allOrders));
}

function updateOrderReview() {
    // Update shipping review
    const shippingReview = document.getElementById('shippingReview');
    shippingReview.innerHTML = `
        <p><strong>${document.getElementById('firstName').value} ${document.getElementById('lastName').value}</strong></p>
        <p>${document.getElementById('email').value}</p>
        <p>${document.getElementById('address').value}</p>
        <p>${document.getElementById('city').value}, ${document.getElementById('state').value} ${document.getElementById('zipCode').value}</p>
        <p>${document.getElementById('phone').value}</p>
    `;
    
    // Update payment review
    const paymentReview = document.getElementById('paymentReview');
    const paymentMethod = document.querySelector('.payment-method.active').dataset.method;
    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('cardNumber').value;
        const lastFour = cardNumber.slice(-4);
        paymentReview.innerHTML = `
            <p>Credit Card ending in ${lastFour}</p>
            <p>Expires: ${document.getElementById('expiryDate').value}</p>
        `;
    } else {
        paymentReview.innerHTML = '<p>PayPal</p>';
    }
    
    // Update order summary
    updateOrderSummary();
}

function updateOrderSummary() {
    const summaryItems = document.getElementById('summaryItems');
    const subtotalAmount = document.getElementById('subtotalAmount');
    const shippingAmount = document.getElementById('shippingAmount');
    const taxAmount = document.getElementById('taxAmount');
    const totalAmount = document.getElementById('totalAmount');
    
    if (!summaryItems || !subtotalAmount || !shippingAmount || !taxAmount || !totalAmount) {
        return; // Elements not found, probably modal not open
    }
    
    // Calculate totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal > 100 ? 0 : 10;
    const tax = subtotal * 0.08; // 8% tax
    const total = subtotal + shipping + tax;
    
    // Update summary items
    summaryItems.innerHTML = cart.map(item => `
        <div class="summary-item">
            <div class="item-info">
                <img src="${item.image}" alt="${item.name}" width="50" height="50">
                <div>
                    <h6>${item.name}</h6>
                    <p>Qty: ${item.quantity}</p>
                </div>
            </div>
            <span>$${(item.price * item.quantity).toFixed(2)}</span>
        </div>
    `).join('');
    
    // Update totals
    subtotalAmount.textContent = `$${subtotal.toFixed(2)}`;
    shippingAmount.textContent = shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`;
    taxAmount.textContent = `$${tax.toFixed(2)}`;
    totalAmount.textContent = `$${total.toFixed(2)}`;
    
    // Also update the review step if it's visible
    const reviewTotal = document.querySelector('.form-step[data-step="3"] .order-review .order-summary');
    if (reviewTotal && currentCheckoutStep === 3) {
        reviewTotal.innerHTML = `
            <div class="review-totals">
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>$${subtotal.toFixed(2)}</span>
                </div>
                <div class="total-row">
                    <span>Shipping:</span>
                    <span>${shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
                </div>
                <div class="total-row">
                    <span>Tax:</span>
                    <span>$${tax.toFixed(2)}</span>
                </div>
                <div class="total-row grand-total">
                    <span>Total:</span>
                    <span>$${total.toFixed(2)}</span>
                </div>
            </div>
        `;
    }
}

function confirmOrder() {
    if (!validateCurrentStep()) {
        return;
    }
    
    // Show loading state
    showLoadingOverlay();
    
    // Calculate totals
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    const shipping = subtotal > 100 ? 0 : 10;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    
    // Create detailed order object
    const order = {
        id: 'ORD-' + Date.now(),
        date: new Date().toISOString(),
        customer: {
            name: `${document.getElementById('firstName').value} ${document.getElementById('lastName').value}`,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            address: {
                street: document.getElementById('address').value,
                city: document.getElementById('city').value,
                state: document.getElementById('state').value,
                zipCode: document.getElementById('zipCode').value,
                full: `${document.getElementById('address').value}, ${document.getElementById('city').value}, ${document.getElementById('state').value} ${document.getElementById('zipCode').value}`
            }
        },
        items: cart.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
            subtotal: item.price * item.quantity
        })),
        payment: {
            method: document.querySelector('.payment-method.active').dataset.method,
            details: document.querySelector('.payment-method.active').dataset.method === 'card' ? {
                cardType: 'Credit Card',
                last4: document.getElementById('cardNumber').value.slice(-4),
                expiry: document.getElementById('expiryDate').value
            } : {
                type: 'PayPal'
            }
        },
        summary: {
            subtotal: subtotal,
            shipping: shipping,
            tax: tax,
            total: total
        },
        status: 'pending',
        statusHistory: [{
            status: 'pending',
            date: new Date().toISOString(),
            note: 'Order placed by customer'
        }],
        timestamps: {
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            estimated_delivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
        }
    };
    
    // Initialize arrays if they don't exist
    if (!Array.isArray(orders)) orders = [];
    if (!Array.isArray(allOrders)) allOrders = [];
    
    // Add to both user orders and admin orders
    orders.push(order);
    allOrders.push(order);
    saveOrdersToStorage();
    
    // Clear cart
    cart = [];
    saveCartToStorage();
    updateCartCount();
    
    // Update UI after short delay to simulate processing
    setTimeout(() => {
        // Hide loading
        hideLoadingOverlay();
        
        // Close modal
        closeCheckoutModal();
        
        // Show success message with order ID
        showToast(`Order #${order.id} placed successfully! Check your email for confirmation.`, 'success');
        
        // Refresh orders if we're on the orders page
        if (currentSection === 'orders') {
            displayOrders();
        }
        
        // Refresh admin panel if we're on the admin page and user is admin
        if (currentSection === 'admin' && isAdmin) {
            updateAdminMetrics();
            displayAdminOrders();
        }
    }, 2000);
}

function loadStoredData() {
    const savedAllOrders = localStorage.getItem('allOrders');
    if (savedAllOrders) {
        allOrders = JSON.parse(savedAllOrders);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        closeAllModals();
        closeCart();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// Service Worker Registration (for PWA capabilities)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/sw.js')
            .then(function(registration) {
                console.log('ServiceWorker registration successful');
            })
            .catch(function(error) {
                console.log('ServiceWorker registration failed');
            });
    });
}