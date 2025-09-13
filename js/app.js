console.log("app.js is loaded!")
// firebase configuration
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// firebase config
const firebaseConfig = {
    apiKey: "AIzaSyAgkInAjWJqslXEZf0omqQ5LeDNdcQYAVY",
    authDomain: "hotel-booking-app-bfba0.firebaseapp.com",
    projectId: "hotel-booking-app-bfba0",
    storageBucket: "hotel-booking-app-bfba0.firebasestorage.app",
    messagingSenderId: "304851763334",
    appId: "1:304851763334:web:35feaf0e41e6f6f1931107",
    measurementId: "G-F0X2FSYPSZ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// global variables - vanilla
let currentUser = null;
let selectedRoom = null;
let searchData = {};

// sample room data 
const roomsData = [
    {
        id: 1,
        type: "Deluxe Room",
        description: "Spacious room with city view, king bed, and modern amenities.",
        price: 150,
        amenities: ["WiFi", "TV", "Air Con", "Mini Bar"],
        maxGuests: 2,
        image: "deluxe-room.jpg"
    },
    {
        id: 2,
        type: "Suite",
        description: "Luxury suite with separate living area, ocean view, and premium amenities.",
        price: 280,
        amenities: ["WiFi", "TV", "Air Con", "Mini Bar", "Balcony", "Room Service"],
        maxGuests: 4,
        image: "suite.jpg"
    },
    {
        id: 3,
        type: "Standard Room",
        description: "Comfortable room with garden view and essential amenities.",
        price: 100,
        amenities: ["WiFi", "TV", "Air Con"],
        maxGuests: 2,
        image: "standard-room.jpg"
    }
];

// vanilla js - dom implemntation
function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function createElement(tag, className, content) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (content) element.innerHTML = content;
    return element;
}

// message functions 
function showMessage(elementId, message, type) {
    const messageEl = $(elementId);
    messageEl.textContent = message;
    messageEl.className = `message ${type} active`;
    setTimeout(() => {
        messageEl.classList.remove('active');
    }, 5000);
}

// modal functions
window.showModal = function (modalId) {
    $(modalId).classList.add('active');
}

window.closeModal = function (modalId) {
    $(modalId).classList.remove('active');
}

window.showLogin = function () {
    showModal('#loginModal');
}

window.showRegister = function () {
    showModal('#registerModal');
}

// authentication 
$('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#loginEmail').value;
    const password = $('#loginPassword').value;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        showMessage('#loginMessage', 'Login successful!', 'success');
        setTimeout(() => closeModal('loginModal'), 1500);
    } catch (error) {
        showMessage('#loginMessage', error.message, 'error');
    }
});

$('#registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = $('#registerEmail').value;
    const password = $('#registerPassword').value;
    const firstName = $('#firstName').value;
    const lastName = $('#lastName').value;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await addDoc(collection(db, 'users'), {
            uid: userCredential.user.uid,
            firstName,
            lastName,
            email,
            createdAt: new Date()
        });
        showMessage('#registerMessage', 'Registration successful!', 'success');
        setTimeout(() => closeModal('registerModal'), 1500);
    } catch (error) {
        showMessage('#registerMessage', error.message, 'error');
    }
});

window.logout = async function () {
    try {
        await signOut(auth);
        currentUser = null;
        updateUI();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

// auth state
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    updateUI();
    if (user) {
        loadUserBookings();
    }
});
// call components in a page - update ui
function updateUI() {
    const loginBtn = $('.nav-links button:first-child');
    const registerBtn = $('.nav-links button:nth-child(2)');
    const dashboardBtn = $('#dashboardBtn');
    const logoutBtn = $('#logoutBtn');

    if (currentUser) {
        loginBtn.style.display = 'none';
        registerBtn.style.display = 'none';
        dashboardBtn.style.display = 'inline-block';
        logoutBtn.style.display = 'inline-block';
    } else {
        loginBtn.style.display = 'inline-block';
        registerBtn.style.display = 'inline-block';
        dashboardBtn.style.display = 'none';
        logoutBtn.style.display = 'none';
        // redirect to search
        $('#container').style.display = 'flex';
        $('#searchSection').style.display = 'block';
        $('#roomsContainer').style.display = 'block';
        $('#dashboardSection').classList.remove('active');
    }
}

