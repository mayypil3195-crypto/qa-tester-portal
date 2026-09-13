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
  const proofInput = document.getElementById('proofInput') || document.getElementById('proof_url');
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
  const btnDropBall = document.getElementById('btnDropBall');
  const btnDropBallText = document.getElementById('btnDropBallText');

  // Case Opening Elements
  const caseSpinnerViewport = document.getElementById('caseSpinnerViewport');
  const caseSpinnerTrack = document.getElementById('caseSpinnerTrack');
  const btnOpenCase = document.getElementById('btnOpenCase');
  const btnOpenCaseText = document.getElementById('btnOpenCaseText');
  const caseResultCard = document.getElementById('caseResultCard');
  const caseResultImg = document.getElementById('caseResultImg');
  const caseResultIcon = document.getElementById('caseResultIcon');
  const caseResultRarity = document.getElementById('caseResultRarity');
  const caseResultPoints = document.getElementById('caseResultPoints');
  const caseResultTitle = document.getElementById('caseResultTitle');
  const caseResultMessage = document.getElementById('caseResultMessage');
  const caseResultBundleBadge = document.getElementById('caseResultBundleBadge');

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
    const proof_url = proofInput ? proofInput.value.trim() : '';

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
        body: JSON.stringify({ 
          points, 
          description, 
          proof_url: proof_url || null,
          proofLink: proof_url || null 
        })
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
        if (proofInput) proofInput.value = '';
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
      <div class="card shop-card shop-item-card" data-category="${item.category}">
        ${item.image ? `
          <img src="${item.image}" alt="${item.name}" class="shop-item-img" loading="lazy" onerror="this.onerror=null; this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';" />
          <div class="shop-art-slot" style="display: none;">
            <span class="shop-art-icon">${item.icon || '📦'}</span>
          </div>
        ` : `
          <div class="shop-art-slot">
            <span class="shop-art-icon">${item.icon || '📦'}</span>
          </div>
        `}
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
      btn.addEventListener('click', () => {
        const itemId = btn.getAttribute('data-item-id');
        const item = shopCatalog.find(i => i.id === itemId);
        if (!item) return;

        const isStackable = Boolean(item.stackable || item.category === 'Consumables');
        if (isStackable) {
          openBuyModal(item);
        } else {
          executePurchase(item, 1, btn);
        }
      });
    });
  }

  // ---------------- SHOP MODAL & QUANTITY SLIDER ----------------
  const buyModal = document.getElementById('buyModal');
  const buyModalItemImg = document.getElementById('buyModalItemImg');
  const buyModalArtSlot = document.getElementById('buyModalArtSlot');
  const buyModalItemIcon = document.getElementById('buyModalItemIcon');
  const buyModalItemName = document.getElementById('buyModalItemName');
  const buyModalUnitPrice = document.getElementById('buyModalUnitPrice');
  const buyQuantityRange = document.getElementById('buyQuantityRange');
  const buyQuantityInput = document.getElementById('buyQuantityInput');
  const buyQuantityDisplay = document.getElementById('buyQuantityDisplay');
  const buyTotalCost = document.getElementById('buyTotalCost');
  const buyMaxLimitLabel = document.getElementById('buyMaxLimitLabel');
  const buyModalUserBalance = document.getElementById('buyModalUserBalance');
  const btnCancelBuyModal = document.getElementById('btnCancelBuyModal');
  const btnCancelBuyModalX = document.getElementById('btnCancelBuyModalX');
  const btnConfirmBuyModal = document.getElementById('btnConfirmBuyModal');

  let currentModalItem = null;
  let currentModalQty = 1;

  function closeBuyModal() {
    if (buyModal) {
      buyModal.style.display = 'none';
    }
    currentModalItem = null;
    currentModalQty = 1;
    if (btnConfirmBuyModal) {
      btnConfirmBuyModal.disabled = false;
      btnConfirmBuyModal.textContent = 'Confirm Purchase';
    }
  }

  function updateModalTotalCost(qty) {
    if (!currentModalItem) return;
    const userBalance = (currentUser && currentUser.balance_pts) || 0;
    const maxAffordable = Math.floor(userBalance / currentModalItem.price);
    const maxLimit = Math.max(1, Math.min(50, maxAffordable > 0 ? maxAffordable : 1));

    let sanitizedQty = parseInt(qty, 10);
    if (isNaN(sanitizedQty) || sanitizedQty < 1) sanitizedQty = 1;
    if (sanitizedQty > maxLimit) sanitizedQty = maxLimit;

    currentModalQty = sanitizedQty;
    const total = currentModalItem.price * currentModalQty;

    if (buyQuantityDisplay) buyQuantityDisplay.textContent = currentModalQty;
    if (buyQuantityInput) buyQuantityInput.value = currentModalQty;
    if (buyQuantityRange) buyQuantityRange.value = currentModalQty;
    if (buyTotalCost) buyTotalCost.textContent = total.toLocaleString();

    if (btnConfirmBuyModal) {
      btnConfirmBuyModal.disabled = (userBalance < total);
    }
  }

  function openBuyModal(item) {
    if (!buyModal || !item) return;
    currentModalItem = item;

    const userBalance = (currentUser && currentUser.balance_pts) || 0;
    const maxAffordable = Math.floor(userBalance / item.price);
    const maxLimit = Math.max(1, Math.min(50, maxAffordable > 0 ? maxAffordable : 1));

    if (buyModalItemName) buyModalItemName.textContent = item.name;
    if (buyModalUnitPrice) buyModalUnitPrice.textContent = item.price.toLocaleString();
    if (buyModalUserBalance) buyModalUserBalance.textContent = userBalance.toLocaleString();
    if (buyMaxLimitLabel) buyMaxLimitLabel.textContent = maxLimit;

    if (item.image) {
      if (buyModalItemImg) {
        buyModalItemImg.src = item.image;
        buyModalItemImg.alt = item.name;
        buyModalItemImg.style.display = 'block';
      }
      if (buyModalArtSlot) buyModalArtSlot.style.display = 'none';
    } else {
      if (buyModalItemImg) buyModalItemImg.style.display = 'none';
      if (buyModalArtSlot) {
        buyModalArtSlot.style.display = 'flex';
        if (buyModalItemIcon) buyModalItemIcon.textContent = item.icon || '📦';
      }
    }

    const canAffordOne = (userBalance >= item.price);
    if (buyQuantityRange) {
      buyQuantityRange.min = '1';
      buyQuantityRange.max = String(maxLimit);
      buyQuantityRange.value = '1';
      buyQuantityRange.disabled = !canAffordOne;
    }
    if (buyQuantityInput) {
      buyQuantityInput.min = '1';
      buyQuantityInput.max = String(maxLimit);
      buyQuantityInput.value = '1';
      buyQuantityInput.disabled = !canAffordOne;
    }

    updateModalTotalCost(1);
    buyModal.style.display = 'flex';
  }

  if (buyQuantityRange) {
    buyQuantityRange.addEventListener('input', () => {
      updateModalTotalCost(buyQuantityRange.value);
    });
  }

  if (buyQuantityInput) {
    buyQuantityInput.addEventListener('input', () => {
      updateModalTotalCost(buyQuantityInput.value);
    });
    buyQuantityInput.addEventListener('change', () => {
      updateModalTotalCost(buyQuantityInput.value);
    });
  }

  if (btnCancelBuyModal) {
    btnCancelBuyModal.addEventListener('click', closeBuyModal);
  }
  if (btnCancelBuyModalX) {
    btnCancelBuyModalX.addEventListener('click', closeBuyModal);
  }
  if (buyModal) {
    buyModal.addEventListener('click', (e) => {
      if (e.target === buyModal) closeBuyModal();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && buyModal && buyModal.style.display !== 'none') {
      closeBuyModal();
    }
  });

  if (btnConfirmBuyModal) {
    btnConfirmBuyModal.addEventListener('click', async () => {
      if (!currentModalItem) return;
      const item = currentModalItem;
      const quantity = currentModalQty;

      btnConfirmBuyModal.disabled = true;
      btnConfirmBuyModal.textContent = 'Purchasing...';

      await executePurchase(item, quantity);
      closeBuyModal();
    });
  }

  async function executePurchase(item, quantity = 1, triggerBtn = null) {
    const totalCost = item.price * quantity;
    if (currentUser && currentUser.balance_pts < totalCost) {
      showToast('error', `Insufficient PTS balance (You need ${totalCost} PTS, you have ${currentUser.balance_pts} PTS).`);
      return;
    }

    if (triggerBtn) {
      triggerBtn.disabled = true;
      triggerBtn.textContent = 'Buying...';
    }

    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: item.id, quantity })
      });
      const json = await res.json();

      if (res.ok && json.success) {
        currentUser.balance_pts = json.newBalance;
        updateUserData(currentUser);
        showToast('success', json.message);
        if (activeTab === 'inventory') {
          loadUserInventory();
        }
      } else {
        showToast('error', json.error || 'Failed to purchase item.');
      }
    } catch (err) {
      showToast('error', 'Network error during shop purchase.');
    } finally {
      if (triggerBtn) {
        triggerBtn.disabled = false;
        triggerBtn.textContent = 'Purchase';
      }
    }
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

      const regularTesters = Array.isArray(data.testers) 
        ? data.testers 
        : (Array.isArray(data.leaderboard) ? data.leaderboard.filter(t => !t.isDsq) : []);

      const dsqTesters = Array.isArray(data.disqualified) 
        ? data.disqualified 
        : (Array.isArray(data.leaderboard) ? data.leaderboard.filter(t => t.isDsq) : []);

      if (!res.ok || !data.success || (regularTesters.length === 0 && dsqTesters.length === 0)) {
        leaderboardTbody.innerHTML = '<tr><td colspan="3" class="table-empty">No tester rankings recorded yet.</td></tr>';
        return;
      }

      let rowsHtml = '';

      // 1. Render regular ranked testers
      if (regularTesters.length > 0) {
        regularTesters.forEach((tester, index) => {
          const rank = tester.rank || (index + 1);
          const isYou = currentUser && (tester.discord_id === currentUser.discord_id);
          let rankDisplay = '';
          if (rank === 1) {
            rankDisplay = '<span class="rank-pill rank-1" title="1st Place">🥇</span>';
          } else if (rank === 2) {
            rankDisplay = '<span class="rank-pill rank-2" title="2nd Place">🥈</span>';
          } else if (rank === 3) {
            rankDisplay = '<span class="rank-pill rank-3" title="3rd Place">🥉</span>';
          } else {
            rankDisplay = `<span class="rank-num">#${rank}</span>`;
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
      }

      // 2. Render Disqualified / Lead Testers at the bottom
      if (dsqTesters.length > 0) {
        rowsHtml += `
          <tr class="leaderboard-separator-row">
            <td colspan="3">
              <div class="leaderboard-separator-content">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                </svg>
                Staff &amp; Testing Leads (Disqualified)
              </div>
            </td>
          </tr>
        `;

        dsqTesters.forEach(lead => {
          const isYou = currentUser && (lead.discord_id === currentUser.discord_id);
          const avatar = lead.avatar || 'https://cdn.discordapp.com/embed/avatars/0.png';
          const cleanUsername = String(lead.username || 'Lead Tester').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          const balanceStr = Number(lead.balance_pts || 0).toLocaleString();

          rowsHtml += `
            <tr class="leaderboard-row-dsq ${isYou ? 'is-current-user' : ''}">
              <td class="td-rank">
                <span class="badge-dsq" title="Lead QA Tester (Disqualified from public rankings)">DSQ</span>
              </td>
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
      }

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

  const MAX_WAGER_LIMIT = 100;
  const MIN_WAGER_LIMIT = 1;

  // Helper to enforce wager input bounds [1, 100]
  function attachWagerLimiter(input) {
    if (!input) return;
    input.addEventListener('input', () => {
      if (input.value === '') return;
      let val = parseInt(input.value, 10);
      if (isNaN(val)) return;
      if (val > MAX_WAGER_LIMIT) {
        input.value = MAX_WAGER_LIMIT;
      } else if (val < MIN_WAGER_LIMIT && input.value.length > 0 && input.value !== '-') {
        input.value = MIN_WAGER_LIMIT;
      }
    });

    input.addEventListener('change', () => {
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < MIN_WAGER_LIMIT) {
        input.value = MIN_WAGER_LIMIT;
      } else if (val > MAX_WAGER_LIMIT) {
        input.value = MAX_WAGER_LIMIT;
      }
    });

    input.addEventListener('blur', () => {
      let val = parseInt(input.value, 10);
      if (isNaN(val) || val < MIN_WAGER_LIMIT) {
        input.value = MIN_WAGER_LIMIT;
      } else if (val > MAX_WAGER_LIMIT) {
        input.value = MAX_WAGER_LIMIT;
      }
    });
  }

  attachWagerLimiter(slotBetInput);
  attachWagerLimiter(plinkoBetInput);

  const SLOT_SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];

  slotPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      const betVal = parseInt(preset.getAttribute('data-bet'), 10);
      if (!isNaN(betVal) && slotBetInput) {
        slotBetInput.value = Math.min(MAX_WAGER_LIMIT, Math.max(MIN_WAGER_LIMIT, betVal));
      }
    });
  });

  let isSpinning = false;
  if (btnSpin) {
    btnSpin.addEventListener('click', async () => {
      if (isSpinning) return;
      const bet = parseInt(slotBetInput.value, 10);

      if (isNaN(bet) || bet < MIN_WAGER_LIMIT || bet > MAX_WAGER_LIMIT) {
        showToast('error', `Wager must be between ${MIN_WAGER_LIMIT} and ${MAX_WAGER_LIMIT} PTS.`);
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
        plinkoBetInput.value = Math.min(MAX_WAGER_LIMIT, Math.max(MIN_WAGER_LIMIT, betVal));
      }
    });
  });

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

      if (isNaN(bet) || bet < MIN_WAGER_LIMIT || bet > MAX_WAGER_LIMIT) {
        showToast('error', `Wager must be between ${MIN_WAGER_LIMIT} and ${MAX_WAGER_LIMIT} PTS.`);
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

  // ---------------- ASX CASE OPENER ROULETTE ----------------
  const CS_PREVIEW_POOL = [
    { name: '10 PTS', rarity: 'mil-spec', rarityColor: '#4b69ff', category: 'Mil-Spec', icon: '🪙' },
    { name: '15 PTS', rarity: 'mil-spec', rarityColor: '#4b69ff', category: 'Mil-Spec', icon: '🪙' },
    { name: '25 PTS', rarity: 'mil-spec', rarityColor: '#4b69ff', category: 'Mil-Spec', icon: '🪙' },
    { name: 'Magical Leaf', rarity: 'restricted', rarityColor: '#8847ff', category: 'Restricted', image: '/assets/magicleaf.webp' },
    { name: 'Stat Crystal', rarity: 'classified', rarityColor: '#d32ce6', category: 'Classified', image: '/assets/stat.webp' },
    { name: 'Modifier Prism', rarity: 'classified', rarityColor: '#d32ce6', category: 'Classified', image: '/assets/modifirer.png' },
    { name: 'Trait Reroll', rarity: 'covert', rarityColor: '#eb4b4b', category: 'Covert', image: '/assets/reroll.webp' },
    { name: 'p-chan drool', rarity: 'gold', rarityColor: '#ffd700', category: 'Special Rare', image: '/assets/special_gold.webp' }
  ];

  function renderCaseCard(item, isWinner = false) {
    let mediaHtml = '';
    if (item.image) {
      mediaHtml = `<img src="${item.image}" alt="${item.name}" class="case-card-img" />`;
    } else {
      mediaHtml = `
        <svg class="case-card-pts-svg" width="44" height="44" viewBox="0 0 24 24" fill="#fbbf24">
          <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fcd34d" stroke-width="1.5"/>
          <text x="12" y="15.5" font-size="9.5" font-weight="900" text-anchor="middle" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif">PTS</text>
        </svg>
      `;
    }

    return `
      <div class="case-item-card rarity-${item.rarity} ${isWinner ? 'is-target-card' : ''}">
        <div class="case-card-img-wrap">
          ${mediaHtml}
        </div>
        <div class="case-card-info">
          <div class="case-card-name" title="${item.name}">${item.name}</div>
          <div class="case-card-rarity" style="color: ${item.rarityColor};">${item.category || item.rarity}</div>
        </div>
        <div class="case-card-stripe" style="background-color: ${item.rarityColor};"></div>
      </div>
    `;
  }

  function initCasePreview() {
    if (!caseSpinnerTrack) return;
    const previewCards = [];
    for (let i = 0; i < 30; i++) {
      const randItem = CS_PREVIEW_POOL[Math.floor(Math.random() * CS_PREVIEW_POOL.length)];
      previewCards.push(renderCaseCard(randItem));
    }
    caseSpinnerTrack.innerHTML = previewCards.join('');
  }
  initCasePreview();

  // Shared Web Audio context & noise buffer for crisp mechanical ratchet sound
  let caseAudioCtx = null;
  let caseNoiseBuffer = null;

  function getCaseAudioContext() {
    if (!caseAudioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        caseAudioCtx = new AudioCtx();
      }
    }
    if (caseAudioCtx && caseAudioCtx.state === 'suspended') {
      caseAudioCtx.resume();
    }
    return caseAudioCtx;
  }

  function getCaseNoiseBuffer(ctx) {
    if (!caseNoiseBuffer) {
      const bufferSize = Math.floor(ctx.sampleRate * 0.05); // 50ms noise
      caseNoiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = caseNoiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
    }
    return caseNoiseBuffer;
  }

  /**
   * Rotary Ratchet Reel Tick:
   * Short high-frequency noise burst + resonant bandpass filter around 2200Hz, envelope decay 18ms.
   */
  function playRatchetTick(ctx, vol = 0.5) {
    if (!ctx) return;
    try {
      const now = ctx.currentTime;

      // 1. Noise burst
      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = getCaseNoiseBuffer(ctx);

      // Resonant bandpass filter around 2200Hz
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2200, now);
      bandpass.Q.setValueAtTime(5.5, now);

      // Envelope decay 18ms
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.08 * vol, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.018);

      noiseSource.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      noiseSource.start(now);
      noiseSource.stop(now + 0.02);

      // Subtle mechanical tooth impact (quick click)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(350, now + 0.012);
      oscGain.gain.setValueAtTime(0.035 * vol, now);
      oscGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.012);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.015);
    } catch (e) {}
  }

  /**
   * Deceleration Ticker:
   * Synchronized to the 5.5s cubic-bezier spin.
   * Starts rapid (~45ms interval) and cleanly spaces out to ~650ms near the end.
   */
  function playSpinTicker(durationMs) {
    try {
      const ctx = getCaseAudioContext();
      if (!ctx) return;

      const startTime = performance.now();
      let lastTick = 0;

      function tickLoop(now) {
        const elapsed = now - startTime;
        if (elapsed >= durationMs) return;

        const progress = Math.min(1, elapsed / durationMs);
        // Exponential deceleration curve matching cubic-bezier(0.12, 0.8, 0.2, 1)
        const tickInterval = 45 + Math.pow(progress, 3.4) * 620;

        if (now - lastTick >= tickInterval) {
          lastTick = now;
          // Dynamic volume slightly drops as wheel winds down
          const dynamicVol = Math.max(0.25, 1 - progress * 0.35);
          playRatchetTick(ctx, dynamicVol);
        }

        requestAnimationFrame(tickLoop);
      }

      requestAnimationFrame(tickLoop);
    } catch (e) {}
  }

  /**
   * Subtle punchy bass thud on land (kick at 60Hz fading down)
   */
  function playLandThud(ctx) {
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(60, now);
      osc.frequency.exponentialRampToValueAtTime(24, now + 0.20);

      gain.gain.setValueAtTime(0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {}
  }

  /**
   * Energetic ascending two-tone fanfare for Covert (Red)
   */
  function playCovertFanfare(ctx) {
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 440.00, start: 0.05, dur: 0.16 }, // A4
        { freq: 659.25, start: 0.22, dur: 0.45 }  // E5
      ];

      notes.forEach(({ freq, start, dur }) => {
        const t = now + start;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.22, t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + dur + 0.05);
      });
    } catch (e) {}
  }

  /**
   * Glorious synth chime / shimmer chord for Gold (★)
   * Arpeggiated major triad with sine oscillators and light vibrato
   */
  function playGoldShimmerChord(ctx) {
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const notes = [
        { freq: 523.25, delay: 0.00 }, // C5
        { freq: 659.25, delay: 0.09 }, // E5
        { freq: 783.99, delay: 0.18 }, // G5
        { freq: 1046.50, delay: 0.27 }, // C6
        { freq: 1318.51, delay: 0.36 }  // E6 shimmer
      ];

      notes.forEach(({ freq, delay }) => {
        const t = now + delay;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);

        // Light vibrato via LFO
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(5.5, t);
        lfoGain.gain.setValueAtTime(5.0, t); // 5Hz depth

        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        // Envelope: smooth attack, long golden tail (~1.8s)
        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.16, t + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);

        osc.connect(gain);
        gain.connect(ctx.destination);

        lfo.start(t);
        osc.start(t);

        lfo.stop(t + 1.85);
        osc.stop(t + 1.85);
      });
    } catch (e) {}
  }

  let isCaseSpinning = false;

  async function openCaseRoulette() {
    if (isCaseSpinning) return;
    const cost = 50;

    if (currentUser && currentUser.balance_pts < cost) {
      showToast('error', `Insufficient PTS balance (Cost: ${cost} PTS, you have ${currentUser.balance_pts} PTS).`);
      return;
    }

    // Initialize or resume audio context on user gesture
    const audioCtx = getCaseAudioContext();

    isCaseSpinning = true;
    if (btnOpenCase) btnOpenCase.disabled = true;
    if (btnOpenCaseText) btnOpenCaseText.textContent = 'OPENING CASE...';
    if (caseResultCard) caseResultCard.style.display = 'none';

    // Reset track position instantly without transition
    if (caseSpinnerTrack) {
      caseSpinnerTrack.style.transition = 'none';
      caseSpinnerTrack.style.transform = 'translateX(0px)';
      void caseSpinnerTrack.offsetHeight;
    }

    try {
      const res = await fetch('/api/casino/open-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        showToast('error', json.error || 'Failed to open case.');
        isCaseSpinning = false;
        if (btnOpenCase) btnOpenCase.disabled = false;
        if (btnOpenCaseText) btnOpenCaseText.textContent = 'UNLOCK CASE (50 PTS)';
        return;
      }

      const tape = Array.isArray(json.tape) ? json.tape : [];
      const winningIndex = json.winningIndex !== undefined ? json.winningIndex : 35;
      const winner = json.winner;

      if (caseSpinnerTrack) {
        caseSpinnerTrack.innerHTML = tape.map((item, idx) => renderCaseCard(item, idx === winningIndex)).join('');
      }

      // Calculate pixel-perfect alignment
      const viewportWidth = caseSpinnerViewport ? caseSpinnerViewport.getBoundingClientRect().width : 780;
      const cardWidth = 140; // 130px width + 10px margin
      // Random jitter between -26px and +26px (within card boundaries)
      const randomJitter = Math.floor(Math.random() * 52) - 26;
      const targetOffset = (winningIndex * cardWidth) - (viewportWidth / 2) + (cardWidth / 2) + randomJitter;

      // Animate carousel track using cubic-bezier
      requestAnimationFrame(() => {
        if (!caseSpinnerTrack) return;
        caseSpinnerTrack.style.transition = 'transform 5.5s cubic-bezier(0.12, 0.8, 0.2, 1)';
        caseSpinnerTrack.style.transform = `translateX(-${targetOffset}px)`;
      });

      // Sound ticker effect with mechanical ratchet deceleration
      playSpinTicker(5500);

      // On animation complete (5.5s)
      setTimeout(() => {
        // Highlight winning card
        if (caseSpinnerTrack) {
          const cards = caseSpinnerTrack.querySelectorAll('.case-item-card');
          if (cards[winningIndex]) {
            cards[winningIndex].classList.add('winner-highlight');
          }
        }

        // Play land audio: subtle punchy bass thud
        if (audioCtx) {
          playLandThud(audioCtx);
        }

        // Play victory stingers
        if (winner.rarity === 'gold') {
          if (audioCtx) playGoldShimmerChord(audioCtx);
        } else if (winner.rarity === 'covert') {
          if (audioCtx) playCovertFanfare(audioCtx);
        }

        // Update user balance
        currentUser.balance_pts = json.newBalance;
        updateUserData(currentUser);

        // Populate result card
        if (caseResultCard) {
          if (winner.image) {
            caseResultImg.src = winner.image;
            caseResultImg.alt = winner.name;
            caseResultImg.style.display = 'block';
            caseResultIcon.style.display = 'none';
          } else {
            caseResultImg.style.display = 'none';
            caseResultIcon.innerHTML = `
              <svg class="pts-icon-lg" width="48" height="48" viewBox="0 0 24 24" fill="#fbbf24">
                <circle cx="12" cy="12" r="10" fill="#f59e0b" stroke="#fcd34d" stroke-width="1.5"/>
                <text x="12" y="15.5" font-size="9.5" font-weight="900" text-anchor="middle" fill="#0f172a" font-family="system-ui, -apple-system, sans-serif">PTS</text>
              </svg>
            `;
            caseResultIcon.style.display = 'block';
          }

          caseResultRarity.textContent = winner.category || winner.rarity;
          caseResultRarity.style.backgroundColor = winner.rarityColor || '#4b69ff';

          if (json.itemAwarded) {
            caseResultPoints.textContent = `🎁 ITEM UNLOCKED`;
            caseResultPoints.style.color = '#a855f7';
          } else if (winner.rarity === 'gold') {
            caseResultPoints.textContent = `+${json.rewardPts} PTS`;
            caseResultPoints.style.color = '#ffd700';
          } else {
            caseResultPoints.textContent = `+${json.rewardPts} PTS (Net: ${json.netChange >= 0 ? '+' : ''}${json.netChange})`;
            caseResultPoints.style.color = '#10b981';
          }

          caseResultTitle.textContent = winner.name;
          caseResultMessage.textContent = json.message;

          if (caseResultBundleBadge) {
            if (json.bundleAwarded) {
              caseResultBundleBadge.style.display = 'inline-block';
              caseResultBundleBadge.textContent = `🎁 ${json.bundleAwarded.toUpperCase()} QUEUED`;
            } else {
              caseResultBundleBadge.style.display = 'none';
            }
          }

          caseResultCard.style.display = 'block';
          caseResultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        showToast(winner.rarity === 'gold' ? 'success' : 'info', json.message);

        isCaseSpinning = false;
        if (btnOpenCase) btnOpenCase.disabled = false;
        if (btnOpenCaseText) btnOpenCaseText.textContent = 'UNLOCK CASE (50 PTS)';
      }, 5550);

    } catch (err) {
      console.error('[Case Opening Error]:', err);
      showToast('error', 'Network error while opening case.');
      isCaseSpinning = false;
      if (btnOpenCase) btnOpenCase.disabled = false;
      if (btnOpenCaseText) btnOpenCaseText.textContent = 'UNLOCK CASE (50 PTS)';
    }
  }

  if (btnOpenCase) {
    btnOpenCase.addEventListener('click', openCaseRoulette);
  }

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
      let proofHtml = '<span style="color: var(--text-muted); font-size: 0.8rem;">None</span>';
      if (sub.proof_url) {
        const urls = String(sub.proof_url)
          .split(/[\r\n,]+/)
          .map(u => u.trim())
          .filter(u => u.length > 0 && (u.startsWith('http://') || u.startsWith('https://')));

        if (urls.length === 1) {
          proofHtml = `<a href="${urls[0]}" target="_blank" rel="noopener noreferrer" class="proof-pill">Proof Link</a>`;
        } else if (urls.length > 1) {
          proofHtml = `
            <div class="proof-pills-wrap">
              ${urls.map((url, idx) => `
                <a href="${url}" target="_blank" rel="noopener noreferrer" class="proof-pill" title="${url}">Proof ${idx + 1}</a>
              `).join('')}
            </div>
          `;
        }
      }

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
