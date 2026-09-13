/**
 * QA Tester Portal - Client Application
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const form = document.getElementById('pointsRequestForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnSpinner = document.getElementById('btnSpinner');
  const btnLabel = document.getElementById('btnLabel');
  const feedbackAlert = document.getElementById('feedbackAlert');
  const alertIcon = document.getElementById('alertIcon');
  const alertTitle = document.getElementById('alertTitle');
  const alertMessage = document.getElementById('alertMessage');
  const alertDismiss = document.getElementById('alertDismiss');

  const usernameInput = document.getElementById('username');
  const discordIdInput = document.getElementById('discord_id');
  const workTypeSelect = document.getElementById('work_type');
  const pointsInput = document.getElementById('points');
  const descriptionTextarea = document.getElementById('description');
  const proofUrlInput = document.getElementById('proof_url');
  const descCharCount = document.getElementById('descCharCount');

  const systemStatusBadge = document.getElementById('systemStatusBadge');
  const statusText = document.getElementById('statusText');

  const helpDiscordIdBtn = document.getElementById('helpDiscordIdBtn');
  const discordIdHelperContent = document.getElementById('discordIdHelperContent');

  const presetBtns = document.querySelectorAll('.preset-btn');
  const refreshFeedBtn = document.getElementById('refreshFeedBtn');
  const requestsTableBody = document.getElementById('requestsTableBody');

  // Helper: Sanitize / Escape HTML to prevent XSS
  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // 1. System Health Check
  async function checkHealth() {
    try {
      const response = await fetch('/health');
      if (response.ok) {
        const data = await response.json();
        systemStatusBadge.classList.remove('offline');
        systemStatusBadge.classList.add('online');
        statusText.textContent = `Система активна • v1.0.0`;
      } else {
        throw new Error('Health status degraded');
      }
    } catch (err) {
      systemStatusBadge.classList.remove('online');
      systemStatusBadge.classList.add('offline');
      statusText.textContent = 'Оффлайн / Нет связи';
    }
  }

  // 2. Alert Box Display Helpers
  function showAlert(type, title, message) {
    feedbackAlert.className = `alert-box ${type}`;
    alertIcon.textContent = type === 'success' ? '✓' : '⚠';
    alertTitle.textContent = title;
    alertMessage.textContent = message;
    feedbackAlert.style.display = 'flex';

    // Auto-scroll to alert
    feedbackAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    feedbackAlert.style.display = 'none';
  }

  if (alertDismiss) {
    alertDismiss.addEventListener('click', hideAlert);
  }

  // 3. Auto-resize Textarea & Char Counter
  function updateTextareaHeight() {
    descriptionTextarea.style.height = 'auto';
    descriptionTextarea.style.height = `${Math.max(110, descriptionTextarea.scrollHeight)}px`;
    const length = descriptionTextarea.value.length;
    descCharCount.textContent = `${length} ${length === 1 ? 'символ' : 'символов'}`;
  }

  descriptionTextarea.addEventListener('input', updateTextareaHeight);

  // 4. Quick PTS Presets
  presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const pts = btn.getAttribute('data-pts');
      pointsInput.value = pts;
      pointsInput.classList.remove('is-invalid');
    });
  });

  // 5. Toggle Discord ID Help
  if (helpDiscordIdBtn && discordIdHelperContent) {
    helpDiscordIdBtn.addEventListener('click', () => {
      const isHidden = discordIdHelperContent.style.display === 'none';
      discordIdHelperContent.style.display = isHidden ? 'block' : 'none';
      helpDiscordIdBtn.textContent = isHidden ? 'Скрыть подсказку' : 'Как скопировать ID?';
    });
  }

  // 6. Recent Requests Stream & Monitoring
  async function loadRecentRequests() {
    if (!requestsTableBody) return;
    refreshFeedBtn.classList.add('spinning');

    try {
      const response = await fetch('/api/requests?limit=15');
      if (!response.ok) throw new Error('Не удалось получить список заявок');
      const json = await response.json();
      const requests = json.data || [];

      if (requests.length === 0) {
        requestsTableBody.innerHTML = `
          <tr>
            <td colspan="6" class="table-empty-cell">Пока нет зарегистрированных заявок. Будьте первыми!</td>
          </tr>
        `;
        return;
      }

      requestsTableBody.innerHTML = requests.map(req => {
        const statusClass = (req.status || 'PENDING').toLowerCase();
        const statusRussian = {
          'PENDING': 'На проверке',
          'APPROVED': 'Одобрено',
          'REJECTED': 'Отклонено'
        }[req.status] || req.status;

        // Formatted timestamp
        let formattedDate = '—';
        if (req.created_at) {
          const d = new Date(req.created_at.replace(' ', 'T') + 'Z');
          formattedDate = isNaN(d.getTime()) 
            ? req.created_at 
            : d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        return `
          <tr>
            <td><strong>#${escapeHtml(String(req.id))}</strong></td>
            <td>
              <div class="tester-cell">
                <span class="tester-name">${escapeHtml(req.username)}</span>
                <span class="tester-id">${escapeHtml(req.discord_id)}</span>
              </div>
            </td>
            <td>${escapeHtml(req.work_type)}</td>
            <td><span class="pts-badge">+${escapeHtml(String(req.points))} PTS</span></td>
            <td><span class="status-badge ${statusClass}">${escapeHtml(statusRussian)}</span></td>
            <td class="date-cell">${escapeHtml(formattedDate)}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      requestsTableBody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty-cell" style="color: var(--error);">
            Ошибка загрузки журнала: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    } finally {
      setTimeout(() => {
        refreshFeedBtn.classList.remove('spinning');
      }, 350);
    }
  }

  if (refreshFeedBtn) {
    refreshFeedBtn.addEventListener('click', loadRecentRequests);
  }

  // 7. Form Submission Handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    // Reset previous validation styles
    form.querySelectorAll('.form-control').forEach(el => el.classList.remove('is-invalid'));

    // Extract values
    const username = usernameInput.value.trim();
    const discord_id = discordIdInput.value.trim();
    const work_type = workTypeSelect.value;
    const points = parseInt(pointsInput.value, 10);
    const description = descriptionTextarea.value.trim();
    const proof_url = proofUrlInput.value.trim();

    // Client-side validation
    let hasError = false;
    let clientErrors = [];

    if (!username) {
      usernameInput.classList.add('is-invalid');
      clientErrors.push('Укажите имя пользователя в Discord.');
      hasError = true;
    }

    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      discordIdInput.classList.add('is-invalid');
      clientErrors.push('Discord ID должен состоять из 17–20 цифр.');
      hasError = true;
    }

    if (!work_type) {
      workTypeSelect.classList.add('is-invalid');
      clientErrors.push('Выберите категорию активности.');
      hasError = true;
    }

    if (!points || isNaN(points) || points <= 0 || points > 1000) {
      pointsInput.classList.add('is-invalid');
      clientErrors.push('Количество PTS должно быть от 1 до 1000.');
      hasError = true;
    }

    if (!description || description.length < 5) {
      descriptionTextarea.classList.add('is-invalid');
      clientErrors.push('Опишите проделанную работу (минимум 5 символов).');
      hasError = true;
    }

    if (proof_url) {
      try {
        const parsed = new URL(proof_url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error();
        }
      } catch {
        proofUrlInput.classList.add('is-invalid');
        clientErrors.push('Ссылка на материалы должна быть валидным HTTP/HTTPS адресом.');
        hasError = true;
      }
    }

    if (hasError) {
      showAlert('error', 'Пожалуйста, исправьте ошибки заполнения', clientErrors.join('\n'));
      return;
    }

    // Set Loading State
    submitBtn.disabled = true;
    btnSpinner.style.display = 'inline-block';
    btnLabel.style.display = 'none';

    try {
      const response = await fetch('/api/request-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          discord_id,
          work_type,
          points,
          description,
          proof_url: proof_url || null
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Success: Show confirmation, clear fields, update feed
        showAlert(
          'success',
          `Заявка #${result.id} успешно зарегистрирована!`,
          `Ваша заявка на ${points} PTS отправлена на проверку лидам. Уведомление доставлено в Discord.`
        );

        // Reset inputs
        form.reset();
        pointsInput.value = '10';
        updateTextareaHeight();

        // Refresh feed to show new entry immediately
        loadRecentRequests();
      } else {
        // Server rejected with validation error
        const errorMessage = result.message || result.error || (result.errors && result.errors.join('\n')) || 'Не удалось отправить заявку.';
        showAlert('error', 'Ошибка при обработке заявки сервером', errorMessage);
      }
    } catch (networkError) {
      showAlert('error', 'Ошибка соединения', 'Не удалось связаться с сервером. Проверьте подключение к сети.');
    } finally {
      // Restore Button State
      submitBtn.disabled = false;
      btnSpinner.style.display = 'none';
      btnLabel.style.display = 'flex';
    }
  });

  // Initial loads
  checkHealth();
  loadRecentRequests();
  updateTextareaHeight();
});
