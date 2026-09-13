/**
 * QA Submission - Client Application
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('submissionForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const alertBanner = document.getElementById('alertBanner');

  const usernameInput = document.getElementById('username');
  const discordIdInput = document.getElementById('discord_id');
  const pointsInput = document.getElementById('points');
  const descriptionTextarea = document.getElementById('description');
  const proofUrlInput = document.getElementById('proof_url');

  function showAlert(type, message) {
    alertBanner.className = `alert-banner ${type}`;
    alertBanner.textContent = message;
    alertBanner.style.display = 'block';
  }

  function hideAlert() {
    alertBanner.style.display = 'none';
    alertBanner.textContent = '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert();

    // Reset validation states
    form.querySelectorAll('.form-input, .form-textarea').forEach(el => el.classList.remove('is-invalid'));

    const username = usernameInput.value.trim();
    const discord_id = discordIdInput.value.trim();
    const points = parseInt(pointsInput.value, 10);
    const description = descriptionTextarea.value.trim();
    const proof_url = proofUrlInput.value.trim();

    // Client-side validation
    let hasError = false;
    const errors = [];

    if (!username) {
      usernameInput.classList.add('is-invalid');
      errors.push('Discord username is required.');
      hasError = true;
    }

    if (!discord_id || !/^\d{17,20}$/.test(discord_id)) {
      discordIdInput.classList.add('is-invalid');
      errors.push('Discord User ID must be a 17-20 digit number.');
      hasError = true;
    }

    if (!points || isNaN(points) || points < 1 || points > 1000) {
      pointsInput.classList.add('is-invalid');
      errors.push('Points must be between 1 and 1000.');
      hasError = true;
    }

    if (!description || description.length < 5) {
      descriptionTextarea.classList.add('is-invalid');
      errors.push('Report details are required (minimum 5 characters).');
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
        errors.push('Proof link must be a valid HTTP or HTTPS URL.');
        hasError = true;
      }
    }

    if (hasError) {
      showAlert('error', errors.join('\n'));
      return;
    }

    // Set loading state
    submitBtn.disabled = true;
    btnText.textContent = 'Submitting...';

    try {
      const response = await fetch('/api/request-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username,
          discord_id,
          points,
          description,
          proof_url: proof_url || null
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showAlert('success', 'Submitted successfully.');
        form.reset();
        pointsInput.value = '10';
      } else {
        const errorMsg = result.message || result.error || 'Failed to submit. Please check your inputs.';
        showAlert('error', errorMsg);
      }
    } catch (networkError) {
      showAlert('error', 'Network error. Please check your connection and try again.');
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Submit';
    }
  });
});
