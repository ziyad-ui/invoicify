import React from "react";
import NotificationBell from "./NotificationBell.jsx";
import UserMenu from "./UserMenu.jsx";

/**
 * The one header used by the Owner, Staff and Client views: page-specific content on the left,
 * the notification bell and hamburger menu on the right.
 */
export default function TopBar({ left, loadNotifications, notificationsLink, navItems }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-4">{left}</div>
      <div className="flex items-center gap-1">
        <NotificationBell load={loadNotifications} viewAllTo={notificationsLink} />
        <UserMenu navItems={navItems} />
      </div>
    </header>
  );
}
