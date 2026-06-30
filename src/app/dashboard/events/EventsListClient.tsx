"use client";
// src/app/dashboard/events/EventsListClient.tsx

import Link from "next/link";
import styles from "./events.module.css";

interface EventItem {
  id: string;
  name: string;
  description: string | null;
  date: Date;
  isPublic: boolean;
  status: string;
  createdBy: { name: string };
  _count: { members: number };
}

interface Props {
  events: EventItem[];
  canCreate: boolean;
}

export default function EventsListClient({ events, canCreate }: Props) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.heading}>Events</h1>
          <p className={styles.subheading}>
            {events.length === 0
              ? "No events yet"
              : `${events.length} event${events.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {canCreate && (
          <Link href="/dashboard/events/new" className={styles.createBtn}>
            + New event
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>🎉</div>
          <p className={styles.emptyTitle}>Create your first event</p>
          <p className={styles.emptyDesc}>
            Events are where photos live. Once created, you can invite members
            via a shareable link or add them manually.
          </p>
          {canCreate && (
            <Link href="/dashboard/events/new" className={styles.createBtn}>
              + Create event
            </Link>
          )}
        </div>
      ) : (
        <div className={styles.grid}>
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/dashboard/events/${event.id}`}
              className={styles.card}
            >
              <div className={styles.cardCover}>
                <span className={styles.cardCoverIcon}>📷</span>
                {event.isPublic && (
                  <span className={styles.publicBadge}>Public</span>
                )}
              </div>
              <div className={styles.cardBody}>
                <p className={styles.cardName}>{event.name}</p>
                <p className={styles.cardDate}>
                  {new Date(event.date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
                <div className={styles.cardMeta}>
                  <span>👥 {event._count.members} members</span>
                  <span className={styles.cardCreator}>
                    by {event.createdBy.name}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