// room search
window.searchRooms = function () {
    const checkin = $('#checkin').value;
    const checkout = $('#checkout').value;
    const guests = parseInt($('#guests').value);

    if (!checkin || !checkout) {
        showMessage('#message', 'Please select check-in and check-out dates.', 'error');
        return;
    }

    if (new Date(checkin) >= new Date(checkout)) {
        showMessage('#message', 'Check-out date must be after check-in date.', 'error');
        return;
    }

    searchData = { checkin, checkout, guests };

    // loading
    $('#loading').style.display = 'block';
    $('#roomsGrid').innerHTML = '';

    // fake api call in search 
    setTimeout(() => {
        $('#loading').style.display = 'none';
        displayRooms(roomsData.filter(room => room.maxGuests >= guests));
        showMessage('#message', `Found ${roomsData.filter(room => room.maxGuests >= guests).length} available rooms.`, 'success');
    }, 1500);
}

function displayRooms(rooms) {
    const roomsGrid = $('#roomsGrid');
    roomsGrid.innerHTML = '';
    // room card
    rooms.forEach(room => {
        const roomCard = createElement('div', 'room-card');
        const nights = Math.ceil((new Date(searchData.checkout) - new Date(searchData.checkin)) / (1000 * 60 * 60 * 24));
        const totalPrice = room.price * nights;

        roomCard.innerHTML = `
             <div class="room-image">
                 <span>${room.type} Image</span>
             </div>
             <div class="room-info">
                 <h3 class="room-type">${room.type}</h3>
                 <p class="room-description">${room.description}</p>
                 <div class="room-amenities">
                     ${room.amenities.map(amenity => `<span class="amenity-tag">${amenity}</span>`).join('')}
                 </div>
                 <div class="room-price">$${room.price}/night (Total: $${totalPrice})</div>
                 <button class="select-room-btn" onclick="selectRoom(${room.id}, ${totalPrice})">Select Room</button>
             </div>
         `;
        roomsGrid.appendChild(roomCard);
    });
}

window.selectRoom = function (roomId, totalPrice) {
    if (!currentUser) {
        showMessage('#message', 'Please login to make a booking.', 'error');
        showLogin();
        return;
    }

    selectedRoom = roomsData.find(room => room.id === roomId);
    selectedRoom.totalPrice = totalPrice;
    selectedRoom.nights = Math.ceil((new Date(searchData.checkout) - new Date(searchData.checkin)) / (1000 * 60 * 60 * 24));

    // contact form
    if (currentUser.email) {
        $('#contactEmail').value = currentUser.email;
    }

    showModal('#contactModal');
}

// contact form submission
$('#contactForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentUser || !selectedRoom) {
        showMessage('#contactMessage', 'Please login and select a room first.', 'error');
        return;
    }

    const bookingData = {
        userId: currentUser.uid,
        roomId: selectedRoom.id,
        roomType: selectedRoom.type,
        checkin: searchData.checkin,
        checkout: searchData.checkout,
        guests: searchData.guests,
        nights: selectedRoom.nights,
        pricePerNight: selectedRoom.price,
        totalPrice: selectedRoom.totalPrice,
        guestInfo: {
            firstName: $('#contactName').value,
            lastName: $('#caontactTitle').value,
            email: $('#contactEmail').value,
            phone: $('#contactPhone').value,
            specialRequests: $('#specialRequests').value
        },
        status: 'upcoming',
        createdAt: new Date(),
        bookingId: 'BK' + Date.now()
    };

    try {
        await addDoc(collection(db, 'bookings'), bookingData);
        showMessage('#contactMessage', 'Booking confirmed successfully!', 'success');

        // clear form and close modal after delay
        setTimeout(() => {
            closeModal('contactModal');
            $('#contactForm').reset();
            selectedRoom = null;
            showDashboard();
        }, 2000);

    } catch (error) {
        showMessage('#contactMessage', 'Booking failed. Please try again.', 'error');
        console.error('Booking error:', error);
    }
});

// go to search 
// window.goHome = function(){
//     $('#searchSection').style.display = 'block';
//     $('#dashboardSection').classList.remove('active');
// }

// dashboard
window.showDashboard = function () {
    if (!currentUser) {
        showMessage('#message', 'Please login to access dashboard.', 'error');
        showLogin();
        return;
    }

    $('#container').style.display = 'none';
    // $('#searchSection').style.display = 'none';
    $('#roomsContainer').style.display = 'none';
    $('#roomsGrid').innerHTML = '';
    $('#dashboardSection').classList.add('active');
    loadUserBookings();
}

async function loadUserBookings() {
    // check auth 
    if (!currentUser) return;

    try {
        const q = query(collection(db, 'bookings'), where('userId', '==', currentUser.uid));
        const querySnapshot = await getDocs(q);

        const bookings = [];
        querySnapshot.forEach((doc) => {
            bookings.push({ id: doc.id, ...doc.data() });
        });

        displayBookings(bookings);
    } catch (error) {
        console.error('Error loading bookings:', error);
        showMessage('#message', 'Error loading bookings. Please try again.', 'error');
    }
}

