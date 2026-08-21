/**
 * Workspace Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
  const navUserAvatar = document.getElementById('nav-user-avatar');
  const navUserName = document.getElementById('nav-user-name');
  const navRoleBadge = document.getElementById('nav-role-badge');
  const navOrgBadge = document.getElementById('nav-org-badge');
  const ownerPortalNavBtn = document.getElementById('owner-portal-nav-btn');
  const workspaceOwnerActions = document.getElementById('workspace-owner-actions');
  const workspaceOrgName = document.getElementById('workspace-org-name');
  const workspaceOrgDesc = document.getElementById('workspace-org-desc');
  const signoutBtn = document.getElementById('signout-btn');

  // Retrieve session
  const userJson = sessionStorage.getItem('nexorian_user');
  const orgJson = sessionStorage.getItem('nexorian_active_org');
  const role = sessionStorage.getItem('nexorian_role') || 'CEO';

  if (!userJson || !orgJson) {
    // If not authenticated, redirect to sign in
    window.location.href = '/sign-in';
    return;
  }

  const user = JSON.parse(userJson);
  const org = JSON.parse(orgJson);

  // Populate Header
  if (navUserName) navUserName.textContent = user.name || 'Member';
  if (navUserAvatar) navUserAvatar.textContent = (user.name || 'U')[0].toUpperCase();
  if (navOrgBadge) navOrgBadge.textContent = org.slug ? `org: ${org.slug}` : 'Workspace';

  if (navRoleBadge) {
    navRoleBadge.textContent = role;
    navRoleBadge.className = `badge-role badge-role-${role.toLowerCase()}`;
  }

  // Populate Workspace Details
  if (workspaceOrgName) workspaceOrgName.textContent = org.name || 'Nexorian Workspace';
  if (workspaceOrgDesc) {
    workspaceOrgDesc.textContent = `Tenant scope: ${org.slug || 'internal'} • Access Level: ${role} • ${org.type || 'Engineering Workspace'}`;
  }

  // Reveal Owner Controls if role is OWNER
  if (role === 'OWNER') {
    if (ownerPortalNavBtn) ownerPortalNavBtn.hidden = false;
    if (workspaceOwnerActions) workspaceOwnerActions.hidden = false;
  }

  // Sign out handler
  if (signoutBtn) {
    signoutBtn.addEventListener('click', () => {
      sessionStorage.clear();
      window.location.href = '/';
    });
  }
});
