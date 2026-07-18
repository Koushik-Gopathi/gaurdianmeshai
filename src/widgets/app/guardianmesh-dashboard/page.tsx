'use client';

import { useTheme, useWidgetState, useWidgetSDK } from '@nitrostack/widgets';

interface SecurityData {
  verdict: string;
  riskScore: number;
  injectionFlags: string[];
  reason: string;
  trustScore: number;
}

export default function GuardianMeshDashboard() {
  const theme = useTheme();
  const { getToolOutput } = useWidgetSDK();
  const [state, setState] = useWidgetState<{ viewMode: 'summary' | 'details' }>({
    viewMode: 'summary',
  });

  const data = getToolOutput<SecurityData>();

  if (!data) {
    return <div style={{ padding: 24, color: theme === 'dark' ? '#fff' : '#000' }}>Loading GuardianMesh dashboard...</div>;
  }

  const isDark = theme === 'dark';
  const accent = data.verdict === 'BLOCK' ? '#ef4444' : data.verdict === 'REQUIRE_APPROVAL' ? '#f59e0b' : '#10b981';

  return (
    <div style={{ padding: 24, background: isDark ? '#111827' : '#f8fafc', borderRadius: 16, color: isDark ? '#fff' : '#111827', maxWidth: 480 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0 }}>GuardianMesh AI</h3>
          <p style={{ margin: '4px 0 0', opacity: 0.8 }}>Zero-Trust decision review</p>
        </div>
        <button onClick={() => setState({ viewMode: state.viewMode === 'summary' ? 'details' : 'summary' })} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #94a3b8', background: 'transparent', color: isDark ? '#fff' : '#111827', cursor: 'pointer' }}>
          {state.viewMode === 'summary' ? 'Details' : 'Summary'}
        </button>
      </div>

      <div style={{ padding: 16, borderRadius: 12, background: accent, color: 'white' }}>
        <div style={{ fontSize: 14, opacity: 0.9 }}>Verdict</div>
        <div style={{ fontSize: 28, fontWeight: 700 }}>{data.verdict}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div style={{ padding: 12, borderRadius: 10, background: isDark ? '#1f2937' : '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Risk Score</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.riskScore}</div>
        </div>
        <div style={{ padding: 12, borderRadius: 10, background: isDark ? '#1f2937' : '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.6 }}>Trust Score</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{data.trustScore}</div>
        </div>
      </div>

      {state.viewMode === 'details' && (
        <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: isDark ? '#1f2937' : '#fff' }}>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6 }}>Reason</div>
          <div style={{ fontSize: 14 }}>{data.reason}</div>
          <div style={{ fontSize: 12, opacity: 0.6, marginTop: 10 }}>Injection Flags</div>
          <div>{data.injectionFlags.length > 0 ? data.injectionFlags.join(', ') : 'None'}</div>
        </div>
      )}
    </div>
  );
}
