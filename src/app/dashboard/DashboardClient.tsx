"use client";
// src/app/dashboard/DashboardClient.tsx

import { useRouter } from "next/navigation";
import styles from "./dashboard.module.css";

interface Props {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    tenant: {
      id: string;
      name: string;
      slug: string;
      plan: string;
      createdAt: Date;
      _count: { events: number; members: number; users: number };
    };
  };
}

const ROLE_BADGE: Record<string, string> = {
  OWNER: "👑 Owner",
  ADMIN: "🛠 Admin",
  STAFF: "📷 Staff",
  VIEWER: "👁 Viewer",
};

const PLAN_COLOR: Record<string, string> = {
  FREE: "#6b7280",
  STARTER: "#0ea5e9",
  PRO: "#8b5cf6",
  ENTERPRISE: "#f59e0b",
};

export default function DashboardClient({ user }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const stats = [
    { label: "Events", value: user.tenant._count.events, icon: "🎉" },
    { label: "Members", value: user.tenant._count.members, icon: "👥" },
    { label: "Team", value: user.tenant._count.users, icon: "🧑‍💼" },
    { label: "Plan", value: user.tenant.plan, icon: "💳" },
  ];

  return (
    <div className={styles.page}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <span className={styles.logoIcon}>📸</span>
          <span className={styles.logoText}>PhotoSaaS</span>
        </div>

        <nav className={styles.nav}>
          <a href="#" className={`${styles.navItem} ${styles.navActive}`}>
            <span>🏠</span> Dashboard
          </a>
          <a href="#" className={styles.navItem}>
            <span>🎉</span> Events
          </a>
          <a href="#" className={styles.navItem}>
            <span>🖼</span> Photos
          </a>
          <a href="#" className={styles.navItem}>
            <span>👥</span> Members
          </a>
          <a href="#" className={styles.navItem}>
            <span>🧑‍💼</span> Team
          </a>
          <a href="#" className={styles.navItem}>
            <span>⚙️</span> Settings
          </a>
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userChip}>
            <div className={styles.avatar}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className={styles.userInfo}>
              <p className={styles.userName}>{user.name}</p>
              <p className={styles.userRole}>{ROLE_BADGE[user.role] || user.role}</p>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout}>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={styles.main}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h1 className={styles.heading}>
              Welcome back, {user.name.split(" ")[0]} 👋
            </h1>
            <p className={styles.headingMeta}>
              Workspace:{" "}
              <span className={styles.slugBadge}>{user.tenant.slug}</span>
            </p>
          </div>
          <div
            className={styles.planBadge}
            style={{ background: PLAN_COLOR[user.tenant.plan] + "20", color: PLAN_COLOR[user.tenant.plan] }}
          >
            {user.tenant.plan} plan
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          {stats.map((s) => (
            <div key={s.label} className={styles.statCard}>
              <div className={styles.statIcon}>{s.icon}</div>
              <div className={styles.statValue}>{s.value}</div>
              <div className={styles.statLabel}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Next steps */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>What's next</h2>
          <div className={styles.stepsList}>
            {[
              { icon: "🎉", title: "Create your first event", desc: "Add a wedding, school day, or any event to start uploading photos.", done: user.tenant._count.events > 0 },
              { icon: "📤", title: "Upload photos", desc: "Bulk upload event photos. We'll store them securely in the cloud.", done: false },
              { icon: "👥", title: "Invite members", desc: "Members can find their own photos using face recognition.", done: user.tenant._count.members > 0 },
              { icon: "🤳", title: "Enable face search", desc: "Members upload a selfie and the AI finds their photos automatically.", done: false },
            ].map((step, i) => (
              <div key={i} className={`${styles.nextStep} ${step.done ? styles.nextStepDone : ""}`}>
                <div className={styles.nextStepIcon}>{step.done ? "✅" : step.icon}</div>
                <div>
                  <p className={styles.nextStepTitle}>{step.title}</p>
                  <p className={styles.nextStepDesc}>{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tenant info */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Workspace info</h2>
          <div className={styles.infoGrid}>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Organization</span>
              <span className={styles.infoVal}>{user.tenant.name}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Workspace ID</span>
              <code className={styles.infoCode}>{user.tenant.slug}</code>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Your role</span>
              <span className={styles.infoVal}>{ROLE_BADGE[user.role]}</span>
            </div>
            <div className={styles.infoRow}>
              <span className={styles.infoKey}>Created</span>
              <span className={styles.infoVal}>
                {new Date(user.tenant.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
