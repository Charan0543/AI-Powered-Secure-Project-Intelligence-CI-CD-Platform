const fs = require('fs');

// 1. Update sign-in.html
let signinContent = fs.readFileSync('c:/nexorian/sign-in.html', 'utf8');
const demoBlock = `<!-- 1-Click Demo Accounts (Two Portals Only) -->
      <div style="margin-top: 24px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px;">
        <div style="font-size: 0.75rem; font-weight: 700; color: #0F172A; text-transform: uppercase; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;">
          <span>⚡ Phase 1 Portals (1-Click Test Access)</span>
        </div>
        <p style="font-size: 0.75rem; color: #64748B; margin: 0 0 10px;">Select a persona to test its dedicated portal:</p>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button type="button" class="btn btn-sm btn-primary btn-demo-login" data-email="founder@nexorian.demo" data-pass="Founder123!" style="font-size: 0.75rem; text-align: left; padding: 8px 10px; justify-content: flex-start; height: auto;">
            👑 Founder / Owner<br><span style="font-size: 0.6875rem; opacity: 0.85; font-weight: normal;">Owner Portal (/owner-portal)</span>
          </button>
          <button type="button" class="btn btn-sm btn-secondary btn-demo-login" data-email="staff@nexorian.corp" data-pass="Staff123!" style="font-size: 0.75rem; text-align: left; padding: 8px 10px; justify-content: flex-start; border-color: #38BDF8; color: #0284C7; height: auto;">
            🛡️ Staff Verifier<br><span style="font-size: 0.6875rem; opacity: 0.85; font-weight: normal;">Staff Queue (/verifier)</span>
          </button>
        </div>
      </div>`;

signinContent = signinContent.replace(/<!-- 1-Click Demo Accounts[\s\S]*?<\/div>\s*<\/div>/, demoBlock);
fs.writeFileSync('c:/nexorian/sign-in.html', signinContent, 'utf8');
console.log('sign-in.html updated successfully');
