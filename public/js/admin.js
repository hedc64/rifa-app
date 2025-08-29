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

    fetch('/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
      .then(res => res.ok ? res.json() : Promise.reject('Credenciales inválidas'))
      .then(data => {
        localStorage.setItem('adminToken', data.token);
        token = data.token;
        loadAdminPanel();
      })
      .catch(err => {
        console.error('Error de login:', err);
        alert(err);
      });
  });

  function checkTokenExpiry() {
    const currentToken = localStorage.getItem('adminToken');
    if (!currentToken) return false;

    try {
      const payload = JSON.parse(atob(currentToken.split('.')[1]));
      const expiryTime = payload.exp * 1000;
      const currentTime = Date.now();
      return expiryTime - currentTime > 600000;
    } catch (e) {
      localStorage.removeItem('adminToken');
      return false;
    }
  }

  function loadCurrentSorteoDate() {
    fetch('/api/sorteo-date')
      .then(res => res.ok ? res.json() : Promise.reject('Error al obtener fecha'))
      .then(data => {
        const currentDateElement = document.getElementById('current-date');
        if (currentDateElement) {
          currentDateElement.textContent = data.date || 'No configurada';
        }
      })
      .catch(err => console.error('Error al cargar fecha:', err));
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
      .then(res => res.ok ? res.json() : Promise.reject('Error al cargar números'))
      .then(numbers => {
        numbersList.innerHTML = '';
        pendingNumbersList.innerHTML = '';
        const pendingNumbers = [];

        numbers.forEach(num => {
          const div = document.createElement('div');
          div.className = `number ${num.status}`;
          div.textContent = num.number;
          div.title = `Número: ${num.number}\nEstado: ${num.status}`;
          div.addEventListener('click', () => {
            alert(`Detalles del número ${num.number}:\nEstado: ${num.status}`);
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
            label.htmlFor = checkbox.id;
            label.innerHTML = `<span class="number-display">${num.number}</span>`;

            pendingDiv.appendChild(checkbox);
            pendingDiv.appendChild(label);
            pendingNumbersList.appendChild(pendingDiv);
          }
        });

        const pendingSection = document.getElementById('pending-payments');
        if (pendingSection) {
          pendingSection.style.display = pendingNumbers.length > 0 ? 'block' : 'none';
        }
      })
      .catch(err => {
        console.error('Error:', err);
        alert('Sesión expirada. Vuelve a iniciar sesión.');
        localStorage.removeItem('adminToken');
        loginForm.style.display = 'block';
        adminPanel.style.display = 'none';
      });
  }

  // 📅 Configurar fecha del sorteo
  if (configureSorteoForm) {
    configureSorteoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const sorteoDate = document.getElementById('sorteo-date').value;

      fetchWithAuth('/admin/configure-sorteo', {
        method: 'POST',
        body: JSON.stringify({ sorteoDate })
      })
        .then(res => res.ok ? res.json() : Promise.reject('Error al configurar fecha'))
        .then(data => {
          alert(data.message || data.error);
          loadCurrentSorteoDate();
        })
        .catch(err => {
          console.error('Error:', err);
          alert(err);
        });
    });
  }

  // ✅ Validación individual
  if (validateForm) {
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
        .then(res => res.ok ? res.json() : Promise.reject('Error al validar pago'))
        .then(data => {
          alert(data.message || data.error);
          loadAdminPanel();
        })
        .catch(err => {
          console.error('Error:', err);
          alert(err);
        });
    });
  }

  // 🏆 Declarar ganador
  if (winnerForm) {
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
        .then(res => res.ok ? res.json() : Promise.reject('Error al declarar ganador'))
        .then(data => {
          if (data.winner && winnerInfo) {
            winnerInfo.innerHTML = `
              <h3>Ganador</h3>
              <p><strong>Número:</strong> ${data.winner.number}</p>
              <p><strong>Nombre:</strong> ${data.winner.winner_name}</p>
              <p><strong>Fecha del sorteo:</strong> ${data.winner.draw_date}</p>
              <p><strong>Comprador:</strong> ${data.winner.buyer_name}</p>
              <p><strong>Teléfono:</strong> ${data.winner.buyer_phone}</p>
            `;
          }
          alert(data.message || data.error);
          loadAdminPanel();
        })
        .catch(err => {
          console.error('Error:', err);
          alert(err);
        });
    });
  }

  // ✅ Validar múltiples pagos
  if (validateSelectedButton) {
    validateSelectedButton.addEventListener('click', () => {
      const checkboxes = pendingNumbersList.querySelectorAll('input[type="checkbox"]:checked');
      if (checkboxes.length === 0) {
        alert('Debe seleccionar al menos un número');
        return;
      }

      const numbers = Array.from(checkboxes).map(cb => cb.value);
      const buyer_name = prompt('Nombre completo:');
      const buyer_phone = prompt('Teléfono:');
      const buyer_id = prompt('Cédula:');
      const buyer_address = prompt('Dirección (opcional):');

            if (!buyer_name || !buyer_phone || !buyer_id) {
        alert('Debe ingresar nombre, teléfono y cédula');
        return;
      }

      fetchWithAuth('/admin/validate-multiple', {
        method: 'POST',
        body: JSON.stringify({
          numbers,
          buyer_name,
          buyer_phone,
          buyer_id,
          buyer_address
        })
      })
        .then(res => res.ok ? res.json() : Promise.reject('Error al validar los pagos'))
        .then(data => {
          alert(data.message || data.error);
          loadAdminPanel(); // Recargar datos después de validar
        })
        .catch(err => {
          console.error('Error al validar múltiples pagos:', err);
          alert(err);
        });
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
            loadCurrentSorteoDate(); // Actualizar la fecha mostrada
          })
          .catch(err => {
            console.error('Error al resetear la rifa:', err);
            alert(err);
          });
      }
    });
  }
});