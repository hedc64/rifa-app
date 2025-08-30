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

  // 📅 Cargar fecha del sorteo
  function loadSorteoDate() {
    fetch('/api/sorteo-date')
      .then(res => res.json())
      .then(data => {
        const fallback = 'Próximamente';
        if (data.date) {
          const [year, month, day] = data.date.split('-');
          const date = new Date(year, month - 1, day);
          const formatted = date.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });

          sorteoDateElement.textContent = `Sorteo: ${formatted} (Últimas dos cifras del sorteo Astro Luna)`;
          confirmationDateElement.textContent = formatted;
          paymentDateElement.textContent = formatted;
        } else {
          sorteoDateElement.textContent = `Sorteo: ${fallback} (Últimas dos cifras del sorteo Astro Luna)`;
          confirmationDateElement.textContent = fallback;
          paymentDateElement.textContent = fallback;
        }
      })
      .catch(err => {
        console.error('Error al cargar fecha del sorteo:', err);
        sorteoDateElement.textContent = 'Sorteo: Próximamente (Últimas dos cifras del sorteo Astro Luna)';
        confirmationDateElement.textContent = 'Próximamente';
        paymentDateElement.textContent = 'Próximamente';
      });
  }

  // 🏆 Verificar si hay ganador
  function checkWinner() {
    fetch('/api/has-winner')
      .then(res => res.ok ? res.json() : Promise.reject('Error al verificar ganador'))
      .then(data => {
        if (data.hasWinner) {
          const winnerMessage = document.createElement('div');
          winnerMessage.className = 'winner-message';
          winnerMessage.innerHTML = '<h2>¡Sorteo Finalizado!</h2><p>Ya se ha declarado un ganador para este sorteo.</p>';

          grid.style.pointerEvents = 'none';
          grid.style.opacity = '0.7';
          grid.parentNode.insertBefore(winnerMessage, grid);
          selectionInfo.style.display = 'none';
        }
      })
      .catch(err => console.error(err));
  }

  // 🔢 Cargar números
  function loadNumbers() {
    fetch('/api/numbers')
      .then(res => res.ok ? res.json() : Promise.reject('Error al obtener números'))
      .then(numbers => {
        grid.innerHTML = '';
        numbers.forEach(num => {
          const div = document.createElement('div');
          div.className = `number ${num.status}`;
          div.textContent = num.number;
          div.dataset.number = num.number;

          if (num.status === 'disponible') {
            div.addEventListener('click', selectNumber);
          }

          grid.appendChild(div);
        });
      })
      .catch(err => console.error(err));
  }

  // 🔁 Inicialización
  loadNumbers();
  loadSorteoDate();
  checkWinner();

  // 🖱️ Seleccionar número
  function selectNumber(e) {
    const number = e.target.dataset.number;
    const index = selectedNumbers.indexOf(number);

    if (index !== -1) {
      selectedNumbers.splice(index, 1);
      e.target.classList.remove('seleccionado');
      e.target.classList.add('disponible');
    } else {
      selectedNumbers.push(number);
      e.target.classList.remove('disponible');
      e.target.classList.add('seleccionado');
    }

    updateSelectionInfo();
  }

  // 📋 Actualizar panel de selección
  function updateSelectionInfo() {
    if (selectedNumbers.length > 0) {
      selectionInfo.style.display = 'block';
      selectedList.innerHTML = '';
      selectedNumbers.forEach(num => {
        const li = document.createElement('li');
        li.textContent = num;
        selectedList.appendChild(li);
      });
      confirmation.style.display = 'block';
      paymentInfo.style.display = 'none';
    } else {
      selectionInfo.style.display = 'none';
    }
  }

  // ✅ Activar botón según términos
  acceptTermsCheckbox.addEventListener('change', () => {
    confirmButton.disabled = !acceptTermsCheckbox.checked;
  });

  // 📤 Confirmar selección
  confirmButton.addEventListener('click', () => {
    if (!acceptTermsCheckbox.checked) {
      alert('Debes aceptar los términos y condiciones para continuar');
      return;
    }

    const buyerName = prompt('Nombre completo:');
    const buyerPhone = prompt('Teléfono:');
    const buyerId = prompt('Cédula:');

    if (!buyerName || !buyerPhone || !buyerId) {
      alert('Debe ingresar todos los datos');
      return;
    }

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
      .then(res => res.ok ? res.json() : Promise.reject('Error al seleccionar números'))
      .then(data => {
        if (data.message) {
          alert(data.message);
          confirmation.style.display = 'none';
          paymentInfo.style.display = 'block';

          //const message = `Hola, deseo comprar los números: ${selectedNumbers.join(', ')}. Mis datos son: ${buyerName}, ${buyerPhone}, ${buyerId}. Realizaré pago por Nequi y adjuntaré comprobante.`;
          //whatsappLink.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

          const total = selectedNumbers.length * 2000;
          const mensaje = `Hola, quiero pagar $${total} COP por ${selectedNumbers.length} números. Mis datos son: ${buyerName}, ${buyerPhone}, ${buyerId}. Hare el pago por Nequi y adjuntaré el comprobante.`;
          whatsappLink.href = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(mensaje)}`;
          //window.location.href = whatsappLink;
          
          selectedNumbers = [];
          acceptTermsCheckbox.checked = false;
          confirmButton.disabled = true;
          loadNumbers();
        } else {
          alert(data.error || 'Error al seleccionar números');
        }
      })
      .catch(err => {
        console.error('Error al enviar selección:', err);
        alert('Error al seleccionar números');
      });
  });
});