/**
 * Nexorian Owner Portal - Enterprise Dashboard Engine
 * Implements:
 * - Top Bar: Org context, Simplified profile menu, Sign Out, Profile Drawer
 * - Fixed Sidebar Navigation: Dashboard, Projects, Workers, Teams, Access Control, Reports, Settings
 * - Overview-first Dashboard: 4 KPI Cards, Interactive SVG Trend Chart, Alerts, Recent Activity
 * - Detail-on-Demand Drawers: Projects, Workers, Teams, Owner Profile
 * - Access Control: Role Invitation Dispatch, Status Filters (Pending, Accepted, Expired, Revoked), Resend, Revoke, Copy Link
 * - Reports: Filterable Audit & Governance Logs, Before/After Diff Inspector, Self-Logging Access & Export
 * - Settings: Organization metadata & Security policies
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // STATE STORE
  // =========================================================================
  const state = {
    currentOrg: null,
    currentUser: null,
    currentView: 'dashboard',
    activeInviteStatus: 'ALL',
    timeframe: '7d',
    
    // In-memory / API synced collections
    projects: [
      {
        id: 'prj_01',
        name: 'Enterprise Multi-Tenant IAM Architecture',
        code: 'NEX-IAM-2026',
        team: 'Engineering',
        health: 'Optimal',
        progress: 88,
        lead: 'Sarah Jenkins',
        status: 'ACTIVE',
        budget: '$140,000',
        spent: '$112,000',
        description: 'Complete zero-trust role-based access control and token-isolated database federation.',
        milestones: [
          { name: 'Architecture Sign-off', done: true, date: '2026-06-15' },
          { name: 'Prisma Schema Multi-tenancy', done: true, date: '2026-07-20' },
          { name: 'Owner Portal Access Control', done: true, date: '2026-08-10' },
          { name: 'SOC-2 Compliance Attestation', done: false, date: '2026-09-01' }
        ],
        workersAssigned: ['Sarah Jenkins', 'Alex Rivera', 'Elena Rostova']
      },
      {
        id: 'prj_02',
        name: 'Cryptographic Audit & Telemetry Pipeline',
        code: 'NEX-AUD-882',
        team: 'Security Ops',
        health: 'Optimal',
        progress: 65,
        lead: 'Marcus Vance',
        status: 'ACTIVE',
        budget: '$95,000',
        spent: '$61,750',
        description: 'Tamper-evident audit logging engine capturing all administrative lifecycle events and permission changes.',
        milestones: [
          { name: 'Event Schema Standardization', done: true, date: '2026-07-01' },
          { name: 'Self-Logging Export Hook', done: true, date: '2026-08-05' },
          { name: 'Immutable GCS Mirroring', done: false, date: '2026-08-30' }
        ],
        workersAssigned: ['Marcus Vance', 'David Chen']
      },
      {
        id: 'prj_03',
        name: 'Worker Productivity & Capacity Dashboard',
        code: 'NEX-OPS-410',
        team: 'Product',
        health: 'Good',
        progress: 42,
        lead: 'Priya Sharma',
        status: 'PLANNING',
        budget: '$60,000',
        spent: '$25,200',
        description: 'High-granularity workforce analytics and task distribution visualization for organization owners.',
        milestones: [
          { name: 'Wireframing & Spec Review', done: true, date: '2026-07-28' },
          { name: 'Interactive SVG Chart Engine', done: false, date: '2026-08-25' }
        ],
        workersAssigned: ['Priya Sharma', 'Jordan Lee']
      },
      {
        id: 'prj_04',
        name: 'Legacy Cloud IAM Migration',
        code: 'NEX-MIG-104',
        team: 'Engineering',
        health: 'Completed',
        progress: 100,
        lead: 'Alex Rivera',
        status: 'COMPLETED',
        budget: '$45,000',
        spent: '$43,500',
        description: 'Decommissioned legacy directory services and unified all authentication into Nexorian.',
        milestones: [
          { name: 'User Directory Export', done: true, date: '2026-05-10' },
          { name: 'Hash Scrypt Verification', done: true, date: '2026-06-01' }
        ],
        workersAssigned: ['Alex Rivera']
      }
    ],

    workers: [
      {
        id: 'wrk_01',
        name: 'Sarah Jenkins',
        email: 'sarah.j@acme.corp',
        role: 'Staff Engineer',
        department: 'Engineering',
        clearance: 'Level 4 (Top Secret)',
        projects: ['NEX-IAM-2026'],
        status: 'ACTIVE',
        joined: '2026-01-15',
        phone: '+1 (555) 234-9812',
        skills: ['TypeScript', 'Distributed Systems', 'PostgreSQL', 'Security Architecture']
      },
      {
        id: 'wrk_02',
        name: 'Marcus Vance',
        email: 'marcus.v@acme.corp',
        role: 'Principal Security Lead',
        department: 'Security Ops',
        clearance: 'Level 5 (Executive)',
        projects: ['NEX-AUD-882'],
        status: 'ACTIVE',
        joined: '2026-02-01',
        phone: '+1 (555) 876-1234',
        skills: ['SOC-2', 'Penetration Testing', 'Cryptography', 'Audit Governance']
      },
      {
        id: 'wrk_03',
        name: 'Priya Sharma',
        email: 'priya.s@acme.corp',
        role: 'Senior Product Manager',
        department: 'Product',
        clearance: 'Level 3 (Confidential)',
        projects: ['NEX-OPS-410'],
        status: 'ACTIVE',
        joined: '2026-03-10',
        phone: '+1 (555) 456-7890',
        skills: ['Product Strategy', 'UI/UX Oversight', 'Telemetry Analytics']
      },
      {
        id: 'wrk_04',
        name: 'Alex Rivera',
        email: 'alex.r@acme.corp',
        role: 'Senior Backend Engineer',
        department: 'Engineering',
        clearance: 'Level 3 (Confidential)',
        projects: ['NEX-IAM-2026', 'NEX-MIG-104'],
        status: 'ACTIVE',
        joined: '2026-04-12',
        phone: '+1 (555) 789-0123',
        skills: ['Node.js', 'Prisma ORM', 'SQLite', 'Express API']
      },
      {
        id: 'wrk_05',
        name: 'Elena Rostova',
        email: 'elena.r@acme.corp',
        role: 'Infrastructure Architect',
        department: 'Engineering',
        clearance: 'Level 4 (Top Secret)',
        projects: ['NEX-IAM-2026'],
        status: 'ACTIVE',
        joined: '2026-05-01',
        phone: '+1 (555) 345-6789',
        skills: ['Kubernetes', 'Terraform', 'CI/CD Pipelines', 'GCP IAM']
      },
      {
        id: 'wrk_06',
        name: 'Jordan Lee',
        email: 'jordan.l@acme.corp',
        role: 'Frontend Experience Designer',
        department: 'Product',
        clearance: 'Level 2 (Internal)',
        projects: ['NEX-OPS-410'],
        status: 'ACTIVE',
        joined: '2026-05-20',
        phone: '+1 (555) 678-9012',
        skills: ['Vanilla JS', 'Design Systems', 'CSS Architecture', 'A11y']
      }
    ],

    teams: [
      {
        id: 'tm_01',
        name: 'Core Platform Engineering',
        lead: 'Sarah Jenkins',
        leadEmail: 'sarah.j@acme.corp',
        headcount: 5,
        activeProjects: ['NEX-IAM-2026', 'NEX-MIG-104'],
        workload: '85% Capacity',
        description: 'Designs and builds resilient multi-tenant identity and infrastructure backbones.'
      },
      {
        id: 'tm_02',
        name: 'Security Operations & Compliance',
        lead: 'Marcus Vance',
        leadEmail: 'marcus.v@acme.corp',
        headcount: 4,
        activeProjects: ['NEX-AUD-882'],
        workload: '70% Capacity',
        description: 'Maintains SOC-2 compliance, audit integrity, cryptographic policies, and threat surveillance.'
      },
      {
        id: 'tm_03',
        name: 'Product Design & Intelligence',
        lead: 'Priya Sharma',
        leadEmail: 'priya.s@acme.corp',
        headcount: 3,
        activeProjects: ['NEX-OPS-410'],
        workload: '60% Capacity',
        description: 'Drives portal user experience, analytics visualization, and governance workflows.'
      }
    ],

    pendingRequests: [
      {
        id: 'mem_pend_101',
        name: 'David K. Vance',
        email: 'david.vance@acme.corp',
        employeeId: 'EMP-2026-042',
        role: 'CEO',
        isEmailVerified: true,
        submittedAt: '2026-08-16T11:20:00Z',
        status: 'PENDING_APPROVAL'
      },
      {
        id: 'mem_pend_102',
        name: 'Rachel Adams',
        email: 'rachel.a@acme.corp',
        employeeId: 'EMP-2026-055',
        role: 'CEO',
        isEmailVerified: true,
        submittedAt: '2026-08-15T09:45:00Z',
        status: 'PENDING_APPROVAL'
      }
    ],

    invitations: [
      {
        id: 'inv_88a',
        email: 'executive@partner.corp',
        role: 'CEO',
        status: 'PENDING',
        token: 'nex_inv_88a10f92b7c4',
        createdAt: '2026-08-16T09:30:00Z',
        expiresAt: '2026-08-23T09:30:00Z'
      },
      {
        id: 'inv_77b',
        email: 'coo.lead@acme.corp',
        role: 'CEO',
        status: 'PENDING',
        token: 'nex_inv_77b4921f00da',
        createdAt: '2026-08-15T14:15:00Z',
        expiresAt: '2026-08-22T14:15:00Z'
      },
      {
        id: 'inv_66c',
        email: 'founder.partner@acme.corp',
        role: 'OWNER',
        status: 'ACCEPTED',
        token: 'nex_inv_66c8182f34aa',
        createdAt: '2026-08-01T11:00:00Z',
        expiresAt: '2026-08-08T11:00:00Z'
      },
      {
        id: 'inv_55d',
        email: 'temp.advisor@external.io',
        role: 'CEO',
        status: 'EXPIRED',
        token: 'nex_inv_55d3092bb4ff',
        createdAt: '2026-07-01T10:00:00Z',
        expiresAt: '2026-07-08T10:00:00Z'
      },
      {
        id: 'inv_44e',
        email: 'former.executive@legacy.com',
        role: 'CEO',
        status: 'REVOKED',
        token: 'nex_inv_44e5510aa2cc',
        createdAt: '2026-07-15T16:20:00Z',
        expiresAt: '2026-07-22T16:20:00Z'
      }
    ],

    auditLogs: [
      {
        id: 'aud_901',
        actor: { name: 'Jane Doe', email: 'jane.doe@acme.corp', role: 'OWNER', avatar: 'JD' },
        action: 'INVITATION_DISPATCHED',
        target: 'invitation:executive@partner.corp',
        timestamp: '2026-08-16T09:30:00Z',
        result: 'SUCCESS',
        diff: {
          before: null,
          after: {
            email: 'executive@partner.corp',
            role: 'CEO',
            expiresIn: '7 days',
            status: 'PENDING'
          }
        }
      },
      {
        id: 'aud_902',
        actor: { name: 'Jane Doe', email: 'jane.doe@acme.corp', role: 'OWNER', avatar: 'JD' },
        action: 'ROLE_MODIFIED',
        target: 'membership:usr_wrk02_marcus',
        timestamp: '2026-08-15T16:45:00Z',
        result: 'SUCCESS',
        diff: {
          before: { role: 'MANAGER', clearance: 'Level 4' },
          after: { role: 'ADMIN', clearance: 'Level 5 (Executive)' }
        }
      },
      {
        id: 'aud_903',
        actor: { name: 'System Security Engine', email: 'system@nexorian.internal', role: 'SYSTEM', avatar: 'SYS' },
        action: 'SECURITY_POLICY_UPDATED',
        target: 'tenant:security_policies',
        timestamp: '2026-08-14T08:00:00Z',
        result: 'SUCCESS',
        diff: {
          before: { require2FA: false, sessionTimeout: '24h' },
          after: { require2FA: true, sessionTimeout: '12h' }
        }
      },
      {
        id: 'aud_904',
        actor: { name: 'Jane Doe', email: 'jane.doe@acme.corp', role: 'OWNER', avatar: 'JD' },
        action: 'INVITATION_REVOKED',
        target: 'invitation:former.advisor@legacy.com',
        timestamp: '2026-08-12T11:20:00Z',
        result: 'SUCCESS',
        diff: {
          before: { status: 'PENDING' },
          after: { status: 'REVOKED' }
        }
      }
    ]
  };

  // =========================================================================
  // DOM REFERENCES
  // =========================================================================
  const topbarOrgName = document.getElementById('topbar-org-name');
  const topbarOrgSlug = document.getElementById('topbar-org-slug');
  const topbarOwnerName = document.getElementById('topbar-owner-name');
  const topbarOwnerRole = document.getElementById('topbar-owner-role');
  const topbarAvatarInitials = document.getElementById('topbar-avatar-initials');

  const profileDropdownTrigger = document.getElementById('profile-dropdown-trigger');
  const profileDropdownMenu = document.getElementById('profile-dropdown-menu');
  const dropdownOwnerName = document.getElementById('dropdown-owner-name');
  const dropdownOwnerEmail = document.getElementById('dropdown-owner-email');
  const openFullProfileBtn = document.getElementById('open-full-profile-btn');
  const navToSettingsBtn = document.getElementById('nav-to-settings-btn');
  const portalSignoutBtn = document.getElementById('portal-signout-btn');

  // Sidebar navigation items
  const sidebarNavItems = document.querySelectorAll('.sidebar-nav-item');
  const portalViews = document.querySelectorAll('.portal-view');

  // Drawers & Modals
  const drawerBackdrop = document.getElementById('portal-drawer-backdrop');
  const drawerOwnerProfile = document.getElementById('drawer-owner-profile');
  const drawerProjectDetail = document.getElementById('drawer-project-detail');
  const drawerWorkerDetail = document.getElementById('drawer-worker-detail');
  const modalAuditDiff = document.getElementById('modal-audit-diff');
  const toastContainer = document.getElementById('portal-toast-container');

  // =========================================================================
  // 1. INITIALIZATION & SESSION RESOLUTION
  // =========================================================================
  async function init() {
    loadSessionOrFallback();
    setupNavigation();
    setupProfileDropdown();
    setupDrawersAndModals();
    setupDashboard();
    setupProjectsView();
    setupWorkersView();
    setupTeamsView();
    setupAccessControlView();
    setupReportsView();
    setupSettingsView();

    // Fetch live data from backend if available
    await fetchLiveOrganizationData();
  }

  function loadSessionOrFallback() {
    try {
      const storedUser = sessionStorage.getItem('nexorian_user');
      const storedOrg = sessionStorage.getItem('nexorian_active_org');

      if (storedUser) {
        state.currentUser = JSON.parse(storedUser);
      } else {
        state.currentUser = {
          name: 'Jane Doe',
          email: 'jane.doe@acme.corp',
          phoneNumber: '+1 (555) 019-2834',
          githubUrl: 'https://github.com/janedoe',
          role: 'OWNER',
          isEmailVerified: true,
          joined: '2026-08-01'
        };
      }

      if (storedOrg) {
        state.currentOrg = JSON.parse(storedOrg);
      } else {
        state.currentOrg = {
          id: 'org_acme_891f',
          name: 'Acme Global Dynamics',
          slug: 'acme-global',
          type: 'Enterprise',
          country: 'United States',
          address: '100 Enterprise Way, Suite 400, San Francisco, CA 94105'
        };
      }

      renderTopBarIdentity();
    } catch (e) {
      console.warn('Session load error, fallback used', e);
    }
  }

  function renderTopBarIdentity() {
    if (state.currentOrg) {
      if (topbarOrgName) topbarOrgName.textContent = state.currentOrg.name;
      if (topbarOrgSlug) topbarOrgSlug.textContent = `org/${state.currentOrg.slug || 'primary'}`;
    }

    if (state.currentUser) {
      const initials = getInitials(state.currentUser.name);
      if (topbarAvatarInitials) topbarAvatarInitials.textContent = initials;
      if (topbarOwnerName) topbarOwnerName.textContent = state.currentUser.name;
      if (dropdownOwnerName) dropdownOwnerName.textContent = state.currentUser.name;
      if (dropdownOwnerEmail) dropdownOwnerEmail.textContent = state.currentUser.email;

      // Populate Owner Profile Drawer
      const drawerAvatar = document.getElementById('drawer-avatar-lg');
      if (drawerAvatar) drawerAvatar.textContent = initials;
      const dName = document.getElementById('drawer-owner-name-full');
      if (dName) dName.textContent = state.currentUser.name;
      const dEmail = document.getElementById('drawer-owner-email-full');
      if (dEmail) dEmail.textContent = state.currentUser.email;
      const dPhone = document.getElementById('drawer-owner-phone');
      if (dPhone) dPhone.textContent = state.currentUser.phoneNumber || '—';
      const dGithub = document.getElementById('drawer-owner-github');
      if (dGithub) dGithub.textContent = state.currentUser.githubUrl ? state.currentUser.githubUrl.replace('https://github.com/', '@') : '—';
      const dOrg = document.getElementById('drawer-owner-org-name');
      if (dOrg && state.currentOrg) dOrg.textContent = state.currentOrg.name;
      const dTenant = document.getElementById('drawer-owner-tenant-id');
      if (dTenant && state.currentOrg) dTenant.textContent = state.currentOrg.id || state.currentOrg.slug;
      const dCountry = document.getElementById('drawer-owner-country');
      if (dCountry && state.currentOrg) dCountry.textContent = state.currentOrg.country || 'United States';
      const dType = document.getElementById('drawer-owner-org-type');
      if (dType && state.currentOrg) dType.textContent = state.currentOrg.type || 'Enterprise';
      const dAddress = document.getElementById('drawer-owner-address');
      if (dAddress && state.currentOrg) dAddress.textContent = state.currentOrg.address || '100 Enterprise Way, Suite 400, San Francisco, CA 94105';
    }
  }

  async function fetchLiveOrganizationData() {
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();

      if (res.ok && data.success && data.data && data.data.length > 0) {
        const liveOrg = data.data[0];
        state.currentOrg = liveOrg;
        renderTopBarIdentity();

        // Fetch detailed members & invitations
        const memRes = await fetch(`/api/organizations/${liveOrg.id}/members`);
        const memData = await memRes.json();

        if (memRes.ok && memData.success) {
          const { invitations } = memData.data;
          if (invitations && invitations.length > 0) {
            // Merge with state invitations
            const merged = [...invitations];
            state.invitations.forEach(mockInv => {
              if (!merged.some(m => m.email === mockInv.email)) {
                merged.push(mockInv);
              }
            });
            state.invitations = merged;
            renderInvitationsTable();
          }
        }
      }
    } catch (e) {
      console.log('Using robust client-side state model', e);
    }
  }

  // =========================================================================
  // 2. NAVIGATION & VIEW ROUTING
  // =========================================================================
  function setupNavigation() {
    sidebarNavItems.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetView = btn.getAttribute('data-view');
        navigateToView(targetView);
      });
    });

    // Handle in-page links with data-view-link or data-drill
    document.querySelectorAll('[data-view-link]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.getAttribute('data-view-link');
        navigateToView(target);
      });
    });

    document.querySelectorAll('[data-drill]').forEach(card => {
      card.addEventListener('click', () => {
        const target = card.getAttribute('data-drill');
        navigateToView(target);
      });
    });

    // Hash check on load
    if (window.location.hash) {
      const hashView = window.location.hash.replace('#view-', '').replace('#', '');
      if (['dashboard', 'projects', 'workers', 'teams', 'access', 'reports', 'settings'].includes(hashView)) {
        navigateToView(hashView);
      }
    }
  }

  function navigateToView(viewName) {
    if (!viewName) return;
    state.currentView = viewName;

    // Update Sidebar Active state
    sidebarNavItems.forEach(btn => {
      const isActive = btn.getAttribute('data-view') === viewName;
      btn.classList.toggle('is-active', isActive);
    });

    // Update Views
    portalViews.forEach(view => {
      const isTarget = view.id === `view-${viewName}`;
      view.classList.toggle('is-active', isTarget);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Self-logging: Log AUDIT_LOG_ACCESSED when user navigates to Reports
    if (viewName === 'reports') {
      logAuditEvent({
        action: 'AUDIT_LOG_ACCESSED',
        target: 'system:audit_reports',
        result: 'SUCCESS',
        diff: null
      });
      renderAuditLogsTable();
    }
  }

  // =========================================================================
  // 3. TOPBAR PROFILE MENU & SIGN OUT
  // =========================================================================
  function setupProfileDropdown() {
    if (!profileDropdownTrigger || !profileDropdownMenu) return;

    profileDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = profileDropdownMenu.classList.contains('is-open');
      toggleProfileDropdown(!isOpen);
    });

    document.addEventListener('click', (e) => {
      if (!profileDropdownMenu.contains(e.target) && !profileDropdownTrigger.contains(e.target)) {
        toggleProfileDropdown(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && profileDropdownMenu.classList.contains('is-open')) {
        toggleProfileDropdown(false);
      }
    });

    if (openFullProfileBtn) {
      openFullProfileBtn.addEventListener('click', () => {
        toggleProfileDropdown(false);
        openDrawer(drawerOwnerProfile);
      });
    }

    if (navToSettingsBtn) {
      navToSettingsBtn.addEventListener('click', () => {
        toggleProfileDropdown(false);
        navigateToView('settings');
      });
    }

    if (portalSignoutBtn) {
      portalSignoutBtn.addEventListener('click', () => {
        toggleProfileDropdown(false);
        sessionStorage.clear();
        showToast('Signed out of organization. Redirecting to sign in...', 'info');
        setTimeout(() => {
          window.location.href = '/sign-in';
        }, 800);
      });
    }
  }

  function toggleProfileDropdown(open) {
    if (!profileDropdownMenu) return;
    profileDropdownMenu.classList.toggle('is-open', open);
    profileDropdownTrigger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  // =========================================================================
  // 4. DRAWERS & MODALS ENGINE
  // =========================================================================
  function setupDrawersAndModals() {
    if (drawerBackdrop) {
      drawerBackdrop.addEventListener('click', closeAllDrawersAndModals);
    }

    document.querySelectorAll('[data-close-drawer]').forEach(btn => {
      btn.addEventListener('click', closeAllDrawersAndModals);
    });

    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', closeAllDrawersAndModals);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeAllDrawersAndModals();
      }
    });
  }

  function openDrawer(drawerEl) {
    if (!drawerEl) return;
    closeAllDrawersAndModals();
    if (drawerBackdrop) drawerBackdrop.classList.add('is-open');
    drawerEl.classList.add('is-open');
  }

  function openModal(modalEl) {
    if (!modalEl) return;
    closeAllDrawersAndModals();
    if (drawerBackdrop) drawerBackdrop.classList.add('is-open');
    modalEl.classList.add('is-open');
  }

  function closeAllDrawersAndModals() {
    if (drawerBackdrop) drawerBackdrop.classList.remove('is-open');
    document.querySelectorAll('.slideover-drawer').forEach(d => d.classList.remove('is-open'));
    document.querySelectorAll('.portal-modal').forEach(m => m.classList.remove('is-open'));
  }

  // =========================================================================
  // 5. DASHBOARD VIEW (KPIs, SVG Trend Chart, Alerts, Activity)
  // =========================================================================
  function setupDashboard() {
    renderKPIs();
    renderTrendChart();
    renderRecentActivity();

    // Timeframe selector
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.timeframe = btn.getAttribute('data-range');
        renderTrendChart();
      });
    });

    const refreshBtn = document.getElementById('btn-refresh-dashboard');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        showToast('Telemetry refreshed successfully.', 'success');
        renderKPIs();
        renderTrendChart();
        renderRecentActivity();
      });
    }

    const quickInviteBtn = document.getElementById('btn-quick-invite');
    if (quickInviteBtn) {
      quickInviteBtn.addEventListener('click', () => {
        navigateToView('access');
      });
    }

    // Alert actions
    document.querySelectorAll('[data-action="view-invites"]').forEach(b => {
      b.addEventListener('click', () => navigateToView('access'));
    });
    document.querySelectorAll('[data-action="view-reports"]').forEach(b => {
      b.addEventListener('click', () => navigateToView('reports'));
    });
  }

  function renderKPIs() {
    const kpiProjects = document.getElementById('kpi-active-projects');
    const kpiWorkers = document.getElementById('kpi-total-workers');
    const kpiTeams = document.getElementById('kpi-active-teams');

    if (kpiProjects) kpiProjects.textContent = state.projects.filter(p => p.status === 'ACTIVE').length;
    if (kpiWorkers) kpiWorkers.textContent = state.workers.length;
    if (kpiTeams) kpiTeams.textContent = state.teams.length;

    // Badges in sidebar
    const bPrj = document.getElementById('badge-projects-count');
    const bWrk = document.getElementById('badge-workers-count');
    const bTms = document.getElementById('badge-teams-count');
    const bInv = document.getElementById('badge-invites-count');

    if (bPrj) bPrj.textContent = state.projects.length;
    if (bWrk) bWrk.textContent = state.workers.length;
    if (bTms) bTms.textContent = state.teams.length;
    if (bInv) bInv.textContent = state.invitations.filter(i => i.status === 'PENDING').length;
  }

  function renderTrendChart() {
    const svg = document.getElementById('portal-trend-svg');
    const tooltip = document.getElementById('chart-tooltip');
    if (!svg) return;

    // Timeframe dataset configuration
    let points = [];
    let secPoints = [];
    let labels = [];

    if (state.timeframe === '7d') {
      points = [28, 42, 36, 58, 64, 72, 85];
      secPoints = [12, 18, 14, 22, 28, 30, 34];
      labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    } else if (state.timeframe === '30d') {
      points = [20, 25, 30, 28, 35, 45, 40, 50, 62, 58, 70, 85];
      secPoints = [10, 12, 15, 14, 18, 22, 20, 25, 30, 28, 32, 38];
      labels = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8', 'W9', 'W10', 'W11', 'W12'];
    } else {
      points = [15, 25, 35, 40, 55, 68, 75, 92];
      secPoints = [8, 12, 18, 20, 28, 35, 38, 48];
      labels = ['Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    }

    const width = 800;
    const height = 200;
    const paddingX = 40;
    const paddingY = 30;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;
    const maxVal = Math.max(...points, 100);

    const stepX = chartW / (points.length - 1);

    // Build SVG path
    let pathD = '';
    let secPathD = '';
    let areaD = '';

    const coords = points.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const y = height - paddingY - (val / maxVal) * chartH;
      return { x, y, val, label: labels[idx] };
    });

    const secCoords = secPoints.map((val, idx) => {
      const x = paddingX + idx * stepX;
      const y = height - paddingY - (val / maxVal) * chartH;
      return { x, y, val };
    });

    coords.forEach((pt, i) => {
      if (i === 0) {
        pathD += `M ${pt.x} ${pt.y}`;
      } else {
        const prev = coords[i - 1];
        const cx1 = prev.x + (pt.x - prev.x) / 2;
        const cy1 = prev.y;
        const cx2 = prev.x + (pt.x - prev.x) / 2;
        const cy2 = pt.y;
        pathD += ` C ${cx1} ${cy1}, ${cx2} ${cy2}, ${pt.x} ${pt.y}`;
      }
    });

    secCoords.forEach((pt, i) => {
      if (i === 0) {
        secPathD += `M ${pt.x} ${pt.y}`;
      } else {
        secPathD += ` L ${pt.x} ${pt.y}`;
      }
    });

    areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

    // SVG elements assembly
    svg.innerHTML = `
      <defs>
        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#2563EB" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#2563EB" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <!-- Grid lines -->
      <line x1="${paddingX}" y1="${paddingY}" x2="${width - paddingX}" y2="${paddingY}" class="chart-grid-line" />
      <line x1="${paddingX}" y1="${paddingY + chartH / 2}" x2="${width - paddingX}" y2="${paddingY + chartH / 2}" class="chart-grid-line" />
      <line x1="${paddingX}" y1="${height - paddingY}" x2="${width - paddingX}" y2="${height - paddingY}" class="chart-grid-line" />

      <!-- Area Fill -->
      <path d="${areaD}" class="chart-area-fill" />

      <!-- Secondary Curve (Audit) -->
      <path d="${secPathD}" class="chart-path-secondary" />

      <!-- Primary Curve (Velocity) -->
      <path d="${pathD}" class="chart-path-primary" />

      <!-- Data Dots & X Labels -->
      ${coords.map(pt => `
        <circle cx="${pt.x}" cy="${pt.y}" r="4" fill="#FFFFFF" stroke="#2563EB" stroke-width="2.5" class="chart-dot" style="cursor: pointer;" data-val="${pt.val}" data-lbl="${pt.label}"/>
        <text x="${pt.x}" y="${height - 8}" text-anchor="middle" class="chart-axis-text">${pt.label}</text>
      `).join('')}
    `;

    // Interactive Hover on Dots
    svg.querySelectorAll('.chart-dot').forEach(dot => {
      dot.addEventListener('mouseenter', (e) => {
        const val = dot.getAttribute('data-val');
        const lbl = dot.getAttribute('data-lbl');
        if (tooltip) {
          tooltip.textContent = `${lbl}: ${val} Task Units / Velocity`;
          const rect = svg.getBoundingClientRect();
          const cx = parseFloat(dot.getAttribute('cx'));
          const cy = parseFloat(dot.getAttribute('cy'));
          const pctX = (cx / width) * 100;
          const pctY = (cy / height) * 100;
          tooltip.style.left = `${pctX}%`;
          tooltip.style.top = `${pctY}%`;
          tooltip.style.opacity = '1';
        }
      });
      dot.addEventListener('mouseleave', () => {
        if (tooltip) tooltip.style.opacity = '0';
      });
    });
  }

  function renderRecentActivity() {
    const list = document.getElementById('dashboard-activity-feed');
    if (!list) return;

    list.innerHTML = state.auditLogs.slice(0, 4).map(item => `
      <div class="activity-feed-item">
        <div class="activity-actor-avatar">${item.actor.avatar}</div>
        <div class="activity-item-details">
          <span class="activity-item-msg">
            <strong>${escapeHtml(item.actor.name)}</strong> performed 
            <code>${escapeHtml(item.action)}</code> on <em>${escapeHtml(item.target)}</em>
          </span>
          <span class="activity-item-time">${formatDate(item.timestamp)}</span>
        </div>
      </div>
    `).join('');
  }

  // =========================================================================
  // 6. PROJECTS VIEW & DETAIL DRAWER
  // =========================================================================
  function setupProjectsView() {
    renderProjectsTable();

    const searchInput = document.getElementById('project-search-input');
    const statusFilter = document.getElementById('project-status-filter');

    if (searchInput) {
      searchInput.addEventListener('input', () => renderProjectsTable());
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', () => renderProjectsTable());
    }

    const createBtn = document.getElementById('btn-create-project');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        showToast('Initiating new project wizard...', 'info');
      });
    }
  }

  function renderProjectsTable() {
    const tbody = document.getElementById('projects-tbody');
    if (!tbody) return;

    const query = (document.getElementById('project-search-input')?.value || '').toLowerCase();
    const status = document.getElementById('project-status-filter')?.value || 'ALL';

    const filtered = state.projects.filter(p => {
      const matchQuery = p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query);
      const matchStatus = status === 'ALL' || p.status === status;
      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No matching projects found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(p => `
      <tr data-project-id="${p.id}">
        <td>
          <div style="font-weight: 700; color: #0F172A;">${escapeHtml(p.name)}</div>
          <span style="font-size: 0.6875rem; font-family: monospace; color: #64748B;">${escapeHtml(p.code)}</span>
        </td>
        <td><span class="status-pill status-planning">${escapeHtml(p.team)}</span></td>
        <td><span class="status-pill status-success">${escapeHtml(p.health)}</span></td>
        <td style="min-width: 120px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <div style="flex: 1; height: 6px; background: #E2E8F0; border-radius: 3px; overflow: hidden;">
              <div style="width: ${p.progress}%; height: 100%; background: #2563EB;"></div>
            </div>
            <span style="font-size: 0.6875rem; font-weight: 700;">${p.progress}%</span>
          </div>
        </td>
        <td>${escapeHtml(p.lead)}</td>
        <td><span class="status-pill status-${p.status.toLowerCase()}">${p.status}</span></td>
        <td class="text-right">
          <button type="button" class="table-icon-btn btn-view-project" data-id="${p.id}">View Drawer</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', (e) => {
        const id = row.getAttribute('data-project-id');
        openProjectDrawer(id);
      });
    });
  }

  function openProjectDrawer(projectId) {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return;

    const body = document.getElementById('drawer-project-body');
    const title = document.getElementById('project-detail-title');
    if (title) title.textContent = project.name;

    if (body) {
      body.innerHTML = `
        <div class="drawer-meta-grid">
          <div class="meta-field-item">
            <span class="meta-field-label">Project Code</span>
            <span class="meta-field-value mono">${escapeHtml(project.code)}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Status</span>
            <span class="meta-field-value"><span class="status-pill status-${project.status.toLowerCase()}">${project.status}</span></span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Assigned Team</span>
            <span class="meta-field-value">${escapeHtml(project.team)}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Lead Worker</span>
            <span class="meta-field-value">${escapeHtml(project.lead)}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Budget Allocated</span>
            <span class="meta-field-value">${project.budget}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Current Spend</span>
            <span class="meta-field-value">${project.spent}</span>
          </div>
        </div>

        <div>
          <span class="meta-field-label" style="margin-bottom: 6px; display: block;">Description & Objectives</span>
          <p style="font-size: 0.8125rem; color: #334155; line-height: 1.5; background: #F8FAFC; padding: 12px; border-radius: 8px; border: 1px solid #E2E8F0;">
            ${escapeHtml(project.description)}
          </p>
        </div>

        <div>
          <span class="meta-field-label" style="margin-bottom: 8px; display: block;">Milestones Deliverables</span>
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${project.milestones.map(m => `
              <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 6px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span style="width: 14px; height: 14px; border-radius: 50%; background: ${m.done ? '#16A34A' : '#CBD5E1'}; display: inline-block;"></span>
                  <span style="font-size: 0.8125rem; font-weight: ${m.done ? '600' : '400'}; color: ${m.done ? '#0F172A' : '#64748B'};">${escapeHtml(m.name)}</span>
                </div>
                <span style="font-size: 0.6875rem; color: #94A3B8;">${m.date}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div>
          <span class="meta-field-label" style="margin-bottom: 8px; display: block;">Assigned Workers (${project.workersAssigned.length})</span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${project.workersAssigned.map(w => `
              <span class="status-pill status-planning">${escapeHtml(w)}</span>
            `).join('')}
          </div>
        </div>
      `;
    }

    openDrawer(drawerProjectDetail);
  }

  // =========================================================================
  // 7. WORKERS VIEW & DETAIL DRAWER
  // =========================================================================
  function setupWorkersView() {
    renderWorkersTable();

    const search = document.getElementById('worker-search-input');
    const deptFilter = document.getElementById('worker-dept-filter');

    if (search) search.addEventListener('input', () => renderWorkersTable());
    if (deptFilter) deptFilter.addEventListener('change', () => renderWorkersTable());

    const inviteBtn = document.getElementById('btn-invite-worker');
    if (inviteBtn) {
      inviteBtn.addEventListener('click', () => {
        navigateToView('access');
      });
    }
  }

  function renderWorkersTable() {
    const tbody = document.getElementById('workers-tbody');
    if (!tbody) return;

    const query = (document.getElementById('worker-search-input')?.value || '').toLowerCase();
    const dept = document.getElementById('worker-dept-filter')?.value || 'ALL';

    const filtered = state.workers.filter(w => {
      const matchQuery = w.name.toLowerCase().includes(query) || w.email.toLowerCase().includes(query);
      const matchDept = dept === 'ALL' || w.department === dept;
      return matchQuery && matchDept;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No workers found matching filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(w => `
      <tr data-worker-id="${w.id}">
        <td>
          <div style="font-weight: 700; color: #0F172A;">${escapeHtml(w.name)}</div>
          <span style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(w.email)}</span>
        </td>
        <td>${escapeHtml(w.role)}</td>
        <td><span class="status-pill status-planning">${escapeHtml(w.department)}</span></td>
        <td><span class="status-pill status-success">${escapeHtml(w.clearance)}</span></td>
        <td>${w.projects.join(', ')}</td>
        <td><span class="status-pill status-active">${w.status}</span></td>
        <td class="text-right">
          <button type="button" class="table-icon-btn">View Profile</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-worker-id');
        openWorkerDrawer(id);
      });
    });
  }

  function openWorkerDrawer(workerId) {
    const worker = state.workers.find(w => w.id === workerId);
    if (!worker) return;

    const title = document.getElementById('worker-detail-title');
    const body = document.getElementById('drawer-worker-body');
    if (title) title.textContent = `${worker.name} Profile`;

    if (body) {
      body.innerHTML = `
        <div style="display: flex; align-items: center; gap: 14px; padding-bottom: 16px; border-bottom: 1px solid #E2E8F0;">
          <div class="profile-avatar-circle" style="width: 48px; height: 48px; font-size: 1.125rem;">
            ${getInitials(worker.name)}
          </div>
          <div>
            <div style="font-size: 1rem; font-weight: 700; color: #0F172A;">${escapeHtml(worker.name)}</div>
            <div style="font-size: 0.8125rem; color: #64748B;">${escapeHtml(worker.email)}</div>
            <span class="status-pill status-active" style="margin-top: 4px;">${worker.role}</span>
          </div>
        </div>

        <div class="drawer-meta-grid">
          <div class="meta-field-item">
            <span class="meta-field-label">Department</span>
            <span class="meta-field-value">${escapeHtml(worker.department)}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Clearance Tier</span>
            <span class="meta-field-value">${escapeHtml(worker.clearance)}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Phone</span>
            <span class="meta-field-value">${escapeHtml(worker.phone)}</span>
          </div>
          <div class="meta-field-item">
            <span class="meta-field-label">Onboarding Date</span>
            <span class="meta-field-value">${worker.joined}</span>
          </div>
        </div>

        <div>
          <span class="meta-field-label" style="margin-bottom: 6px; display: block;">Skills & Competencies</span>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${worker.skills.map(s => `<span class="status-pill status-planning">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>

        <div>
          <span class="meta-field-label" style="margin-bottom: 6px; display: block;">Active Assigned Projects</span>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            ${worker.projects.map(p => `
              <div style="padding: 8px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; color: #0F172A;">
                ${escapeHtml(p)}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    openDrawer(drawerWorkerDetail);
  }

  // =========================================================================
  // 8. TEAMS VIEW
  // =========================================================================
  function setupTeamsView() {
    renderTeamsTable();

    const search = document.getElementById('team-search-input');
    if (search) search.addEventListener('input', () => renderTeamsTable());

    const createBtn = document.getElementById('btn-create-team');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        showToast('Create Team dialog initialized.', 'info');
      });
    }
  }

  function renderTeamsTable() {
    const tbody = document.getElementById('teams-tbody');
    if (!tbody) return;

    const query = (document.getElementById('team-search-input')?.value || '').toLowerCase();
    const filtered = state.teams.filter(t => t.name.toLowerCase().includes(query) || t.lead.toLowerCase().includes(query));

    tbody.innerHTML = filtered.map(t => `
      <tr>
        <td>
          <div style="font-weight: 700; color: #0F172A;">${escapeHtml(t.name)}</div>
          <span style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(t.description)}</span>
        </td>
        <td>
          <div style="font-weight: 600;">${escapeHtml(t.lead)}</div>
          <span style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(t.leadEmail)}</span>
        </td>
        <td><strong>${t.headcount}</strong> Allocated</td>
        <td>${t.activeProjects.join(', ')}</td>
        <td><span class="status-pill status-success">${t.workload}</span></td>
        <td class="text-right">
          <button type="button" class="table-icon-btn">Inspect Team</button>
        </td>
      </tr>
    `).join('');
  }

  // =========================================================================
  // 9. ACCESS CONTROL & ROLE INVITATIONS (FULL LIFECYCLE)
  // =========================================================================
  function setupAccessControlView() {
    renderPendingRequestsTable();
    renderInvitationsTable();

    // Quick Invite Form
    const inviteForm = document.getElementById('quick-invite-form');
    if (inviteForm) {
      inviteForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('quick-invite-email');
        const roleSelect = document.getElementById('quick-invite-role');
        const submitBtn = document.getElementById('quick-invite-submit-btn');

        const email = emailInput?.value.trim().toLowerCase();
        const role = roleSelect?.value || 'CEO';

        if (!email) {
          showToast('Please enter an invitee email address.', 'error');
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Dispatching...';
        }

        try {
          // Attempt API call
          if (state.currentOrg && state.currentOrg.id) {
            await fetch('/api/organizations/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                organizationId: state.currentOrg.id,
                email,
                role: role === 'OWNER' ? 'OWNER' : 'CEO'
              })
            });
          }

          // Register in state
          const newInvite = {
            id: `inv_${Math.random().toString(36).substring(2, 7)}`,
            email,
            role,
            status: 'PENDING',
            token: `nex_inv_${Math.random().toString(36).substring(2, 14)}`,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          };

          state.invitations.unshift(newInvite);

          // Audit log self-logging
          logAuditEvent({
            action: 'INVITATION_DISPATCHED',
            target: `invitation:${email}`,
            result: 'SUCCESS',
            diff: {
              before: null,
              after: { email, role, status: 'PENDING' }
            }
          });

          renderInvitationsTable();
          renderKPIs();
          showToast(`Role invitation dispatched to ${email}`, 'success');

          if (emailInput) emailInput.value = '';
        } catch (err) {
          showToast('Failed to dispatch invitation.', 'error');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Invitation';
          }
        }
      });
    }

    // Status Filter Tabs
    document.querySelectorAll('.status-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.status-tab-btn').forEach(b => {
          b.classList.remove('is-active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('is-active');
        btn.setAttribute('aria-selected', 'true');
        state.activeInviteStatus = btn.getAttribute('data-status');
        renderInvitationsTable();
      });
    });

    const searchInput = document.getElementById('invite-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => renderInvitationsTable());
    }

    const openModalBtn = document.getElementById('btn-open-invite-modal');
    if (openModalBtn) {
      openModalBtn.addEventListener('click', () => {
        document.getElementById('quick-invite-email')?.focus();
      });
    }
  }

  function renderPendingRequestsTable() {
    const tbody = document.getElementById('pending-requests-tbody');
    const badge = document.getElementById('pending-requests-count-badge');
    if (!tbody) return;

    if (badge) {
      badge.textContent = `${state.pendingRequests.length} Pending Review`;
    }

    if (state.pendingRequests.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted" style="padding: 24px;">No pending join requests awaiting review.</td></tr>`;
      return;
    }

    tbody.innerHTML = state.pendingRequests.map(req => `
      <tr data-req-id="${req.id}">
        <td>
          <div style="font-weight: 700; color: #0F172A;">${escapeHtml(req.name)}</div>
        </td>
        <td>${escapeHtml(req.email)}</td>
        <td><span class="status-pill status-planning mono" style="font-family: monospace;">${escapeHtml(req.employeeId || 'EMP-2026-088')}</span></td>
        <td><span class="status-pill status-planning">${escapeHtml(req.role)}</span></td>
        <td><span class="status-pill ${req.isEmailVerified ? 'status-success' : 'status-pending'}">${req.isEmailVerified ? 'Verified' : 'Pending'}</span></td>
        <td>${formatDate(req.submittedAt)}</td>
        <td class="text-right">
          <div class="table-action-btn-group">
            <button type="button" class="table-icon-btn btn-approve-join" data-id="${req.id}" style="color: #16A34A; border-color: #86EFAC;">
              ✓ Approve
            </button>
            <button type="button" class="table-icon-btn btn-danger-soft btn-reject-join" data-id="${req.id}">
              ✕ Reject
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-approve-join').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const req = state.pendingRequests.find(r => r.id === id);
        if (!req) return;

        try {
          await fetch('/api/organizations/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ membershipId: id })
          });
        } catch (err) {}

        state.pendingRequests = state.pendingRequests.filter(r => r.id !== id);

        // Add to active workers roster
        if (!state.workers.some(w => w.email === req.email)) {
          state.workers.push({
            id: `wrk_${Math.random().toString(36).substring(2, 6)}`,
            name: req.name,
            email: req.email,
            role: req.role === 'CEO' ? 'Executive Officer' : 'Organization Member',
            department: 'Operations',
            clearance: 'Level 3 (Confidential)',
            projects: [],
            status: 'ACTIVE',
            joined: new Date().toISOString().slice(0, 10),
            phone: '—',
            skills: ['Enterprise Onboarding', 'Verified Access']
          });
        }

        logAuditEvent({
          action: 'JOIN_REQUEST_APPROVED',
          target: `membership:${req.email}`,
          result: 'SUCCESS',
          diff: {
            before: { status: 'PENDING_APPROVAL' },
            after: { status: 'ACTIVE', role: req.role }
          }
        });

        renderPendingRequestsTable();
        renderWorkersTable();
        renderKPIs();
        showToast(`Approved ${req.name} for organization membership.`, 'success');
      });
    });

    tbody.querySelectorAll('.btn-reject-join').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const req = state.pendingRequests.find(r => r.id === id);
        if (!req) return;

        try {
          await fetch('/api/organizations/reject', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ membershipId: id })
          });
        } catch (err) {}

        state.pendingRequests = state.pendingRequests.filter(r => r.id !== id);

        logAuditEvent({
          action: 'JOIN_REQUEST_REJECTED',
          target: `membership:${req.email}`,
          result: 'SUCCESS',
          diff: {
            before: { status: 'PENDING_APPROVAL' },
            after: { status: 'REJECTED' }
          }
        });

        renderPendingRequestsTable();
        renderKPIs();
        showToast(`Join request for ${req.name} was rejected.`, 'info');
      });
    });
  }

  function renderInvitationsTable() {
    const tbody = document.getElementById('invitations-tbody');
    if (!tbody) return;

    const query = (document.getElementById('invite-search-input')?.value || '').toLowerCase();
    const status = state.activeInviteStatus;

    // Update count labels
    const cAll = document.getElementById('count-invite-all');
    const cPen = document.getElementById('count-invite-pending');
    const cAcc = document.getElementById('count-invite-accepted');
    const cExp = document.getElementById('count-invite-expired');
    const cRev = document.getElementById('count-invite-revoked');

    if (cAll) cAll.textContent = state.invitations.length;
    if (cPen) cPen.textContent = state.invitations.filter(i => i.status === 'PENDING').length;
    if (cAcc) cAcc.textContent = state.invitations.filter(i => i.status === 'ACCEPTED').length;
    if (cExp) cExp.textContent = state.invitations.filter(i => i.status === 'EXPIRED').length;
    if (cRev) cRev.textContent = state.invitations.filter(i => i.status === 'REVOKED').length;

    const filtered = state.invitations.filter(i => {
      const matchQuery = i.email.toLowerCase().includes(query) || (i.token && i.token.toLowerCase().includes(query));
      const matchStatus = status === 'ALL' || i.status === status;
      return matchQuery && matchStatus;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 24px;">No invitations in this view.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(inv => {
      const statusClass = `status-${inv.status.toLowerCase()}`;
      const isPending = inv.status === 'PENDING';
      const isRevocable = inv.status === 'PENDING';

      return `
        <tr data-invite-id="${inv.id}">
          <td>
            <div style="font-weight: 600; color: #0F172A;">${escapeHtml(inv.email)}</div>
            <span style="font-size: 0.6875rem; font-family: monospace; color: #94A3B8;">${escapeHtml(inv.token)}</span>
          </td>
          <td><span class="status-pill status-planning">${escapeHtml(inv.role)}</span></td>
          <td><span class="status-pill ${statusClass}">${inv.status}</span></td>
          <td>${formatDate(inv.createdAt)}</td>
          <td>${formatDate(inv.expiresAt)}</td>
          <td class="text-right">
            <div class="table-action-btn-group">
              <button type="button" class="table-icon-btn btn-copy-invite" data-token="${inv.token}" title="Copy Link">
                Copy Link
              </button>
              ${isPending ? `
                <button type="button" class="table-icon-btn btn-resend-invite" data-id="${inv.id}" title="Resend">
                  Resend
                </button>
              ` : ''}
              ${isRevocable ? `
                <button type="button" class="table-icon-btn btn-danger-soft btn-revoke-invite" data-id="${inv.id}" title="Revoke">
                  Revoke
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Actions Wiring
    tbody.querySelectorAll('.btn-copy-invite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const token = btn.getAttribute('data-token');
        const inviteUrl = `${window.location.origin}/join-organization?token=${token}`;
        navigator.clipboard.writeText(inviteUrl);
        showToast('Invite link copied to clipboard!', 'success');
      });
    });

    tbody.querySelectorAll('.btn-resend-invite').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const inv = state.invitations.find(i => i.id === id);
        if (!inv) return;

        try {
          await fetch(`/api/organizations/invitations/${id}/resend`, { method: 'POST' });
        } catch (e) {}

        inv.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        inv.status = 'PENDING';

        logAuditEvent({
          action: 'INVITATION_RESENT',
          target: `invitation:${inv.email}`,
          result: 'SUCCESS',
          diff: {
            before: { expiresAt: inv.expiresAt },
            after: { status: 'PENDING', refreshed: true }
          }
        });

        renderInvitationsTable();
        showToast(`Invitation refreshed and resent to ${inv.email}`, 'success');
      });
    });

    tbody.querySelectorAll('.btn-revoke-invite').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const inv = state.invitations.find(i => i.id === id);
        if (!inv) return;

        try {
          await fetch(`/api/organizations/invitations/${id}/revoke`, { method: 'POST' });
        } catch (e) {}

        inv.status = 'REVOKED';

        logAuditEvent({
          action: 'INVITATION_REVOKED',
          target: `invitation:${inv.email}`,
          result: 'SUCCESS',
          diff: {
            before: { status: 'PENDING' },
            after: { status: 'REVOKED' }
          }
        });

        renderInvitationsTable();
        renderKPIs();
        showToast(`Invitation for ${inv.email} revoked.`, 'info');
      });
    });
  }

  // =========================================================================
  // 10. REPORTS VIEW (DEDICATED AUDIT & GOVERNANCE ENGINE + DIFF VIEWER)
  // =========================================================================
  function setupReportsView() {
    renderAuditLogsTable();

    const searchInput = document.getElementById('audit-search-input');
    const actionFilter = document.getElementById('audit-action-filter');
    const resultFilter = document.getElementById('audit-result-filter');

    if (searchInput) searchInput.addEventListener('input', () => renderAuditLogsTable());
    if (actionFilter) actionFilter.addEventListener('change', () => renderAuditLogsTable());
    if (resultFilter) resultFilter.addEventListener('change', () => renderAuditLogsTable());

    const exportBtn = document.getElementById('btn-export-audit-csv');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        // Self-logging: Audit Export is explicitly logged into the audit trail!
        logAuditEvent({
          action: 'AUDIT_LOG_EXPORTED',
          target: 'system:audit_logs_csv',
          result: 'SUCCESS',
          diff: {
            before: null,
            after: { recordCount: state.auditLogs.length, format: 'CSV', timestamp: new Date().toISOString() }
          }
        });

        exportAuditLogsToCSV();
        renderAuditLogsTable();
        showToast('Audit log export generated and logged to governance trail.', 'success');
      });
    }
  }

  function renderAuditLogsTable() {
    const tbody = document.getElementById('audit-logs-tbody');
    if (!tbody) return;

    const query = (document.getElementById('audit-search-input')?.value || '').toLowerCase();
    const action = document.getElementById('audit-action-filter')?.value || 'ALL';
    const result = document.getElementById('audit-result-filter')?.value || 'ALL';

    const filtered = state.auditLogs.filter(log => {
      const matchQuery = log.actor.name.toLowerCase().includes(query) || 
                         log.actor.email.toLowerCase().includes(query) || 
                         log.target.toLowerCase().includes(query) || 
                         log.action.toLowerCase().includes(query);
      const matchAction = action === 'ALL' || log.action === action;
      const matchResult = result === 'ALL' || log.result === result;
      return matchQuery && matchAction && matchResult;
    });

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted" style="padding: 24px;">No audit events match filters.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(log => `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <div class="activity-actor-avatar" style="width: 24px; height: 24px; font-size: 0.625rem;">
              ${log.actor.avatar}
            </div>
            <div>
              <div style="font-weight: 600; color: #0F172A;">${escapeHtml(log.actor.name)}</div>
              <span style="font-size: 0.6875rem; color: #64748B;">${escapeHtml(log.actor.email)}</span>
            </div>
          </div>
        </td>
        <td><code style="font-size: 0.75rem; font-weight: 600; color: #1D4ED8;">${escapeHtml(log.action)}</code></td>
        <td><span style="font-size: 0.75rem; font-family: monospace; color: #334155;">${escapeHtml(log.target)}</span></td>
        <td style="font-size: 0.75rem; color: #64748B;">${formatDate(log.timestamp)}</td>
        <td><span class="status-pill status-${log.result.toLowerCase()}">${log.result}</span></td>
        <td class="text-right">
          ${log.diff ? `
            <button type="button" class="table-icon-btn btn-view-diff" data-log-id="${log.id}">
              Inspect Diff
            </button>
          ` : `<span style="font-size: 0.75rem; color: #94A3B8;">—</span>`}
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-view-diff').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-log-id');
        openDiffModal(id);
      });
    });
  }

  function openDiffModal(logId) {
    const log = state.auditLogs.find(l => l.id === logId);
    if (!log || !log.diff) return;

    const diffBody = document.getElementById('modal-diff-body');
    if (!diffBody) return;

    diffBody.innerHTML = `
      <div class="diff-viewer-container">
        <div class="diff-meta-strip">
          <div>
            <strong>Action:</strong> <code>${escapeHtml(log.action)}</code>
          </div>
          <div>
            <strong>Target:</strong> <code>${escapeHtml(log.target)}</code>
          </div>
          <div>
            <strong>Timestamp:</strong> ${formatDate(log.timestamp)}
          </div>
        </div>

        <div class="diff-panes-grid">
          <!-- Before Pane -->
          <div class="diff-pane diff-before">
            <div class="diff-pane-title">
              <span>BEFORE (Previous State)</span>
              <span>-</span>
            </div>
            <pre>${log.diff.before ? escapeHtml(JSON.stringify(log.diff.before, null, 2)) : '<span style="color:#94A3B8;">[Initial Creation - No Previous State]</span>'}</pre>
          </div>

          <!-- After Pane -->
          <div class="diff-pane diff-after">
            <div class="diff-pane-title">
              <span>AFTER (Applied State)</span>
              <span>+</span>
            </div>
            <pre>${escapeHtml(JSON.stringify(log.diff.after, null, 2))}</pre>
          </div>
        </div>
      </div>
    `;

    openModal(modalAuditDiff);
  }

  function exportAuditLogsToCSV() {
    const headers = ['ID', 'Actor Name', 'Actor Email', 'Action', 'Target', 'Result', 'Timestamp'];
    const rows = state.auditLogs.map(l => [
      l.id,
      `"${l.actor.name.replace(/"/g, '""')}"`,
      `"${l.actor.email.replace(/"/g, '""')}"`,
      `"${l.action}"`,
      `"${l.target}"`,
      `"${l.result}"`,
      `"${l.timestamp}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nexorian-audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // =========================================================================
  // 11. SETTINGS VIEW
  // =========================================================================
  function setupSettingsView() {
    const saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        const orgName = document.getElementById('settings-org-name')?.value;
        const orgType = document.getElementById('settings-org-type')?.value;
        const orgCountry = document.getElementById('settings-org-country')?.value;
        const orgAddress = document.getElementById('settings-org-address')?.value;

        if (state.currentOrg) {
          state.currentOrg.name = orgName;
          state.currentOrg.type = orgType;
          state.currentOrg.country = orgCountry;
          state.currentOrg.address = orgAddress;

          try {
            await fetch(`/api/organizations/${state.currentOrg.id}/details`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: orgName,
                type: orgType,
                country: orgCountry,
                address: orgAddress
              })
            });
          } catch (e) {}
        }

        renderTopBarIdentity();

        logAuditEvent({
          action: 'ORGANIZATION_SETTINGS_SAVED',
          target: `org:${state.currentOrg ? state.currentOrg.id : 'primary'}`,
          result: 'SUCCESS',
          diff: {
            before: null,
            after: { name: orgName, type: orgType, country: orgCountry }
          }
        });

        showToast('Organization settings updated successfully.', 'success');
      });
    }
  }

  // =========================================================================
  // 12. HELPER UTILITIES
  // =========================================================================
  function logAuditEvent({ action, target, result = 'SUCCESS', diff = null }) {
    const newLog = {
      id: `aud_${Math.random().toString(36).substring(2, 7)}`,
      actor: {
        name: state.currentUser ? state.currentUser.name : 'Jane Doe',
        email: state.currentUser ? state.currentUser.email : 'jane.doe@acme.corp',
        role: state.currentUser ? state.currentUser.role : 'OWNER',
        avatar: getInitials(state.currentUser ? state.currentUser.name : 'Jane Doe')
      },
      action,
      target,
      timestamp: new Date().toISOString(),
      result,
      diff
    };

    state.auditLogs.unshift(newLog);
    renderRecentActivity();
  }

  function getInitials(name) {
    if (!name) return 'OW';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  function formatDate(isoString) {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return isoString;
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function showToast(message, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `portal-toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  }

  // Run initial setup
  init();
});
