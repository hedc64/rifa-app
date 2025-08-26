//public/js/admin.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const adminPanel = document.getElementById('admin-panel');
    const login = document.getElementById('login');
    const validateForm = document.getElementById('validate-form');
    const winnerForm = document.getElementById('winner-form');
    const configureSorteoForm = document.getElementById('configure-sorteo-form');
    const numbersList = document.getElementById('numbers-list');
    const winnerInfo = document.getElementById('winner-info');
    const resetButton = document.getElementById('reset-raffle');
    const validateSelectedButton = document.getElementById('validate-selected');
    const pendingNumbersList = document.getElementById('pending-numbers-list');
    
    let token = localStorage.getItem('adminToken');
    if (token) loadAdminPanel();
    
    // Función para formatear fecha sin problemas de huso horario
    function formatDate(dateString) {
        if (!dateString) return 'No especificada';
        
        // Si la fecha está en formato YYYY-MM-DD, la dividimos
        if (dateString.includes('-')) {
            const [year, month, day] = dateString.split('-');
            const date = new Date(year, month - 1, day);
            return date.toLocaleDateString('es-ES', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Si no, formateamos normalmente
        return new Date(dateString).toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Función para hacer peticiones con autenticación
    function fetchWithAuth(url, options = {}) {
        const currentToken = localStorage.getItem('adminToken');
        console.log('Token enviado:', currentToken);
    
        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentToken}`,
            ...options.headers
        };
    
        return fetch(url, {
           ...options,
            headers
        });
    }
    
    login.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        fetch('/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Credenciales inválidas');
            }
            return response.json();
        })
        .then(data => {
            if (data.token) {
                localStorage.setItem('adminToken', data.token);
                token = data.token;
                loadAdminPanel();
            } else {
                alert('Error al iniciar sesión');
            }
        })
        .catch(error => {
            console.error('Error de login:', error);
            alert(error.message || 'Credenciales inválidas');
        });
    });
    
    function checkTokenExpiry() {
        const currentToken = localStorage.getItem('adminToken');
        if (!currentToken) return false;
    
        try {
            const payload = JSON.parse(atob(currentToken.split('.')[1]));
            const expiryTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeUntilExpiry = expiryTime - currentTime;
        
            if (timeUntilExpiry < 600000) {
                alert('Tu sesión está por expirar. Por favor, vuelve a iniciar sesión.');
                localStorage.removeItem('adminToken');
                return false;
            }
            return true;
        } catch (e) {
            console.error('Error al verificar token:', e);
            localStorage.removeItem('adminToken');
            return false;
        }
    }
    
    // Función para cargar la fecha actual del sorteo
    function loadCurrentSorteoDate() {
        fetch('/api/sorteo-date')
            .then(response => response.json())
            .then(data => {
                const currentDateElement = document.getElementById('current-date');
                if (data.date) {
                    currentDateElement.textContent = formatDate(data.date);
                } else {
                    currentDateElement.textContent = 'No configurada';
                }
            })
            .catch(error => {
                console.error('Error al cargar fecha del sorteo:', error);
            });
    }
    
    function loadAdminPanel() {
        if (!checkTokenExpiry()) {
            loginForm.style.display = 'block';
            adminPanel.style.display = 'none';
            return;
        }
    
        loginForm.style.display = 'none';
        adminPanel.style.display = 'block';
        
        // Cargar fecha actual del sorteo
        loadCurrentSorteoDate();
        
        fetchWithAuth('/admin/numbers')
        .then(response => {
            if (response.status === 401) throw new Error('Token inválido');
            if (!response.ok) throw new Error('Error en la petición');
            return response.json();
        })
        .then(numbers => {
            numbersList.innerHTML = '';
            pendingNumbersList.innerHTML = '';
            
            const pendingNumbers = [];
            
            numbers.forEach(num => {
                // Mostrar en la grilla general
                const div = document.createElement('div');
                div.className = `number ${num.status}`;
                div.textContent = num.number;
                
                // Agregar información adicional en tooltip
                let info = `Número: ${num.number}\nEstado: ${num.status}`;
                if (num.buyer_name) info += `\nComprador: ${num.buyer_name}`;
                if (num.winner_name) info += `\nGanador: ${num.winner_name}`;
                div.title = info;
                
                // Agregar evento para ver detalles
                div.addEventListener('click', () => {
                    alert(`Detalles del número ${num.number}:\n` +
                          `Estado: ${num.status}\n` +
                          (num.buyer_name ? `Comprador: ${num.buyer_name}\n` : '') +
                          (num.buyer_phone ? `Teléfono: ${num.buyer_phone}\n` : '') +
                          (num.winner_name ? `Ganador: ${num.winner_name}\n` : '') +
                          (num.draw_date ? `Fecha sorteo: ${formatDate(num.draw_date)}` : ''));
                });
                
                numbersList.appendChild(div);
                
                // Mostrar números pendientes de validación
                if (num.status === 'seleccionado') {
                    pendingNumbers.push(num);
                    
                    const pendingDiv = document.createElement('div');
                    pendingDiv.className = 'pending-number';
                    
                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.value = num.number;
                    checkbox.id = `pending-${num.number}`;
                    
                    const label = document.createElement('label');
                    label.htmlFor = `pending-${num.number}`;
                    label.textContent = num.number;
                    
                    pendingDiv.appendChild(checkbox);
                    pendingDiv.appendChild(label);
                    pendingNumbersList.appendChild(pendingDiv);
                }
            });
            
            // Mostrar u ocultar sección de validación múltiple
            document.getElementById('pending-payments').style.display = 
                pendingNumbers.length > 0 ? 'block' : 'none';
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Sesión expirada. Por favor, vuelve a iniciar sesión.');
            localStorage.removeItem('adminToken');
            loginForm.style.display = 'block';
            adminPanel.style.display = 'none';
        });
    }
    
    // Configurar fecha del sorteo
    configureSorteoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sorteoDate = document.getElementById('sorteo-date').value;
        
        fetchWithAuth('/admin/configure-sorteo', {
            method: 'POST',
            body: JSON.stringify({ sorteoDate })
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al configurar fecha del sorteo');
            return response.json();
        })
        .then(data => {
            alert(data.message || data.error);
            loadCurrentSorteoDate(); // Actualizar la fecha mostrada
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Error al configurar fecha del sorteo');
        });
    });
    
    validateForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            number: document.getElementById('validate-number').value,
            buyer_name: document.getElementById('validate-name').value,
            buyer_phone: document.getElementById('validate-phone').value,
            buyer_id: document.getElementById('validate-id').value,
            buyer_address: document.getElementById('validate-address').value
        };
        
        fetchWithAuth('/admin/validate', {
            method: 'POST',
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al validar el pago');
            return response.json();
        })
        .then(data => {
            alert(data.message || data.error);
            loadAdminPanel(); // Recargar datos después de validar
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Error al validar el pago');
        });
    });
    
    winnerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = {
            number: document.getElementById('winner-number').value,
            winner_name: document.getElementById('winner-name').value,
            draw_date: document.getElementById('winner-date').value
        };
        
        fetchWithAuth('/admin/winner', {
            method: 'POST',
            body: JSON.stringify(data)
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al declarar ganador');
            return response.json();
        })
        .then(data => {
            if (data.winner) {
                winnerInfo.innerHTML = `
                    <h3>Ganador</h3>
                    <p><strong>Número:</strong> ${data.winner.number}</p>
                    <p><strong>Nombre:</strong> ${data.winner.winner_name}</p>
                    <p><strong>Fecha del sorteo:</strong> ${formatDate(data.winner.draw_date)}</p>
                    <p><strong>Comprador:</strong> ${data.winner.buyer_name}</p>
                    <p><strong>Teléfono:</strong> ${data.winner.buyer_phone}</p>
                `;
            }
            alert(data.message || data.error);
            loadAdminPanel(); // Recargar datos después de declarar
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Error al declarar ganador');
        });
    });
    
    // Función para validar múltiples números
    function validateMultipleNumbers(numbers, buyerName, buyerPhone, buyerId, buyerAddress) {
        fetchWithAuth('/admin/validate-multiple', {
            method: 'POST',
            body: JSON.stringify({
                numbers,
                buyer_name: buyerName,
                buyer_phone: buyerPhone,
                buyer_id: buyerId,
                buyer_address: buyerAddress
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Error al validar los pagos');
            return response.json();
        })
        .then(data => {
            alert(data.message || data.error);
            loadAdminPanel(); // Recargar datos después de validar
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message || 'Error al validar los pagos');
        });
    }
    
    // Evento para validar seleccionados
    if (validateSelectedButton) {
        validateSelectedButton.addEventListener('click', () => {
            const checkboxes = pendingNumbersList.querySelectorAll('input[type="checkbox"]:checked');
            if (checkboxes.length === 0) {
                alert('Debe seleccionar al menos un número para validar');
                return;
            }
            
            const numbers = Array.from(checkboxes).map(cb => cb.value);
            const buyerName = prompt('Nombre completo:');
            const buyerPhone = prompt('Teléfono:');
            const buyerId = prompt('Cédula:');
            const buyerAddress = prompt('Dirección (opcional):');
            
            if (!buyerName || !buyerPhone || !buyerId) {
                alert('Debe ingresar nombre, teléfono y cédula');
                return;
            }
            
            // Validar todos los números seleccionados
            validateMultipleNumbers(numbers, buyerName, buyerPhone, buyerId, buyerAddress);
        });
    }
    
    // Funcionalidad para resetear la rifa
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('¿Estás seguro de resetear la rifa? Esto eliminará todos los datos actuales.')) {
                fetchWithAuth('/admin/reset', {
                    method: 'POST'
                })
                .then(response => {
                    if (!response.ok) throw new Error('Error al resetear la rifa');
                    return response.json();
                })
                .then(data => {
                    alert(data.message || data.error);
                    loadAdminPanel();
                    loadCurrentSorteoDate(); // Actualizar la fecha mostrada
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert(error.message || 'Error al resetear la rifa');
                });
            }
        });
    }
});