function displayBookings(bookings) {
    const container = $('#bookingsContainer');
    container.innerHTML = '';
    // console.log('bookings',bookings);
    // booking array 
    if (bookings.length === 0) {
        container.innerHTML = `
     <div class="booking-card">
         <h3>No bookings found</h3>
         <p>You haven't made any bookings yet. <a href="#" onclick="showBackToSearch()">Search for rooms</a></p>
     </div>
 `;
        return;
    }

    //  upcoming and past bookings
    const now = new Date();
    const upcomingBookings = bookings.filter(booking =>
        // {
        //     console.log(booking);
        //     console.log(new Date(booking.checkin) > now);
        //     console.log('date, now', booking.checkin,now);
        //     console.log('date, now', new Date(booking.checkin),now);
        booking.status === 'upcoming' && new Date(booking.checkin + "T00:00:00") > now
        // }
    );
    const pastBookings = bookings.filter(booking =>
        booking.status === 'completed' || booking.status === 'cancelled' || new Date(booking.checkout) < now
    );

    // display upcoming bookings
    console.log('upcomingBookings', upcomingBookings);
    if (upcomingBookings.length > 0) {
        const upcomingSection = createElement('div');
        upcomingSection.innerHTML = '<h3 style="background-color:rgb(189, 224, 248); border-radius:5px;margin-bottom:15px;padding:5px 10px">Upcoming Bookings</h3>';
        upcomingBookings.forEach(booking => {
            const bookingCard = createBookingCard(booking, true);
            upcomingSection.appendChild(bookingCard);
        });
        container.appendChild(upcomingSection);
    }

    // past bookings
    console.log('pastBookings', pastBookings);
    if (pastBookings.length > 0) {
        const pastSection = createElement('div');
        pastSection.innerHTML = '<h3 style="margin-top: 2rem;background-color:rgb(255, 227, 181); border-radius:5px;margin-bottom:15px;padding:5px 10px">Past Bookings</h3>';
        pastBookings.forEach(booking => {
            const bookingCard = createBookingCard(booking, false);
            pastSection.appendChild(bookingCard);
        });
        container.appendChild(pastSection);
    }
}

function createBookingCard(booking, isUpcoming) {
    const card = createElement('div', 'booking-card');
    const checkinDate = new Date(booking.checkin).toLocaleDateString();
    const checkoutDate = new Date(booking.checkout).toLocaleDateString();
    const createdDate = booking.createdAt ? new Date(booking.createdAt.toDate()).toLocaleDateString() : 'N/A';

    // status
    let statusClass = 'status-completed';
    let statusText = 'Completed';

    if (booking.status === 'upcoming') {
        statusClass = 'status-upcoming';
        statusText = 'Upcoming';
    } else if (booking.status === 'cancelled') {
        statusClass = 'status-cancelled';
        statusText = 'Cancelled';
    }

    card.innerHTML = `
 <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
     <div>
         <h4>${booking.roomType}</h4>
         <span class="booking-status ${statusClass}">
             ${statusText}
         </span>
     </div>
     <div style="text-align: right;">
         <strong>$${booking.totalPrice}</strong>
         <p style="margin: 0; font-size: 0.9rem; color: #666;">Booking ID: ${booking.bookingId}</p>
     </div>
 </div>
 <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
     <div>
         <strong>Check-in:</strong><br>
         ${checkinDate}
     </div>
     <div>
         <strong>Check-out:</strong><br>
         ${checkoutDate}
     </div>
     <div>
         <strong>Guests:</strong><br>
         ${booking.guests}
     </div>
     <div>
         <strong>Nights:</strong><br>
         ${booking.nights}
     </div>
 </div>
 <div style="margin-bottom: 1rem;">
     <strong>Guest:</strong> ${booking.guestInfo.firstName} ${booking.guestInfo.lastName}<br>
     <strong>Email:</strong> ${booking.guestInfo.email}<br>
     <strong>Phone:</strong> ${booking.guestInfo.phone}<br>
     <strong>Booked on:</strong> ${createdDate}
     ${booking.guestInfo.specialRequests ? `<br><strong>Special Requests:</strong> ${booking.guestInfo.specialRequests}` : ''}
 </div>
 ${isUpcoming && booking.status === 'upcoming' ? `<button class="cancel-btn" onclick="cancelBooking('${booking.id}')">Cancel Booking</button>` : ''}
`;

    return card;
}

