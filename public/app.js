/**
 * QA Tester Portal - Master Client Application
 */

document.addEventListener('DOMContentLoaded', () => {
  // Current user session state
  let currentUser = null;
  let activeTab = 'home';
  let selectedCoinSide = 'heads';

  // DOM Elements
  const navbar = document.getElementById('navbar');
  const navUserAvatar = document.getElementById('navUserAvatar');
  const navUsername = document.getElementById('navUsername');
  const navBalance = document.getElementById('navBalance');
  const navButtons = document.querySelectorAll('.nav-btn');

  const globalToast = document.getElementById('globalToast');

  // Views
  const views = {
    login: document.getElementById('viewLogin'),
    home: document.getElementById('viewHome'),
    submit: document.getElementById('viewSubmit'),
    shop: document.getElementById('viewShop'),
    casino: document.getElementById('viewCasino'),
    lootbox: document.getElementById('viewLootbox')
  };

  // Home Elements
  const homeUsername = document.getElementById('homeUsername');
  const homeBalance = document.getElementById('homeBalance');
  const quickCards = document.querySelectorAll('.quick-card');

  // Submit Form Elements
  const submissionForm = document.getElementById('submissionForm');
  const submitUsername = document.getElementById('submitUsername');
  const submitDiscordId = document.getElementById('submitDiscordId');
  const pointsInput = document.getElementById('points');
  const descriptionInput = document.getElementById('description');
  const proofUrlInput = document.getElementById('proof_url');
  const submitBtn = document.getElementById('submitBtn');
  const btnText = document.getElementById('btnText');
  const submitAlertBanner = document.getElementById('submitAlertBanner');

  // Casino Elements
  const coinGraphic = document.getElementById('coinGraphic');
  const coinFace = document.getElementById('coinFace');
  const coinOutcomeText = document.getElementById('coinOutcomeText');
  const sideButtons = document.querySelectorAll('.side-btn');
  const coinBetInput = document.getElementById('coinBetInput');
  const betPresets = document.querySelectorAll('.bet-preset');
  const btnMaxBet = document.getElementById('btnMaxBet');
  const btnFlipCoin = document.getElementById('btnFlipCoin');

  // Lootbox Elements
  const crateOpenButtons = document.querySelectorAll('.btn-open-crate');
  const lootResultCard = document.getElementById('lootResultCard');
  const lootRarityTag = document.getElementById('lootRarityTag');
  const lootItemTitle = document.getElementById('lootItemTitle');
  const lootPayoutText = document.getElementById('lootPayoutText');
  const lootMessageText = document.getElementById('lootMessageText');

  // Shop Elements
  const shopBuyButtons = document.querySelectorAll('.btn-buy');

  // ---------------- HELPER FUNCTIONS ----------------

  let toastTimer = null;
  function showToast(type, message) {
    if (toastTimer) clearTimeout(toastTimer);
    globalToast.className = `toast-banner ${type}`;
    globalToast.textContent = message;
    globalToast.style.display = 'block';

    toastTimer = setTimeout(() => {
      globalToast.style.display = 'none';
    }, 4500);
  }

  function updateUserData(user) {
    currentUser = user;
    if (!user) return;

    // Navbar
    navUsername.textContent = user.username;
    navBalance.textContent = user.balance_pts;
    navUserAvatar.src = user.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';

    // Home
    homeUsername.textContent = user.username;
    homeBalance.textContent = user.balance_pts;

    // Prefill & lock submit form fields
    submitUsername.value = user.username;
    submitDiscordId.value = user.discord_id;

    // Cap casino bet if needed
    if (coinBetInput && parseInt(coinBetInput.value, 10) > user.balance_pts) {
      coinBetInput.value = Math.max(1, user.balance_pts);
    }
  }

  function switchTab(tabName) {
    activeTab = tabName;

    // Update nav links
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Hide all views, display chosen view
    Object.keys(views).forEach(key => {
      if (key === 'login') return;
      if (views[key]) {
        views[key].style.display = (key === tabName) ? 'block' : 'none';
      }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------- AUTH INITIALIZATION ----------------

  async function checkAuth() {
    try {
      const res = await fetch('/api/me');
      const data = await res.json();

      if (data.authenticated && data.user) {
        // Authenticated! Show navbar and home tab
        navbar.style.display = 'block';
        views.login.style.display = 'none';
        updateUserData(data.user);
        switchTab('home');
      } else {
        // Unauthenticated -> Show Gatekeeper
        navbar.style.display = 'none';
        Object.keys(views).forEach(k => {
          if (views[k]) views[k].style.display = 'none';
        });
        views.login.style.display = 'block';
      }
    } catch (err) {
      console.error('Failed to query user profile:', err);
      navbar.style.display = 'none';
      views.login.style.display = 'block';
    }
  }

  // Tab button click listeners
  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab');
      switchTab(tab);
    });
  });

  // Quick jump cards on Home dashboard
  quickCards.forEach(card => {
    card.addEventListener('click', () => {
      const jump = card.getAttribute('data-jump');
      if (jump) switchTab(jump);
    });
  });

  // ---------------- QA SUBMISSION HANDLER ----------------

  submissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    submitAlertBanner.style.display = 'none';
    submitAlertBanner.textContent = '';

    const points = parseInt(pointsInput.value, 10);
    const description = descriptionInput.value.trim();
    const proof_url = proofUrlInput.value.trim();

    if (isNaN(points) || points < 1 || points > 1000) {
      submitAlertBanner.className = 'alert-banner error';
      submitAlertBanner.textContent = 'Points requested must be between 1 and 1000.';
      submitAlertBanner.style.display = 'block';
      return;
    }

    if (!description || description.length < 5) {
      submitAlertBanner.className = 'alert-banner error';
      submitAlertBanner.textContent = 'Report details are required (minimum 5 characters).';
      submitAlertBanner.style.display = 'block';
      return;
    }

    submitBtn.disabled = true;
    btnText.textContent = 'Submitting...';

    try {
      const res = await fetch('/api/request-points', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points, description, proof_url: proof_url || null })
      });

      const json = await res.json();

      if (res.ok && json.success) {
        submitAlertBanner.className = 'alert-banner success';
        submitAlertBanner.textContent = `Report #${json.id} submitted successfully! Awaiting review by leads.`;
        submitAlertBanner.style.display = 'block';
        showToast('success', `QA Report #${json.id} submitted successfully.`);

        // Reset form inputs (keep locked user credentials)
        pointsInput.value = '10';
        descriptionInput.value = '';
        proofUrlInput.value = '';
      } else {
        submitAlertBanner.className = 'alert-banner error';
        submitAlertBanner.textContent = json.message || json.error || 'Failed to submit report.';
        submitAlertBanner.style.display = 'block';
      }
    } catch (err) {
      submitAlertBanner.className = 'alert-banner error';
      submitAlertBanner.textContent = 'Network error while submitting report.';
      submitAlertBanner.style.display = 'block';
    } finally {
      submitBtn.disabled = false;
      btnText.textContent = 'Submit';
    }
  });

  // ---------------- SHOP ITEM PURCHASE ----------------

  shopBuyButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const itemId = btn.getAttribute('data-item-id');
      const price = parseInt(btn.getAttribute('data-price'), 10);

      if (currentUser && currentUser.balance_pts < price) {
        showToast('error', `Insufficient PTS balance (You need ${price} PTS, you have ${currentUser.balance_pts} PTS).`);
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Buying...';

      try {
        const res = await fetch('/api/shop/buy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId })
        });
        const json = await res.json();

        if (res.ok && json.success) {
          currentUser.balance_pts = json.newBalance;
          updateUserData(currentUser);
          showToast('success', json.message);
        } else {
          showToast('error', json.error || 'Failed to purchase item.');
        }
      } catch (err) {
        showToast('error', 'Network error during shop purchase.');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Purchase';
      }
    });
  });

  // ---------------- CASINO COINFLIP ----------------

  sideButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sideButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedCoinSide = btn.getAttribute('data-side');
    });
  });

  betPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      const add = parseInt(preset.getAttribute('data-bet'), 10);
      if (preset.id === 'btnMaxBet') {
        coinBetInput.value = currentUser ? Math.max(1, currentUser.balance_pts) : 10;
      } else {
        const cur = parseInt(coinBetInput.value, 10) || 0;
        coinBetInput.value = Math.max(1, cur + add);
      }
    });
  });

  if (btnMaxBet) {
    btnMaxBet.addEventListener('click', () => {
      coinBetInput.value = currentUser ? Math.max(1, currentUser.balance_pts) : 10;
    });
  }

  btnFlipCoin.addEventListener('click', async () => {
    const bet = parseInt(coinBetInput.value, 10);

    if (isNaN(bet) || bet <= 0) {
      showToast('error', 'Please enter a valid bet amount.');
      return;
    }

    if (currentUser && currentUser.balance_pts < bet) {
      showToast('error', `Insufficient PTS balance (You have ${currentUser.balance_pts} PTS).`);
      return;
    }

    btnFlipCoin.disabled = true;
    coinGraphic.classList.add('flipping');
    coinOutcomeText.textContent = 'Flipping coin...';

    try {
      const res = await fetch('/api/casino/coinflip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet, side: selectedCoinSide })
      });
      const json = await res.json();

      setTimeout(() => {
        coinGraphic.classList.remove('flipping');

        if (res.ok && json.success) {
          currentUser.balance_pts = json.newBalance;
          updateUserData(currentUser);

          coinFace.textContent = json.outcome === 'heads' ? '🦅' : '🪙';
          coinOutcomeText.textContent = `${json.outcome.toUpperCase()}! ${json.message}`;

          showToast(json.won ? 'success' : 'error', json.message);
        } else {
          coinOutcomeText.textContent = json.error || 'Failed to flip coin.';
          showToast('error', json.error || 'Coinflip failed.');
        }

        btnFlipCoin.disabled = false;
      }, 750);
    } catch (err) {
      coinGraphic.classList.remove('flipping');
      btnFlipCoin.disabled = false;
      showToast('error', 'Network error during coinflip.');
    }
  });

  // ---------------- LOOT BOX CRATES ----------------

  crateOpenButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const crateType = btn.getAttribute('data-crate');
      const cost = crateType === 'rare' ? 60 : 20;

      if (currentUser && currentUser.balance_pts < cost) {
        showToast('error', `Insufficient balance to open ${crateType} crate (Cost: ${cost} PTS).`);
        return;
      }

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = 'Opening crate...';

      try {
        const res = await fetch('/api/lootbox/open', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ crateType })
        });
        const json = await res.json();

        if (res.ok && json.success) {
          currentUser.balance_pts = json.newBalance;
          updateUserData(currentUser);

          // Render result card
          lootRarityTag.textContent = json.rarity;
          lootRarityTag.className = `rarity-badge rarity-${json.rarity.toLowerCase()}`;
          lootItemTitle.textContent = json.itemWon;
          lootPayoutText.textContent = `+${json.rewardPts} PTS (Net: ${json.netDelta >= 0 ? '+' : ''}${json.netDelta})`;
          lootMessageText.textContent = json.message;
          lootResultCard.style.display = 'block';

          lootResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          showToast('success', json.message);
        } else {
          showToast('error', json.error || 'Failed to open crate.');
        }
      } catch (err) {
        showToast('error', 'Network error while opening crate.');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  });

  // Run initial authentication check
  checkAuth();
});
