//public/js/main.js
document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('numbers-grid');
    const selectionInfo = document.getElementById('selection-info');
    const selectedList = document.getElementById('selected-list');
    const confirmation = document.getElementById('confirmation');
    const paymentInfo = document.getElementById('payment-info');
    const confirmButton = document.getElementById('confirm-selection');
    const acceptTermsCheckbox = document.getElementById('accept-terms');
    const whatsappLink = document.getElementById('whatsapp-link');
    const sorteoDateElement = document.getElementById('sorteo-date');
    const confirmationDateElement = document.getElementById('confirmation-date');
    const paymentDateElement = document.getElementById('payment-date');
    
    let selectedNumbers = [];
    const phoneNumber = '573114521045'; // Reemplazar con número real

    // Función para cargar la fecha del sorteo
    function loadSorteoDate() {
        fetch('/api/sorteo-date')
            .then(response => response.json())
            .then(data => {
                if (data.date) {
                    // Crear fecha a partir del formato YYYY-MM-DD sin conversión de huso horario
                    const [year, month, day] = data.date.split('-');
                    const date = new Date(year, month - 1, day);
                    
                    const formattedDate = date.toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    
                    sorteoDateElement.textContent = `Sorteo: ${formattedDate} (Astro Luna)`;
                    confirmationDateElement.textContent = formattedDate;
                    paymentDateElement.textContent = formattedDate;
                } else {
                    sorteoDateElement.textContent = 'Sorteo: Próximamente (Astro Luna)';
                    confirmationDateElement.textContent = 'Próximamente';
                    paymentDateElement.textContent = 'Próximamente';
                }
            })
            .catch(error => {
                console.error('Error al cargar fecha del sorteo:', error);
                sorteoDateElement.textContent = 'Sorteo: Próximamente (Astro Luna)';
                confirmationDateElement.textContent = 'Próximamente';
                paymentDateElement.textContent = 'Próximamente';
            });
    }

    // Función para verificar si hay un ganador declarado
    function checkWinner() {
        fetch('/api/has-winner')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al verificar ganador');
                }
                return response.json();
            })
            .then(data => {
                if (data.hasWinner) {
                    // Mostrar mensaje de sorteo finalizado
                    const winnerMessage = document.createElement('div');
                    winnerMessage.className = 'winner-message';
                    winnerMessage.innerHTML = '<h2>¡Sorteo Finalizado!</h2><p>Ya se ha declarado un ganador para este sorteo.</p>';
                    
                    // Deshabilitar la selección de números
                    grid.style.pointerEvents = 'none';
                    grid.style.opacity = '0.7';
                    
                    // Insertar el mensaje antes de la grilla
                    grid.parentNode.insertBefore(winnerMessage, grid);
                    
                    // Ocultar la sección de selección
                    selectionInfo.style.display = 'none';
                }
            })
            .catch(error => {
                console.error('Error al verificar ganador:', error);
            });
    }

    // Cargar números
    function loadNumbers() {
        fetch('/api/numbers')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Error al obtener números');
                }
                return response.json();
            })
            .then(numbers => {
                grid.innerHTML = ''; // Limpiar la grilla antes de cargar
                numbers.forEach(num => {
                    const div = document.createElement('div');
                    div.className = `number ${num.status}`;
                    div.textContent = num.number;
                    div.dataset.number = num.number;
                    
                    // Solo permitir seleccionar si está disponible
                    if (num.status === 'disponible') {
                        div.addEventListener('click', selectNumber);
                    }
                    
                    grid.appendChild(div);
                });
            })
            .catch(error => {
                console.error('Error al cargar números:', error);
            });
    }

    // Cargar números, fecha del sorteo y verificar ganador al inicio
    loadNumbers();
    loadSorteoDate();
    checkWinner();

    function selectNumber(e) {
        const number = e.target.dataset.number;
        
        // Si el número ya está seleccionado, quitarlo
        if (selectedNumbers.includes(number)) {
            selectedNumbers = selectedNumbers.filter(n => n !== number);
            e.target.classList.remove('seleccionado');
            e.target.classList.add('disponible');
        } else {
            // Si no está seleccionado, agregarlo
            selectedNumbers.push(number);
            e.target.classList.remove('disponible');
            e.target.classList.add('seleccionado');
        }
        
        updateSelectionInfo();
    }

    function updateSelectionInfo() {
        if (selectedNumbers.length > 0) {
            selectionInfo.style.display = 'block';
            selectedList.innerHTML = '';
            
            selectedNumbers.forEach(num => {
                const li = document.createElement('li');
                li.textContent = num;
                selectedList.appendChild(li);
            });
            
            // Mostrar paso de confirmación
            confirmation.style.display = 'block';
            paymentInfo.style.display = 'none';
        } else {
            selectionInfo.style.display = 'none';
        }
    }

    // Habilitar/deshabilitar botón de confirmación según el checkbox
    acceptTermsCheckbox.addEventListener('change', function() {
        confirmButton.disabled = !this.checked;
    });

    // Al confirmar selección
    confirmButton.addEventListener('click', () => {
        // Verificar que se hayan aceptado los términos
        if (!acceptTermsCheckbox.checked) {
            alert('Debes aceptar los términos y condiciones para continuar');
            return;
        }
        
        // Pedir datos del comprador
        const buyerName = prompt('Nombre completo:');
        const buyerPhone = prompt('Teléfono:');
        const buyerId = prompt('Cédula:');
        
        if (!buyerName || !buyerPhone || !buyerId) {
            alert('Debe ingresar todos los datos');
            return;
        }
        
        // Enviar selección al servidor
        fetch('/api/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                numbers: selectedNumbers,
                buyerName,
                buyerPhone,
                buyerId
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error al seleccionar números');
            }
            return response.json();
        })
        .then(data => {
            if (data.message) {
                alert(data.message);
                // Mostrar información de pago
                confirmation.style.display = 'none';
                paymentInfo.style.display = 'block';
                
                // Generar enlace WhatsApp
                const message = `Hola, deseo comprar los números: ${selectedNumbers.join(', ')}. Mis datos son: ${buyerName}, ${buyerPhone}, ${buyerId}. Realizare pago por Nequi y Adjuntare comprobante de pago.`;
                whatsappLink.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
                
                // Limpiar selección
                selectedNumbers = [];
                acceptTermsCheckbox.checked = false;
                confirmButton.disabled = true;
                loadNumbers(); // Recargar la grilla para mostrar los números como seleccionados
            } else {
                alert(data.error || 'Error al seleccionar números');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al seleccionar números');
        });
    });
});