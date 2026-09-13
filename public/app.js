/**
 * QA Tester Portal - Master Client Application
 */

document.addEventListener('DOMContentLoaded', () => {
  // Current user session state
  let currentUser = null;
  let activeTab = 'home';

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
    inventory: document.getElementById('viewInventory'),
    leaderboard: document.getElementById('viewLeaderboard'),
    casino: document.getElementById('viewCasino'),
    lootbox: document.getElementById('viewLootbox'),
    admin: document.getElementById('viewAdmin')
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

  // Slot Machine Elements
  const reel0 = document.getElementById('reel0');
  const reel1 = document.getElementById('reel1');
  const reel2 = document.getElementById('reel2');
  const reelWindows = [
    reel0 ? reel0.closest('.reel-window') : null,
    reel1 ? reel1.closest('.reel-window') : null,
    reel2 ? reel2.closest('.reel-window') : null
  ];
  const slotBetInput = document.getElementById('slotBetInput');
  const slotStatusBanner = document.getElementById('slotStatusBanner');
  const slotPresets = document.querySelectorAll('.slot-preset');
  const btnMaxBet = document.getElementById('btnMaxBet');
  const btnSpin = document.getElementById('btnSpin');
  const btnSpinText = document.getElementById('btnSpinText');

  // Casino Dual-Mode & Plinko Elements
  const casinoModeBtns = document.querySelectorAll('.casino-mode-btn');
  const casinoSlotsContainer = document.getElementById('casinoSlotsContainer');
  const casinoPlinkoContainer = document.getElementById('casinoPlinkoContainer');
  let currentCasinoMode = 'slots';

  const plinkoCanvas = document.getElementById('plinkoCanvas');
  const plinkoStatusBanner = document.getElementById('plinkoStatusBanner');
  const plinkoBetInput = document.getElementById('plinkoBetInput');
  const plinkoPresets = document.querySelectorAll('.plinko-preset');
  const btnMaxPlinkoBet = document.getElementById('btnMaxPlinkoBet');
  const btnDropBall = document.getElementById('btnDropBall');
  const btnDropBallText = document.getElementById('btnDropBallText');

  // Lootbox Elements
  const crateOpenButtons = document.querySelectorAll('.btn-open-crate');
  const lootResultCard = document.getElementById('lootResultCard');
  const lootRarityTag = document.getElementById('lootRarityTag');
  const lootItemTitle = document.getElementById('lootItemTitle');
  const lootPayoutText = document.getElementById('lootPayoutText');
  const lootMessageText = document.getElementById('lootMessageText');

  // Shop Elements
  const shopGrid = document.getElementById('shopGrid');
  const shopFilterButtons = document.querySelectorAll('.shop-filter-btn');
  let shopCatalog = [];
  let currentFilter = 'all';

  // Inventory Elements
  const inventoryTbody = document.getElementById('inventoryTbody');
  const btnRefreshInventory = document.getElementById('btnRefreshInventory');

  // Leaderboard Elements
  const leaderboardTbody = document.getElementById('leaderboardTbody');
  const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');

  // Lead QA Panel Elements
  const navAdminBtn = document.getElementById('navAdminBtn');
  const quickCardAdmin = document.getElementById('quickCardAdmin');
  const btnRefreshAdmin = document.getElementById('btnRefreshAdmin');
  const adminSubnavBtns = document.querySelectorAll('.admin-subnav-btn');
  const adminTabSubmissions = document.getElementById('adminTabSubmissions');
  const adminTabFulfillment = document.getElementById('adminTabFulfillment');
  const adminTabPtsManager = document.getElementById('adminTabPtsManager');
  const adminTabAuditLogs = document.getElementById('adminTabAuditLogs');
  const pendingSubmissionsBadge = document.getElementById('pendingSubmissionsBadge');
  const pendingFulfillmentBadge = document.getElementById('pendingFulfillmentBadge');
  const subFilterBtns = document.querySelectorAll('.sub-filter-btn');
  const fulFilterBtns = document.querySelectorAll('.ful-filter-btn');
  const adminSubmissionsTbody = document.getElementById('adminSubmissionsTbody');
  const adminFulfillmentTbody = document.getElementById('adminFulfillmentTbody');
  const grantTargetUser = document.getElementById('grantTargetUser');
  const formGrantPts = document.getElementById('formGrantPts');
  const grantAmountInput = document.getElementById('grantAmount');
  const grantReasonInput = document.getElementById('grantReason');
  const btnSubmitGrant = document.getElementById('btnSubmitGrant');
  const btnGrantText = document.getElementById('btnGrantText');
  const adminLogsTbody = document.getElementById('adminLogsTbody');

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

    // Lead QA Panel Nav & Shortcut Card visibility
    if (navAdminBtn) {
      navAdminBtn.style.display = user.isLeadTester ? 'inline-flex' : 'none';
    }
    if (quickCardAdmin) {
      quickCardAdmin.style.display = user.isLeadTester ? 'block' : 'none';
    }

    // Home
    homeUsername.textContent = user.username;
    homeBalance.textContent = user.balance_pts;

    // Prefill & lock submit form fields
    submitUsername.value = user.username;
    submitDiscordId.value = user.discord_id;

    // Cap slot and plinko bets if needed
    if (slotBetInput && parseInt(slotBetInput.value, 10) > user.balance_pts) {
      slotBetInput.value = Math.max(1, user.balance_pts);
    }
    if (plinkoBetInput && parseInt(plinkoBetInput.value, 10) > user.balance_pts) {
      plinkoBetInput.value = Math.max(1, user.balance_pts);
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

    if (tabName === 'leaderboard') {
      loadLeaderboard();
    } else if (tabName === 'shop' && shopCatalog.length === 0) {
      loadShopCatalog();
    } else if (tabName === 'inventory') {
      loadUserInventory();
    } else if (tabName === 'admin') {
      loadAdminData();
    } else if (tabName === 'casino' && currentCasinoMode === 'plinko') {
      initPlinkoCanvas();
    }

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
        loadShopCatalog();
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

  // ---------------- SHOP CATALOG & PURCHASES ----------------

  function getBadgeClass(item) {
    if (item.id && item.id.includes('secret')) return 'badge-secret';
    if (item.id && item.id.includes('mythic')) return 'badge-mythic';
    if (item.id && item.id.includes('legendary')) return 'badge-legendary';
    if (item.category === 'Robux & Bundles') return 'badge-robux';
    return '';
  }

  function renderShopItems() {
    if (!shopGrid) return;

    const filtered = (currentFilter === 'all')
      ? shopCatalog
      : shopCatalog.filter(item => item.category === currentFilter);

    if (filtered.length === 0) {
      shopGrid.innerHTML = '<div class="shop-loading-card">No items available in this category.</div>';
      return;
    }

    shopGrid.innerHTML = filtered.map(item => `
      <div class="card shop-card" data-category="${item.category}">
        <div class="shop-art-slot">
          <span class="shop-art-icon">${item.icon || '📦'}</span>
          <span class="art-slot-tag">Art Asset Pending</span>
        </div>
        <div class="shop-item-header">
          <h3 class="shop-item-name">${item.name}</h3>
          <span class="shop-badge ${getBadgeClass(item)}">${item.badge || item.category}</span>
        </div>
        <p class="shop-item-desc">${item.desc}</p>
        <div class="shop-bottom">
          <span class="price-pill">${item.price} PTS</span>
          <button type="button" class="btn-buy" data-item-id="${item.id}" data-price="${item.price}">Purchase</button>
        </div>
      </div>
    `).join('');

    // Attach purchase listeners to dynamic buttons
    shopGrid.querySelectorAll('.btn-buy').forEach(btn => {
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
  }

  async function loadShopCatalog() {
    try {
      const res = await fetch('/api/shop/catalog');
      const data = await res.json();
      if (data.success && Array.isArray(data.catalog)) {
        shopCatalog = data.catalog;
        renderShopItems();
      }
    } catch (err) {
      console.error('Failed to load shop catalog:', err);
      if (shopGrid) {
        shopGrid.innerHTML = '<div class="shop-loading-card">Failed to load shop items. Please refresh.</div>';
      }
    }
  }

  shopFilterButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      shopFilterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.getAttribute('data-filter');
      renderShopItems();
    });
  });

  // ---------------- PLAYER INVENTORY ----------------

  async function loadUserInventory() {
    if (!inventoryTbody) return;
    inventoryTbody.innerHTML = '<tr><td colspan="6" class="table-loading">Loading inventory...</td></tr>';

    try {
      const res = await fetch('/api/inventory/me');
      const data = await res.json();

      if (data.success && Array.isArray(data.inventory)) {
        if (data.inventory.length === 0) {
          inventoryTbody.innerHTML = '<tr><td colspan="6" class="table-empty">No items in your inventory yet. Visit the Shop to redeem rewards!</td></tr>';
          return;
        }

        inventoryTbody.innerHTML = data.inventory.map(item => {
          const isPending = (item.status === 'PENDING');
          const statusClass = isPending ? 'status-pending-delivery' : 'status-delivered';
          const statusText = isPending ? '⏳ Pending Delivery' : '✅ Delivered In-Game';

          return `
            <tr>
              <td style="font-weight: 700; color: var(--text-muted);">#${item.id}</td>
              <td style="font-weight: 600; color: var(--text);">${String(item.item_name).replace(/</g, '&lt;')}</td>
              <td><span style="font-size: 0.82rem; color: var(--text-muted);">${String(item.category).replace(/</g, '&lt;')}</span></td>
              <td style="font-weight: 700; color: #7986ff;">${item.price_pts} PTS</td>
              <td><span class="status-pill ${statusClass}">${statusText}</span></td>
              <td style="font-size: 0.8rem; color: var(--text-muted);">${item.created_at || '—'}</td>
            </tr>
          `;
        }).join('');
      } else {
        inventoryTbody.innerHTML = '<tr><td colspan="6" class="table-empty">Failed to load inventory.</td></tr>';
      }
    } catch (err) {
      inventoryTbody.innerHTML = '<tr><td colspan="6" class="table-empty">Error fetching inventory.</td></tr>';
    }
  }

  if (btnRefreshInventory) {
    btnRefreshInventory.addEventListener('click', () => {
      loadUserInventory();
    });
  }

  // ---------------- GLOBAL LEADERBOARD ----------------

  let isLeaderboardLoading = false;
  async function loadLeaderboard() {
    if (!leaderboardTbody) return;
    if (isLeaderboardLoading) return;
    isLeaderboardLoading = true;
    leaderboardTbody.innerHTML = '<tr><td colspan="3" class="table-loading">Loading standings...</td></tr>';

    try {
      const res = await fetch('/api/leaderboard?limit=20');
      const data = await res.json();

      if (!res.ok || !data.success || !Array.isArray(data.leaderboard) || data.leaderboard.length === 0) {
        leaderboardTbody.innerHTML = '<tr><td colspan="3" class="table-empty">No tester rankings recorded yet.</td></tr>';
        return;
      }

      let rowsHtml = '';
      data.leaderboard.forEach(tester => {
        const isYou = currentUser && (tester.discord_id === currentUser.discord_id);
        let rankDisplay = '';
        if (tester.rank === 1) {
          rankDisplay = '<span class="rank-pill rank-1" title="1st Place">🥇</span>';
        } else if (tester.rank === 2) {
          rankDisplay = '<span class="rank-pill rank-2" title="2nd Place">🥈</span>';
        } else if (tester.rank === 3) {
          rankDisplay = '<span class="rank-pill rank-3" title="3rd Place">🥉</span>';
        } else {
          rankDisplay = `<span class="rank-num">#${tester.rank}</span>`;
        }

        const avatar = tester.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
        const cleanUsername = String(tester.username || 'Tester').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const balanceStr = Number(tester.balance_pts || 0).toLocaleString();

        rowsHtml += `
          <tr class="${isYou ? 'is-current-user' : ''}">
            <td class="td-rank">${rankDisplay}</td>
            <td>
              <div class="tester-cell">
                <img src="${avatar}" alt="" class="tester-avatar" onerror="this.src='https://cdn.discordapp.com/embed/avatars/0.png'">
                <div class="tester-name-wrap">
                  <span class="tester-name">${cleanUsername}</span>
                  ${isYou ? '<span class="you-tag">You</span>' : ''}
                </div>
              </div>
            </td>
            <td class="td-balance">${balanceStr} PTS</td>
          </tr>
        `;
      });

      leaderboardTbody.innerHTML = rowsHtml;
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      leaderboardTbody.innerHTML = '<tr><td colspan="3" class="table-empty">Failed to load leaderboard standings.</td></tr>';
    } finally {
      isLeaderboardLoading = false;
    }
  }

  if (btnRefreshLeaderboard) {
    btnRefreshLeaderboard.addEventListener('click', () => {
      loadLeaderboard();
    });
  }

  // ---------------- 3-REEL SLOT MACHINE ----------------

  const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

  slotPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      const betVal = parseInt(preset.getAttribute('data-bet'), 10);
      if (!isNaN(betVal) && slotBetInput) {
        slotBetInput.value = betVal;
      }
    });
  });

  if (btnMaxBet && slotBetInput) {
    btnMaxBet.addEventListener('click', () => {
      slotBetInput.value = currentUser ? Math.max(1, currentUser.balance_pts) : 10;
    });
  }

  let isSpinning = false;
  if (btnSpin) {
    btnSpin.addEventListener('click', async () => {
      if (isSpinning) return;
      const bet = parseInt(slotBetInput.value, 10);

      if (isNaN(bet) || bet <= 0) {
        showToast('error', 'Please enter a valid bet amount.');
        return;
      }

      if (currentUser && currentUser.balance_pts < bet) {
        showToast('error', `Insufficient PTS balance (You have ${currentUser.balance_pts} PTS).`);
        return;
      }

      isSpinning = true;
      btnSpin.disabled = true;
      btnSpinText.textContent = 'SPINNING...';

      // Reset banners and visual classes
      slotStatusBanner.className = 'slot-status-banner';
      slotStatusBanner.textContent = 'Reels spinning... Good luck!';
      reelWindows.forEach(w => {
        if (w) {
          w.classList.add('spinning');
          w.classList.remove('locked', 'jackpot-win');
        }
      });

      // Rapidly cycle symbols during spin
      const int0 = setInterval(() => { if (reel0) reel0.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]; }, 55);
      const int1 = setInterval(() => { if (reel1) reel1.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]; }, 55);
      const int2 = setInterval(() => { if (reel2) reel2.textContent = SLOT_SYMBOLS[Math.floor(Math.random() * SLOT_SYMBOLS.length)]; }, 55);

      try {
        const res = await fetch('/api/casino/spin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bet })
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          clearInterval(int0);
          clearInterval(int1);
          clearInterval(int2);
          reelWindows.forEach(w => w && w.classList.remove('spinning'));
          slotStatusBanner.className = 'slot-status-banner loss';
          slotStatusBanner.textContent = json.error || 'Spin failed.';
          showToast('error', json.error || 'Spin failed.');
          isSpinning = false;
          btnSpin.disabled = false;
          btnSpinText.textContent = 'SPIN';
          return;
        }

        // Staggered reel stops (800ms, 1250ms, 1700ms) for tension & animation feel
        setTimeout(() => {
          clearInterval(int0);
          if (reel0) reel0.textContent = json.reels[0];
          if (reelWindows[0]) {
            reelWindows[0].classList.remove('spinning');
            reelWindows[0].classList.add('locked');
          }
        }, 800);

        setTimeout(() => {
          clearInterval(int1);
          if (reel1) reel1.textContent = json.reels[1];
          if (reelWindows[1]) {
            reelWindows[1].classList.remove('spinning');
            reelWindows[1].classList.add('locked');
          }
        }, 1250);

        setTimeout(() => {
          clearInterval(int2);
          if (reel2) reel2.textContent = json.reels[2];
          if (reelWindows[2]) {
            reelWindows[2].classList.remove('spinning');
            reelWindows[2].classList.add('locked');
          }

          // All reels locked! Process result
          currentUser.balance_pts = json.newBalance;
          updateUserData(currentUser);

          if (json.multiplier > 0) {
            slotStatusBanner.className = 'slot-status-banner win';
            slotStatusBanner.textContent = json.message;
            if (json.multiplier === 77) {
              reelWindows.forEach(w => w && w.classList.add('jackpot-win'));
            }
            showToast('success', json.message);
          } else {
            slotStatusBanner.className = 'slot-status-banner loss';
            slotStatusBanner.textContent = json.message;
            showToast('error', json.message);
          }

          isSpinning = false;
          btnSpin.disabled = false;
          btnSpinText.textContent = 'SPIN';
        }, 1700);

      } catch (err) {
        clearInterval(int0);
        clearInterval(int1);
        clearInterval(int2);
        reelWindows.forEach(w => w && w.classList.remove('spinning'));
        showToast('error', 'Network error during slot spin.');
        isSpinning = false;
        btnSpin.disabled = false;
        btnSpinText.textContent = 'SPIN';
      }
    });
  }

  // ---------------- CASINO MODE SELECTOR & PLINKO ARCADE ----------------

  // Mode switching (3-Reel Slots <-> Plinko Arcade)
  casinoModeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-casino-mode');
      if (mode === currentCasinoMode) return;
      currentCasinoMode = mode;

      casinoModeBtns.forEach(b => b.classList.toggle('active', b === btn));

      if (mode === 'slots') {
        if (casinoSlotsContainer) casinoSlotsContainer.style.display = 'block';
        if (casinoPlinkoContainer) casinoPlinkoContainer.style.display = 'none';
      } else {
        if (casinoSlotsContainer) casinoSlotsContainer.style.display = 'none';
        if (casinoPlinkoContainer) casinoPlinkoContainer.style.display = 'block';
        initPlinkoCanvas();
      }
    });
  });

  // Plinko Bet Presets
  plinkoPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      const betVal = parseInt(preset.getAttribute('data-bet'), 10);
      if (!isNaN(betVal) && plinkoBetInput) {
        plinkoBetInput.value = betVal;
      }
    });
  });

  if (btnMaxPlinkoBet && plinkoBetInput) {
    btnMaxPlinkoBet.addEventListener('click', () => {
      plinkoBetInput.value = currentUser ? Math.max(1, currentUser.balance_pts) : 10;
    });
  }

  // Plinko Canvas Engine (11 Rows, 12 Buckets)
  const PLINKO = {
    w: 520,
    h: 580,
    rows: 11,
    buckets: 12,
    dx: 38,
    dy: 36,
    pegStartY: 65,
    pegRadius: 4.5,
    ballRadius: 7,
    bucketY: 492,
    bucketH: 46,
    bucketW: 34,
    multipliers: [24, 6, 2.8, 1.2, 0.5, 0.2, 0.2, 0.5, 1.2, 2.8, 6, 24],
    bucketColors: [
      { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.22)', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.65)' },
      { border: '#f97316', bg: 'rgba(249, 115, 22, 0.22)', text: '#ffffff', glow: 'rgba(249, 115, 22, 0.65)' },
      { border: '#eab308', bg: 'rgba(234, 179, 8, 0.24)', text: '#ffffff', glow: 'rgba(234, 179, 8, 0.65)' },
      { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.22)', text: '#ffffff', glow: 'rgba(34, 197, 94, 0.65)' },
      { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.22)', text: '#ffffff', glow: 'rgba(59, 130, 246, 0.65)' },
      { border: '#64748b', bg: 'rgba(100, 116, 139, 0.22)', text: '#cbd5e1', glow: 'rgba(100, 116, 139, 0.65)' },
      { border: '#64748b', bg: 'rgba(100, 116, 139, 0.22)', text: '#cbd5e1', glow: 'rgba(100, 116, 139, 0.65)' },
      { border: '#3b82f6', bg: 'rgba(59, 130, 246, 0.22)', text: '#ffffff', glow: 'rgba(59, 130, 246, 0.65)' },
      { border: '#22c55e', bg: 'rgba(34, 197, 94, 0.22)', text: '#ffffff', glow: 'rgba(34, 197, 94, 0.65)' },
      { border: '#eab308', bg: 'rgba(234, 179, 8, 0.24)', text: '#ffffff', glow: 'rgba(234, 179, 8, 0.65)' },
      { border: '#f97316', bg: 'rgba(249, 115, 22, 0.22)', text: '#ffffff', glow: 'rgba(249, 115, 22, 0.65)' },
      { border: '#ef4444', bg: 'rgba(239, 68, 68, 0.22)', text: '#ffffff', glow: 'rgba(239, 68, 68, 0.65)' },
    ]
  };

  let plinkoCtx = null;
  let isPlinkoDropping = false;
  let activePlinkoBall = null;
  let pegPulses = [];
  let plinkoParticles = [];
  let activeBucketHit = null;

  function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function getPegPos(r, i) {
    const x = 260 - (r * PLINKO.dx) / 2 + i * PLINKO.dx;
    const y = PLINKO.pegStartY + r * PLINKO.dy;
    return { x, y };
  }

  function setupPlinkoCanvas() {
    if (!plinkoCanvas) return null;
    const dpr = window.devicePixelRatio || 1;
    plinkoCanvas.width = PLINKO.w * dpr;
    plinkoCanvas.height = PLINKO.h * dpr;
    plinkoCanvas.style.width = `${PLINKO.w}px`;
    plinkoCanvas.style.height = `${PLINKO.h}px`;
    const ctx = plinkoCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }

  function drawPlinkoBoard(ctx) {
    if (!ctx) return;

    // Clear board
    ctx.clearRect(0, 0, PLINKO.w, PLINKO.h);

    // Background radial glow
    const bgGrad = ctx.createRadialGradient(260, 120, 20, 260, 290, 380);
    bgGrad.addColorStop(0, '#0e1628');
    bgGrad.addColorStop(0.6, '#080c16');
    bgGrad.addColorStop(1, '#05070c');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, PLINKO.w, PLINKO.h);

    // Drop funnel marker
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(234, 12);
    ctx.lineTo(252, 36);
    ctx.lineTo(252, 46);
    ctx.moveTo(286, 12);
    ctx.lineTo(268, 36);
    ctx.lineTo(268, 46);
    ctx.stroke();

    // Side deflector bumpers
    ctx.fillStyle = '#141d2e';
    ctx.strokeStyle = '#223048';
    ctx.lineWidth = 1.5;

    // Left bumper
    ctx.beginPath();
    ctx.moveTo(10, 160);
    ctx.lineTo(34, 250);
    ctx.lineTo(34, 370);
    ctx.lineTo(10, 450);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right bumper
    ctx.beginPath();
    ctx.moveTo(510, 160);
    ctx.lineTo(486, 250);
    ctx.lineTo(486, 370);
    ctx.lineTo(510, 450);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Peg grid (11 rows, apex at row 0)
    for (let r = 0; r < PLINKO.rows; r++) {
      for (let i = 0; i <= r; i++) {
        const { x, y } = getPegPos(r, i);

        // Soft outer halo
        ctx.beginPath();
        ctx.arc(x, y, 7.5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fill();

        // Peg core
        ctx.beginPath();
        ctx.arc(x, y, PLINKO.pegRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#e2e8f0';
        ctx.fill();

        // Shiny specular reflection dot
        ctx.beginPath();
        ctx.arc(x - 1.2, y - 1.2, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // Divider pins above buckets
    for (let b = 0; b < 11; b++) {
      const pinX = 70 + b * PLINKO.dx;
      ctx.beginPath();
      ctx.arc(pinX, 486, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
    }

    // 12 Multiplier Buckets
    for (let b = 0; b < PLINKO.buckets; b++) {
      const bx = 34 + b * PLINKO.dx;
      const by = PLINKO.bucketY;
      const bw = PLINKO.bucketW;
      const bh = PLINKO.bucketH;
      const mult = PLINKO.multipliers[b];
      const style = PLINKO.bucketColors[b];
      const isHit = activeBucketHit && activeBucketHit.index === b;

      ctx.save();
      if (isHit) {
        ctx.shadowColor = style.border;
        ctx.shadowBlur = 20;
      }

      // Slot body
      roundRect(ctx, bx, by, bw, bh, 6);
      ctx.fillStyle = isHit ? style.glow : style.bg;
      ctx.fill();
      ctx.strokeStyle = isHit ? '#ffffff' : style.border;
      ctx.lineWidth = isHit ? 2.5 : 1.5;
      ctx.stroke();

      // Top notch bar
      ctx.fillStyle = isHit ? '#ffffff' : style.border;
      ctx.fillRect(bx + 4, by, bw - 8, 2);

      // Label text
      ctx.shadowBlur = 0;
      ctx.fillStyle = isHit ? '#ffffff' : style.text;
      ctx.font = 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${mult}x`, bx + bw / 2, by + bh / 2 + 1);

      ctx.restore();
    }

    // Active Peg Pulses
    for (let i = pegPulses.length - 1; i >= 0; i--) {
      const p = pegPulses[i];
      p.r += 0.8;
      p.alpha -= 0.045;
      if (p.alpha <= 0) {
        pegPulses.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(56, 189, 248, ${p.alpha})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Active Particles (Collision Sparks & Win Confetti)
    for (let i = plinkoParticles.length - 1; i >= 0; i--) {
      const pt = plinkoParticles[i];
      pt.x += pt.vx;
      pt.y += pt.vy;
      pt.vy += 0.14; // Gravity
      pt.alpha -= pt.decay || 0.025;
      if (pt.alpha <= 0) {
        plinkoParticles.splice(i, 1);
        continue;
      }
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size || 2.5, 0, Math.PI * 2);
      ctx.fillStyle = pt.color.replace(')', `, ${pt.alpha})`).replace('rgb', 'rgba');
      ctx.fill();
    }

    // Bucket Hit Decay
    if (activeBucketHit) {
      activeBucketHit.timer--;
      if (activeBucketHit.timer <= 0) {
        activeBucketHit = null;
      }
    }

    // Active Dropping Ball
    if (activePlinkoBall) {
      // Trail
      for (let t = 0; t < activePlinkoBall.trail.length; t++) {
        const tr = activePlinkoBall.trail[t];
        const trailAlpha = (t + 1) / (activePlinkoBall.trail.length + 1) * 0.45;
        ctx.beginPath();
        ctx.arc(tr.x, tr.y, PLINKO.ballRadius * (0.35 + 0.65 * (t / activePlinkoBall.trail.length)), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(250, 204, 21, ${trailAlpha})`;
        ctx.fill();
      }

      // Ball Outer Glow
      ctx.save();
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 15;

      // Ball Sphere Gradient
      ctx.beginPath();
      ctx.arc(activePlinkoBall.x, activePlinkoBall.y, PLINKO.ballRadius, 0, Math.PI * 2);
      const ballGrad = ctx.createRadialGradient(
        activePlinkoBall.x - 2, activePlinkoBall.y - 2, 1,
        activePlinkoBall.x, activePlinkoBall.y, PLINKO.ballRadius
      );
      ballGrad.addColorStop(0, '#ffffff');
      ballGrad.addColorStop(0.5, '#fef08a');
      ballGrad.addColorStop(1, '#eab308');
      ctx.fillStyle = ballGrad;
      ctx.fill();
      ctx.strokeStyle = '#ca8a04';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }
  }

  function initPlinkoCanvas() {
    if (!plinkoCtx) {
      plinkoCtx = setupPlinkoCanvas();
    }
    drawPlinkoBoard(plinkoCtx);
  }

  function animatePlinkoDrop(dropData, onComplete) {
    if (!plinkoCtx) {
      plinkoCtx = setupPlinkoCanvas();
    }

    const path = dropData.path || []; // array of 11 values (0 or 1)
    const slotIndex = dropData.slotIndex;
    const multiplier = dropData.multiplier;

    // Waypoint 0: Spawn point above apex
    const waypoints = [
      { x: 260, y: 22, isPeg: false }
    ];

    // Waypoint 1: Row 0 apex peg
    const apex = getPegPos(0, 0);
    waypoints.push({ x: apex.x, y: apex.y, isPeg: true });

    // Waypoints for rows 1 to 10
    let currentPegIndex = 0;
    for (let r = 1; r < PLINKO.rows; r++) {
      const step = path[r - 1]; // 0 = left, 1 = right
      currentPegIndex += step;
      const peg = getPegPos(r, currentPegIndex);
      waypoints.push({ x: peg.x, y: peg.y, isPeg: true, dir: step });
    }

    // Final bucket target
    const finalStep = path[10];
    const bucketX = 51 + slotIndex * PLINKO.dx;
    waypoints.push({ x: bucketX, y: 494, isPeg: false, dir: finalStep }); // Bucket mouth
    waypoints.push({ x: bucketX, y: 518, isPeg: false, isBucketFloor: true, slotIndex }); // Bucket floor

    // Segment list with start, end, control point, duration
    const segments = [];
    for (let s = 0; s < waypoints.length - 1; s++) {
      const p0 = waypoints[s];
      const p1 = waypoints[s + 1];

      let duration = 115;
      let cx = (p0.x + p1.x) / 2;
      let cy = (p0.y + p1.y) / 2;

      if (s === 0) {
        // Initial drop from funnel to apex
        duration = 135;
        cx = 260;
        cy = (p0.y + p1.y) / 2;
      } else if (p1.isBucketFloor) {
        // Settle into bucket
        duration = 95;
        cx = p1.x;
        cy = (p0.y + p1.y) / 2;
      } else {
        // Peg deflection bounce
        const dir = p1.dir !== undefined ? p1.dir : (p1.x >= p0.x ? 1 : 0);
        const bulge = dir === 1 ? 14 : -14;
        cx = p0.x + (p1.x - p0.x) * 0.25 + bulge;
        cy = p0.y - 11;
        duration = 110;
      }

      segments.push({ p0, p1, cx, cy, duration });
    }

    let currentSegmentIndex = 0;
    let segmentStartTime = performance.now();

    activePlinkoBall = {
      x: waypoints[0].x,
      y: waypoints[0].y,
      trail: []
    };

    function triggerPegHit(pegPos) {
      pegPulses.push({ x: pegPos.x, y: pegPos.y, r: 4, alpha: 0.85 });
      for (let k = 0; k < 5; k++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.0 + Math.random() * 2.2;
        plinkoParticles.push({
          x: pegPos.x,
          y: pegPos.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          alpha: 0.9,
          decay: 0.04,
          size: 2,
          color: 'rgb(56, 189, 248)'
        });
      }
    }

    function triggerBucketLanding(bucketIndex) {
      activeBucketHit = { index: bucketIndex, timer: 75, maxTimer: 75 };
      const sparkCount = multiplier >= 2.0 ? 30 : 14;
      for (let k = 0; k < sparkCount; k++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5;
        const speed = 2.0 + Math.random() * 4.5;
        const col = multiplier >= 6 ? 'rgb(239, 68, 68)' : (multiplier >= 1.2 ? 'rgb(234, 179, 8)' : 'rgb(59, 130, 246)');
        plinkoParticles.push({
          x: 51 + bucketIndex * PLINKO.dx,
          y: 494,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1.0,
          decay: 0.02,
          size: multiplier >= 2.0 ? 3.2 : 2.4,
          color: col
        });
      }
    }

    function stepAnimation(now) {
      const seg = segments[currentSegmentIndex];
      const elapsed = now - segmentStartTime;
      const t = Math.min(1, elapsed / seg.duration);

      // Quadratic Bézier interpolation
      const invT = 1 - t;
      const curX = invT * invT * seg.p0.x + 2 * invT * t * seg.cx + t * t * seg.p1.x;
      const curY = invT * invT * seg.p0.y + 2 * invT * t * seg.cy + t * t * seg.p1.y;

      activePlinkoBall.x = curX;
      activePlinkoBall.y = curY;

      // Update trail
      activePlinkoBall.trail.push({ x: curX, y: curY });
      if (activePlinkoBall.trail.length > 7) {
        activePlinkoBall.trail.shift();
      }

      if (t >= 1) {
        // Waypoint reached!
        if (seg.p1.isPeg) {
          triggerPegHit(seg.p1);
        } else if (seg.p1.isBucketFloor) {
          triggerBucketLanding(seg.p1.slotIndex);
        }

        currentSegmentIndex++;
        if (currentSegmentIndex < segments.length) {
          segmentStartTime = now;
        } else {
          // Animation complete!
          drawPlinkoBoard(plinkoCtx);
          setTimeout(() => {
            if (onComplete) onComplete();
          }, 350);

          function drainEffects() {
            drawPlinkoBoard(plinkoCtx);
            if (pegPulses.length > 0 || plinkoParticles.length > 0 || activeBucketHit) {
              requestAnimationFrame(drainEffects);
            }
          }
          requestAnimationFrame(drainEffects);
          return;
        }
      }

      drawPlinkoBoard(plinkoCtx);
      requestAnimationFrame(stepAnimation);
    }

    requestAnimationFrame(stepAnimation);
  }

  // Plinko Drop Ball Event Listener
  if (btnDropBall) {
    btnDropBall.addEventListener('click', async () => {
      if (isPlinkoDropping) return;
      const bet = parseInt(plinkoBetInput.value, 10);

      if (isNaN(bet) || bet <= 0) {
        showToast('error', 'Please enter a valid bet amount.');
        return;
      }

      if (currentUser && currentUser.balance_pts < bet) {
        showToast('error', `Insufficient PTS balance (You have ${currentUser.balance_pts} PTS).`);
        return;
      }

      isPlinkoDropping = true;
      btnDropBall.disabled = true;
      btnDropBallText.textContent = 'DROPPING...';
      plinkoStatusBanner.className = 'slot-status-banner';
      plinkoStatusBanner.textContent = 'Ball in play... Bouncing down the board!';

      try {
        const res = await fetch('/api/casino/plinko', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bet })
        });
        const json = await res.json();

        if (!res.ok || !json.success) {
          showToast('error', json.error || 'Plinko drop failed.');
          plinkoStatusBanner.className = 'slot-status-banner loss';
          plinkoStatusBanner.textContent = json.error || 'Drop failed.';
          isPlinkoDropping = false;
          btnDropBall.disabled = false;
          btnDropBallText.textContent = 'DROP BALL';
          return;
        }

        animatePlinkoDrop(json, () => {
          currentUser.balance_pts = json.newBalance;
          updateUserData(currentUser);

          if (json.multiplier >= 1.0) {
            plinkoStatusBanner.className = 'slot-status-banner win';
            showToast('success', json.message);
          } else {
            plinkoStatusBanner.className = 'slot-status-banner loss';
            showToast('error', json.message);
          }
          plinkoStatusBanner.textContent = json.message;

          isPlinkoDropping = false;
          btnDropBall.disabled = false;
          btnDropBallText.textContent = 'DROP BALL';
        });

      } catch (err) {
        showToast('error', 'Network error during Plinko drop.');
        isPlinkoDropping = false;
        btnDropBall.disabled = false;
        btnDropBallText.textContent = 'DROP BALL';
      }
    });
  }

  // ---------------- LOOT BOX CRATES ----------------

  crateOpenButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const crateType = btn.getAttribute('data-crate');
      const cost = crateType === 'rare' ? 75 : 25;

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

  // ---------------- LEAD QA PANEL ----------------

  let activeAdminTab = 'submissions';
  let subStatusFilter = 'PENDING';
  let cachedSubmissions = [];
  let fulStatusFilter = 'PENDING';
  let cachedInventory = [];

  function switchAdminTab(tab) {
    activeAdminTab = tab;
    adminSubnavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === tab);
    });
    if (adminTabSubmissions) adminTabSubmissions.style.display = (tab === 'submissions') ? 'block' : 'none';
    if (adminTabFulfillment) adminTabFulfillment.style.display = (tab === 'fulfillment') ? 'block' : 'none';
    if (adminTabPtsManager) adminTabPtsManager.style.display = (tab === 'pts-manager') ? 'block' : 'none';
    if (adminTabAuditLogs) adminTabAuditLogs.style.display = (tab === 'audit-logs') ? 'block' : 'none';

    if (tab === 'submissions') loadAdminSubmissions();
    else if (tab === 'fulfillment') loadAdminFulfillment();
    else if (tab === 'pts-manager') loadAdminUsers();
    else if (tab === 'audit-logs') loadAdminLogs();
  }

  adminSubnavBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchAdminTab(btn.getAttribute('data-admin-tab'));
    });
  });

  subFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      subFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      subStatusFilter = btn.getAttribute('data-sub-filter');
      renderSubmissionsTable();
    });
  });

  function renderSubmissionsTable() {
    if (!adminSubmissionsTbody) return;

    const pendingCount = cachedSubmissions.filter(s => s.status === 'PENDING').length;
    if (pendingSubmissionsBadge) {
      pendingSubmissionsBadge.textContent = pendingCount;
      pendingSubmissionsBadge.classList.toggle('zero', pendingCount === 0);
    }

    const list = (subStatusFilter === 'ALL')
      ? cachedSubmissions
      : cachedSubmissions.filter(s => s.status === 'PENDING');

    if (list.length === 0) {
      adminSubmissionsTbody.innerHTML = `<tr><td colspan="7" class="table-empty">No ${subStatusFilter === 'PENDING' ? 'pending' : ''} submissions found.</td></tr>`;
      return;
    }

    adminSubmissionsTbody.innerHTML = list.map(sub => {
      const proofHtml = sub.proof_url
        ? `<a href="${sub.proof_url}" target="_blank" rel="noopener noreferrer" class="proof-link">View Proof</a>`
        : '<span style="color: var(--text-muted); font-size: 0.8rem;">None</span>';

      const statusClass = `status-${sub.status.toLowerCase()}`;
      const isPending = sub.status === 'PENDING';

      const actionsHtml = isPending ? `
        <div class="review-actions-wrap">
          <button type="button" class="btn-review-approve" data-id="${sub.id}">Approve</button>
          <button type="button" class="btn-review-decline" data-id="${sub.id}">Decline</button>
        </div>
      ` : `<span class="reviewed-label">${sub.status}</span>`;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted);">#${sub.id}</td>
          <td>
            <div class="tester-name-wrap">
              <span class="tester-name">${String(sub.username || 'Tester').replace(/</g, '&lt;')}</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">${sub.discord_id}</span>
            </div>
          </td>
          <td style="font-weight: 700; color: #7986ff;">+${sub.points} PTS</td>
          <td><div class="report-text-cell">${String(sub.description || '').replace(/</g, '&lt;')}</div></td>
          <td>${proofHtml}</td>
          <td><span class="status-pill ${statusClass}">${sub.status}</span></td>
          <td style="text-align: right;">${actionsHtml}</td>
        </tr>
      `;
    }).join('');

    // Attach click listeners for Approve and Decline
    adminSubmissionsTbody.querySelectorAll('.btn-review-approve').forEach(btn => {
      btn.addEventListener('click', () => handleReviewAction(btn.getAttribute('data-id'), 'approve', btn));
    });
    adminSubmissionsTbody.querySelectorAll('.btn-review-decline').forEach(btn => {
      btn.addEventListener('click', () => handleReviewAction(btn.getAttribute('data-id'), 'decline', btn));
    });
  }

  async function handleReviewAction(id, action, buttonEl) {
    const isApprove = (action === 'approve');
    if (!confirm(`Are you sure you want to ${isApprove ? 'APPROVE' : 'DECLINE'} QA submission #${id}?`)) {
      return;
    }

    if (buttonEl) buttonEl.disabled = true;

    try {
      const res = await fetch(`/api/admin/submissions/${id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('success', data.message);
        // If current user is the submitter, update local balance
        const targetSub = cachedSubmissions.find(s => String(s.id) === String(id));
        if (targetSub && currentUser && targetSub.discord_id === currentUser.discord_id && data.newBalance !== undefined) {
          currentUser.balance_pts = data.newBalance;
          updateUserData(currentUser);
        }
        loadAdminSubmissions();
      } else {
        showToast('error', data.error || 'Failed to review submission.');
      }
    } catch (err) {
      showToast('error', 'Network error reviewing submission.');
    } finally {
      if (buttonEl) buttonEl.disabled = false;
    }
  }

  async function loadAdminSubmissions() {
    if (!adminSubmissionsTbody) return;
    adminSubmissionsTbody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading submissions...</td></tr>';

    try {
      const res = await fetch('/api/admin/submissions');
      const data = await res.json();

      if (data.success && Array.isArray(data.submissions)) {
        cachedSubmissions = data.submissions;
        renderSubmissionsTable();
      } else {
        adminSubmissionsTbody.innerHTML = '<tr><td colspan="7" class="table-empty">Failed to load submissions.</td></tr>';
      }
    } catch (err) {
      adminSubmissionsTbody.innerHTML = '<tr><td colspan="7" class="table-empty">Error fetching submissions.</td></tr>';
    }
  }

  // --- Fulfillment Queue Handlers ---
  fulFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      fulFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      fulStatusFilter = btn.getAttribute('data-ful-filter');
      loadAdminFulfillment();
    });
  });

  async function loadAdminFulfillment() {
    if (!adminFulfillmentTbody) return;
    adminFulfillmentTbody.innerHTML = '<tr><td colspan="8" class="table-loading">Loading fulfillment queue...</td></tr>';

    try {
      const res = await fetch(`/api/admin/inventory?status=${fulStatusFilter}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.inventory)) {
        cachedInventory = data.inventory;
        renderAdminFulfillmentTable();
      } else {
        adminFulfillmentTbody.innerHTML = '<tr><td colspan="8" class="table-empty">Failed to load fulfillment queue.</td></tr>';
      }
    } catch (err) {
      adminFulfillmentTbody.innerHTML = '<tr><td colspan="8" class="table-empty">Error fetching fulfillment queue.</td></tr>';
    }
  }

  function renderAdminFulfillmentTable() {
    if (!adminFulfillmentTbody) return;

    if (fulStatusFilter === 'PENDING' && pendingFulfillmentBadge) {
      pendingFulfillmentBadge.textContent = cachedInventory.length;
      pendingFulfillmentBadge.classList.toggle('zero', cachedInventory.length === 0);
    }

    const list = cachedInventory;
    if (list.length === 0) {
      adminFulfillmentTbody.innerHTML = `<tr><td colspan="8" class="table-empty">No ${fulStatusFilter === 'PENDING' ? 'pending' : ''} items in fulfillment queue.</td></tr>`;
      return;
    }

    adminFulfillmentTbody.innerHTML = list.map(item => {
      const isPending = (item.status === 'PENDING');
      const statusClass = isPending ? 'status-pending-delivery' : 'status-delivered';
      const statusText = isPending ? '⏳ Pending Delivery' : '✅ Delivered In-Game';

      const actionsHtml = isPending ? `
        <div class="review-actions-wrap">
          <button type="button" class="btn-fulfill" data-id="${item.id}">Mark Delivered</button>
          <button type="button" class="btn-revoke" data-id="${item.id}">Revoke</button>
        </div>
      ` : `
        <div class="review-actions-wrap">
          <span class="reviewed-label">Delivered</span>
          <button type="button" class="btn-revoke" data-id="${item.id}" style="margin-left: 6px;">Revoke</button>
        </div>
      `;

      return `
        <tr>
          <td style="font-weight: 700; color: var(--text-muted);">#${item.id}</td>
          <td>
            <div class="tester-name-wrap">
              <span class="tester-name">${String(item.username || 'Tester').replace(/</g, '&lt;')}</span>
              <span style="font-size: 0.72rem; color: var(--text-muted);">${item.discord_id}</span>
            </div>
          </td>
          <td style="font-weight: 600; color: var(--text);">${String(item.item_name).replace(/</g, '&lt;')}</td>
          <td><span style="font-size: 0.82rem; color: var(--text-muted);">${String(item.category).replace(/</g, '&lt;')}</span></td>
          <td style="font-weight: 700; color: #7986ff;">${item.price_pts} PTS</td>
          <td><span class="status-pill ${statusClass}">${statusText}</span></td>
          <td style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap;">${item.created_at || '—'}</td>
          <td style="text-align: right;">${actionsHtml}</td>
        </tr>
      `;
    }).join('');

    adminFulfillmentTbody.querySelectorAll('.btn-fulfill').forEach(btn => {
      btn.addEventListener('click', () => handleFulfillAction(btn.getAttribute('data-id'), btn));
    });

    adminFulfillmentTbody.querySelectorAll('.btn-revoke').forEach(btn => {
      btn.addEventListener('click', () => handleRevokeAction(btn.getAttribute('data-id'), btn));
    });
  }

  async function handleFulfillAction(id, buttonEl) {
    if (!confirm(`Mark item #${id} as delivered in-game to tester?`)) return;

    if (buttonEl) buttonEl.disabled = true;

    try {
      const res = await fetch(`/api/admin/inventory/${id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('success', data.message || `Item #${id} delivered!`);
        loadAdminFulfillment();
        updateAdminBadges();
      } else {
        showToast('error', data.error || 'Failed to mark item as fulfilled.');
      }
    } catch (err) {
      showToast('error', 'Network error fulfilling item.');
    } finally {
      if (buttonEl) buttonEl.disabled = false;
    }
  }

  async function handleRevokeAction(id, buttonEl) {
    if (!confirm(`Are you sure you want to REVOKE / DELETE inventory record #${id}?`)) return;

    if (buttonEl) buttonEl.disabled = true;

    try {
      const res = await fetch(`/api/admin/inventory/${id}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();

      if (res.ok && data.success) {
        showToast('success', data.message || `Item #${id} revoked.`);
        loadAdminFulfillment();
        updateAdminBadges();
      } else {
        showToast('error', data.error || 'Failed to revoke item.');
      }
    } catch (err) {
      showToast('error', 'Network error revoking item.');
    } finally {
      if (buttonEl) buttonEl.disabled = false;
    }
  }

  async function loadAdminUsers() {
    if (!grantTargetUser) return;
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();

      if (data.success && Array.isArray(data.users)) {
        const currentSelected = grantTargetUser.value;
        grantTargetUser.innerHTML = '<option value="">-- Choose registered tester --</option>' +
          data.users.map(u => `
            <option value="${u.discord_id}">
              ${u.username} (${u.balance_pts.toLocaleString()} PTS) - ID: ${u.discord_id}
            </option>
          `).join('');
        if (currentSelected) grantTargetUser.value = currentSelected;
      }
    } catch (err) {
      console.error('Failed to load registered users:', err);
    }
  }

  if (formGrantPts) {
    formGrantPts.addEventListener('submit', async (e) => {
      e.preventDefault();
      const targetDiscordId = grantTargetUser.value;
      const amount = parseInt(grantAmountInput.value, 10);
      const reason = grantReasonInput.value.trim();

      if (!targetDiscordId) {
        showToast('error', 'Please select a registered tester.');
        return;
      }
      if (isNaN(amount) || amount === 0) {
        showToast('error', 'Adjustment amount must be a non-zero integer.');
        return;
      }
      if (!reason) {
        showToast('error', 'Please provide a reason for the adjustment.');
        return;
      }

      btnSubmitGrant.disabled = true;
      btnGrantText.textContent = 'Applying...';

      try {
        const res = await fetch('/api/admin/grant-pts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetDiscordId, amount, reason })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          showToast('success', data.message);
          grantAmountInput.value = '';
          grantReasonInput.value = '';
          loadAdminUsers();
          if (currentUser && currentUser.discord_id === targetDiscordId) {
            currentUser.balance_pts = data.newBalance;
            updateUserData(currentUser);
          }
        } else {
          showToast('error', data.error || 'Failed to adjust balance.');
        }
      } catch (err) {
        showToast('error', 'Network error during balance adjustment.');
      } finally {
        btnSubmitGrant.disabled = false;
        btnGrantText.textContent = 'Apply PTS Adjustment';
      }
    });
  }

  async function loadAdminLogs() {
    if (!adminLogsTbody) return;
    adminLogsTbody.innerHTML = '<tr><td colspan="7" class="table-loading">Loading live audit logs...</td></tr>';

    try {
      const res = await fetch('/api/admin/logs?limit=50');
      const data = await res.json();

      if (!data.success || !Array.isArray(data.logs) || data.logs.length === 0) {
        adminLogsTbody.innerHTML = '<tr><td colspan="7" class="table-empty">No audit events recorded yet.</td></tr>';
        return;
      }

      adminLogsTbody.innerHTML = data.logs.map(log => {
        let actionClass = 'action-grant';
        if (log.action_type === 'REPORT_APPROVE') actionClass = 'action-approve';
        else if (log.action_type === 'REPORT_DECLINE') actionClass = 'action-decline';
        else if (log.action_type === 'SHOP_PURCHASE') actionClass = 'action-purchase';
        else if (log.action_type === 'ITEM_FULFILL') actionClass = 'action-fulfill';
        else if (log.action_type === 'ITEM_REVOKE') actionClass = 'action-revoke';

        const deltaPts = log.delta_pts || 0;
        const deltaClass = deltaPts > 0 ? 'pts-plus' : (deltaPts < 0 ? 'pts-minus' : 'pts-neutral');
        const deltaText = deltaPts > 0 ? `+${deltaPts} PTS` : (deltaPts < 0 ? `${deltaPts} PTS` : '—');

        return `
          <tr>
            <td style="font-weight: 700; color: var(--text-muted);">#${log.id}</td>
            <td><span class="action-pill ${actionClass}">${log.action_type}</span></td>
            <td><span style="font-weight: 600;">${log.actor_name || 'System'}</span></td>
            <td><span style="color: var(--text);">${log.target_name || log.target_id || '—'}</span></td>
            <td class="${deltaClass}">${deltaText}</td>
            <td><span style="color: var(--text-muted); font-size: 0.84rem;">${String(log.details || '—').replace(/</g, '&lt;')}</span></td>
            <td style="font-size: 0.78rem; color: var(--text-muted); white-space: nowrap;">${log.created_at}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      adminLogsTbody.innerHTML = '<tr><td colspan="7" class="table-empty">Failed to load audit logs.</td></tr>';
    }
  }

  async function updateAdminBadges() {
    try {
      const [resSub, resInv] = await Promise.all([
        fetch('/api/admin/submissions'),
        fetch('/api/admin/inventory?status=PENDING')
      ]);
      const dataSub = await resSub.json();
      const dataInv = await resInv.json();

      if (dataSub.success && Array.isArray(dataSub.submissions) && pendingSubmissionsBadge) {
        const pendingSubs = dataSub.submissions.filter(s => s.status === 'PENDING').length;
        pendingSubmissionsBadge.textContent = pendingSubs;
        pendingSubmissionsBadge.classList.toggle('zero', pendingSubs === 0);
      }

      if (dataInv.success && Array.isArray(dataInv.inventory) && pendingFulfillmentBadge) {
        const pendingCount = dataInv.inventory.length;
        pendingFulfillmentBadge.textContent = pendingCount;
        pendingFulfillmentBadge.classList.toggle('zero', pendingCount === 0);
      }
    } catch (err) {
      console.warn('[Badge update error]:', err.message);
    }
  }

  function loadAdminData() {
    if (activeAdminTab === 'submissions') loadAdminSubmissions();
    else if (activeAdminTab === 'fulfillment') loadAdminFulfillment();
    else if (activeAdminTab === 'pts-manager') loadAdminUsers();
    else if (activeAdminTab === 'audit-logs') loadAdminLogs();
    updateAdminBadges();
  }

  if (btnRefreshAdmin) {
    btnRefreshAdmin.addEventListener('click', () => {
      loadAdminData();
    });
  }

  // Run initial authentication check
  checkAuth();
});
