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

  function formatDate(dateString) {
    if (!dateString) return 'No especificada';
    const [year, month, day] = dateString.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function fetchWithAuth(url, options = {}) {
    const currentToken = localStorage.getItem('adminToken');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${currentToken}`,
      ...options.headers
    };
    return fetch(url, { ...options, headers });
  }

  login.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();

    if (!username || !password) {
      alert('Debe ingresar usuario y contraseña');
      return;
    }

    fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.ok ? res.json() : Promise.reject('Credenciales inválidas'))
      .then(data => {
        if (data.token) {
          localStorage.setItem('adminToken', data.token);
          token = data.token;
          loadAdminPanel();
        } else {
          alert('Error al iniciar sesión');
        }
      })
      .catch(err => {
        console.error('Error de login:', err);
        alert(err || 'Credenciales inválidas');
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

  function loadCurrentSorteoDate() {
    fetch('/api/sorteo-date')
      .then(res => res.ok ? res.json() : Promise.reject('Error al obtener fecha del sorteo'))
      .then(data => {
        const currentDateElement = document.getElementById('current-date');
        currentDateElement.textContent = data.date ? formatDate(data.date) : 'No configurada';
      })
      .catch(err => console.error('Error al cargar fecha del sorteo:', err));
  }

  function loadAdminPanel() {
    if (!checkTokenExpiry()) {
      loginForm.style.display = 'block';
      adminPanel.style.display = 'none';
      return;
    }

    loginForm.style.display = 'none';
    adminPanel.style.display = 'block';
    loadCurrentSorteoDate();

    fetchWithAuth('/admin/numbers')
      .then(res => res.ok ? res.json() : Promise.reject('Token inválido o error en la petición'))
      .then(numbers => {
        numbersList.innerHTML = '';
        pendingNumbersList.innerHTML = '';
        const pendingNumbers = [];

        numbers.forEach(num => {
          const div = document.createElement('div');
          div.className = `number ${num.status}`;
          div.textContent = num.number;

          let info = `Número: ${num.number}\nEstado: ${num.status}`;
          if (num.buyer_name) info += `\nComprador: ${num.buyer_name}`;
          if (num.buyer_id) info += `\nID: ${num.buyer_id}`;
          if (num.winner_name) info += `\nGanador: ${num.winner_name}`;
          div.title = info;

          div.addEventListener('click', () => {
            alert(`Detalles del número ${num.number}:\n` +
              `Estado: ${num.status}\n` +
              (num.buyer_name ? `Comprador: ${num.buyer_name}\n` : '') +
              (num.buyer_phone ? `Teléfono: ${num.buyer_phone}\n` : '') +
              (num.buyer_id ? `ID: ${num.buyer_id}\n` : '') +
              (num.winner_name ? `Ganador: ${num.winner_name}\n` : '') +
              (num.draw_date ? `Fecha sorteo: ${formatDate(num.draw_date)}` : ''));
          });

          numbersList.appendChild(div);

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
            label.innerHTML = `
              <span class="number-display">${num.number}</span>
              ${num.buyer_id ? `<span class="buyer-id">ID: ${num.buyer_id}</span>` : ''}
            `;

            pendingDiv.appendChild(checkbox);
            pendingDiv.appendChild(label);
            pendingNumbersList.appendChild(pendingDiv);
          }
        });

        document.getElementById('pending-payments').style.display =
          pendingNumbers.length > 0 ? 'block' : 'none';
      })
      .catch(err => {
        console.error('Error al cargar panel:', err);
        alert('Sesión expirada. Por favor, vuelve a iniciar sesión.');
        localStorage.removeItem('adminToken');
        loginForm.style.display = 'block';
        adminPanel.style.display = 'none';
      });
  }
});
// 📅 Configurar fecha del sorteo
configureSorteoForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const sorteoDate = document.getElementById('sorteo-date').value.trim();

  if (!sorteoDate) {
    alert('Debe ingresar una fecha válida');
    return;
  }

  fetchWithAuth('/admin/configure-sorteo', {
    method: 'POST',
    body: JSON.stringify({ sorteoDate })
  })
    .then(res => res.ok ? res.json() : Promise.reject('Error al configurar fecha del sorteo'))
    .then(data => {
      alert(data.message || data.error);
      loadCurrentSorteoDate();
    })
    .catch(err => {
      console.error('Error al configurar fecha del sorteo:', err);
      alert(err || 'Error al configurar fecha del sorteo');
    });
});

// ✅ Validar pago individual
validateForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    number: document.getElementById('validate-number').value.trim(),
    buyer_name: document.getElementById('validate-name').value.trim(),
    buyer_phone: document.getElementById('validate-phone').value.trim(),
    buyer_id: document.getElementById('validate-id').value.trim(),
    buyer_address: document.getElementById('validate-address').value.trim()
  };

  if (!data.number || !data.buyer_name || !data.buyer_phone || !data.buyer_id) {
    alert('Debe completar todos los campos obligatorios');
    return;
  }

  fetchWithAuth('/admin/validate', {
    method: 'POST',
    body: JSON.stringify(data)
  })
    .then(res => res.ok ? res.json() : Promise.reject('Error al validar el pago'))
    .then(data => {
      alert(data.message || data.error);
      loadAdminPanel();
    })
    .catch(err => {
      console.error('Error al validar el pago:', err);
      alert(err || 'Error al validar el pago');
    });
});

// 🏆 Declarar ganador
winnerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = {
    number: document.getElementById('winner-number').value.trim(),
    winner_name: document.getElementById('winner-name').value.trim(),
    draw_date: document.getElementById('winner-date').value.trim()
  };

  if (!data.number || !data.winner_name || !data.draw_date) {
    alert('Debe completar todos los campos para declarar ganador');
    return;
  }

  fetchWithAuth('/admin/winner', {
    method: 'POST',
    body: JSON.stringify(data)
  })
    .then(res => res.ok ? res.json() : Promise.reject('Error al declarar ganador'))
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
      loadAdminPanel();
    })
    .catch(err => {
      console.error('Error al declarar ganador:', err);
      alert(err || 'Error al declarar ganador');
    });
});

// ✅ Validar múltiples números
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
    .then(res => res.ok ? res.json() : Promise.reject('Error al validar los pagos'))
    .then(data => {
      alert(data.message || data.error);
      loadAdminPanel();
    })
    .catch(err => {
      console.error('Error al validar los pagos:', err);
      alert(err || 'Error al validar los pagos');
    });
}

// 📤 Evento para validar seleccionados
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

    validateMultipleNumbers(numbers, buyerName, buyerPhone, buyerId, buyerAddress);
  });
}

// 🔄 Resetear rifa
if (resetButton) {
  resetButton.addEventListener('click', () => {
    if (confirm('¿Estás seguro de resetear la rifa? Esto eliminará todos los datos actuales.')) {
      fetchWithAuth('/admin/reset', {
        method: 'POST'
      })
        .then(res => res.ok ? res.json() : Promise.reject('Error al resetear la rifa'))
        .then(data => {
          alert(data.message || data.error);
          loadAdminPanel();
          loadCurrentSorteoDate();
        })
        .catch(err => {
          console.error('Error al resetear la rifa:', err);
          alert(err || 'Error al resetear la rifa');
        });
    }
  });
}