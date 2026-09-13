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
  const betPresets = document.querySelectorAll('.bet-preset');
  const btnMaxBet = document.getElementById('btnMaxBet');
  const btnSpin = document.getElementById('btnSpin');
  const btnSpinText = document.getElementById('btnSpinText');

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

  // Leaderboard Elements
  const leaderboardTbody = document.getElementById('leaderboardTbody');
  const btnRefreshLeaderboard = document.getElementById('btnRefreshLeaderboard');

  // Lead QA Panel Elements
  const navAdminBtn = document.getElementById('navAdminBtn');
  const quickCardAdmin = document.getElementById('quickCardAdmin');
  const btnRefreshAdmin = document.getElementById('btnRefreshAdmin');
  const adminSubnavBtns = document.querySelectorAll('.admin-subnav-btn');
  const adminTabSubmissions = document.getElementById('adminTabSubmissions');
  const adminTabPtsManager = document.getElementById('adminTabPtsManager');
  const adminTabAuditLogs = document.getElementById('adminTabAuditLogs');
  const pendingSubmissionsBadge = document.getElementById('pendingSubmissionsBadge');
  const subFilterBtns = document.querySelectorAll('.sub-filter-btn');
  const adminSubmissionsTbody = document.getElementById('adminSubmissionsTbody');
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

    // Cap slot bet if needed
    if (slotBetInput && parseInt(slotBetInput.value, 10) > user.balance_pts) {
      slotBetInput.value = Math.max(1, user.balance_pts);
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
    } else if (tabName === 'admin') {
      loadAdminData();
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

  betPresets.forEach(preset => {
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

  function switchAdminTab(tab) {
    activeAdminTab = tab;
    adminSubnavBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-admin-tab') === tab);
    });
    if (adminTabSubmissions) adminTabSubmissions.style.display = (tab === 'submissions') ? 'block' : 'none';
    if (adminTabPtsManager) adminTabPtsManager.style.display = (tab === 'pts-manager') ? 'block' : 'none';
    if (adminTabAuditLogs) adminTabAuditLogs.style.display = (tab === 'audit-logs') ? 'block' : 'none';

    if (tab === 'submissions') loadAdminSubmissions();
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

  function loadAdminData() {
    if (activeAdminTab === 'submissions') loadAdminSubmissions();
    else if (activeAdminTab === 'pts-manager') loadAdminUsers();
    else if (activeAdminTab === 'audit-logs') loadAdminLogs();
  }

  if (btnRefreshAdmin) {
    btnRefreshAdmin.addEventListener('click', () => {
      loadAdminData();
    });
  }

  // Run initial authentication check
  checkAuth();
});
