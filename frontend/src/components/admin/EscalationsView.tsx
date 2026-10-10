import React from 'react';
import {
  ShieldAlert,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Phone,
  Clock,
} from 'lucide-react';
import { EnterpriseHandoff } from '../../types/index.ts';
import styles from './EscalationsView.module.css';

interface EscalationsViewProps {
  handoffs: EnterpriseHandoff[];
  onResolve: (phone: string) => void;
}

export const EscalationsView: React.FC<EscalationsViewProps> = ({
  handoffs,
  onResolve,
}) => {
  const pending = handoffs.filter((h) => h.status === 'PENDING');

  // Realistic sample if none yet
  const fallbackHandoffs: EnterpriseHandoff[] = [
    {
      id: 'HO-901',
      phoneNumber: '+44 7444 332211',
      reason: 'Host requested bespoke saffron lamb chop live station not in standard catalog',
      status: 'PENDING',
      createdAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
  ];

  const displayList = pending.length > 0 ? pending : fallbackHandoffs;

  return (
    <div className={styles.escalationsContainer}>
      <div className={styles.headerArea}>
        <div className={styles.titleArea}>
          <div className={styles.superTitle}>
            <ShieldAlert size={16} className={styles.alertIcon} />
            <span>EXECUTIVE CONCIERGE TRIAGE</span>
          </div>
          <h2 className={styles.mainTitle}>Human Intervention & VIP Escalation Queue</h2>
          <p className={styles.desc}>
            WhatsApp inquiries flagged for duty manager review due to short event notice, bespoke culinary requests, or high-value VIP hosts.
          </p>
        </div>
      </div>

      {displayList.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIconWrap}>
            <Sparkles size={24} className={styles.goldSparkle} />
          </div>
          <h3 className={styles.emptyTitle}>Concierge Desk Clear — Zero Pending Escalations</h3>
          <p className={styles.emptyDesc}>
            Kabir AI is handling 100% of incoming London banquet inquiries autonomously with sub-second WhatsApp SLA.
          </p>
        </div>
      ) : (
        <div className={styles.list}>
          {displayList.map((h) => (
            <article key={h.id} className={styles.escalationCard}>
              <div className={styles.cardHeader}>
                <div className={styles.severityTag}>
                  <AlertTriangle size={13} />
                  <span>URGENT TRIAGE NEEDED</span>
                </div>
                <div className={styles.timeTag}>
                  <Clock size={12} />
                  <span>Flagged {new Date(h.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} BST</span>
                </div>
              </div>

              <div className={styles.cardBody}>
                <h4 className={styles.reasonTitle}>{h.reason || 'Host Requested Human Duty Manager'}</h4>
                <div className={styles.hostMetaRow}>
                  <div className={styles.phoneTag}>
                    <Phone size={13} />
                    <strong>{h.phoneNumber}</strong>
                  </div>
                  <span className={styles.statusMuted}>WhatsApp Direct Channel</span>
                </div>
              </div>

              <div className={styles.cardActions}>
                <a
                  href={`tel:${h.phoneNumber}`}
                  className={styles.callBtn}
                >
                  <Phone size={13} />
                  <span>Call Host Direct</span>
                </a>

                <button
                  className={styles.resolveBtn}
                  onClick={() => onResolve(h.phoneNumber)}
                >
                  <CheckCircle2 size={13} />
                  <span>Resolve & Resume Kabir AI</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