window.cancelBooking = async function (bookingId) {
    if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
        return;
    }

    try {
        await updateDoc(doc(db, 'bookings', bookingId), {
            status: 'cancelled',
            cancelledAt: new Date()
        });

        showMessage('#message', 'Booking cancelled successfully.', 'success');
        loadUserBookings(); // refresh
    } catch (error) {
        console.error('Error cancelling booking:', error);
        showMessage('#message', 'Failed to cancel booking. Please try again.', 'error');
    }
}

// go back
window.showBackToSearch = function () {
    $('#container').style.display = 'flex';
    $('#searchSection').style.display = 'block';
    $('#roomsContainer').style.display = 'block';
    $('#dashboardSection').classList.remove('active');
}

// initialize app 
function initApp() {
    console.log('initializing app...');

    // set minimum dates for checkin and checkout
    const today = new Date().toISOString().split('T')[0];
    const checkinInput = $('#checkin');
    const checkoutInput = $('#checkout');

    if (checkinInput) checkinInput.min = today;
    if (checkoutInput) checkoutInput.min = today;

    // update checkout
    if (checkinInput) {
        checkinInput.addEventListener('change', function () {
            const checkinDate = new Date(this.value);
            const nextDay = new Date(checkinDate.getTime() + 24 * 60 * 60 * 1000);
            if (checkoutInput) {
                checkoutInput.min = nextDay.toISOString().split('T')[0];

                if (checkoutInput.value && new Date(checkoutInput.value) <= checkinDate) {
                    checkoutInput.value = nextDay.toISOString().split('T')[0];
                }
            }
        });
    }

    // close modals when clicking outside
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });

    // prevent modal close when clicking inside modal content
    const modalContents = $$('.modal-content');
    modalContents.forEach(content => {
        content.addEventListener('click', function (e) {
            e.stopPropagation();
        });
    });

    // animations to buttons
    const buttons = $$('button');
    buttons.forEach(button => {
        button.addEventListener('mousedown', function () {
            this.style.transform = 'scale(0.95)';
        });

        button.addEventListener('mouseup', function () {
            this.style.transform = '';
        });

        button.addEventListener('mouseleave', function () {
            this.style.transform = '';
        });
    });

    // keyboard support for modals
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const activeModal = $('.modal.active');
            if (activeModal) {
                activeModal.classList.remove('active');
            }
        }
    });

    console.log('app initialized successfully with vanilla js!');
}

// handle browser navigation
window.addEventListener('popstate', function (e) {
    // browser back button use
    const dashboardSection = $('#dashboardSection');
    if (dashboardSection && dashboardSection.classList.contains('active')) {
        showBackToSearch();
    }
});

// verify firebase connection 
window.addEventListener('online', function () {
    console.log('connection restored');
    if (currentUser) {
        loadUserBookings();
    }
});

window.addEventListener('offline', function () {
    console.log('connection lost');
    showMessage('#message', 'Connection lost. Some features may not work properly.', 'error');
});


// ===========================================================================================================

// loading state 
function setLoadingState(elementId, isLoading) {
    const element = $(elementId);
    if (!element) return;

    if (isLoading) {
        element.disabled = true;
        element.innerHTML = '<span class="spinner"></span> Loading...';
    } else {
        element.disabled = false;
        // getback button text
        if (element.classList.contains('search-btn')) {
            element.innerHTML = 'Search Rooms';
        } else if (element.classList.contains('submit-btn')) {
            element.innerHTML = 'Submit';
        }
    }
}

// form validation
function validateForm(formId) {
    const form = $(formId);
    if (!form) return false;

    const requiredFields = form.querySelectorAll('[required]');
    let isValid = true;

    requiredFields.forEach(field => {
        if (!field.value.trim()) {
            field.classList.add('error');
            isValid = false;
        } else {
            field.classList.remove('error');
        }
    });

    return isValid;
}

// CSS for error states
const errorStyles = `
     .form-control.error {
         border-color: #e74c3c;
         box-shadow: 0 0 0 3px rgba(231, 76, 60, 0.1);
     }
     
     .status-cancelled {
         background: #fee;
         color: #c66;
     }
     
     .spinner {
         display: inline-block;
         width: 16px;
         height: 16px;
         border: 2px solid #f3f3f3;
         border-top: 2px solid #3498db;
         border-radius: 50%;
         animation: spin 1s linear infinite;
     }
 `;

// error styles
const styleSheet = document.createElement('style');
styleSheet.textContent = errorStyles;
document.head.appendChild(styleSheet);

document.addEventListener('DOMContentLoaded', initApp);

console.log('js file loaded successfully!');
