import React from "react";
import NotificationBell from "./NotificationBell.jsx";
import UserMenu from "./UserMenu.jsx";
import { IconMenu } from "./icons.jsx";

/**
 * The one header used by Owner, Staff and Client: (mobile menu button +) page content on the left,
 * the notification bell and hamburger menu on the right.
 */
export default function TopBar({ left, loadNotifications, notificationsLink, onMenuClick }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 flex-shrink-0 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        {onMenuClick && (
          <button
            type="button"
            onClick={onMenuClick}
            aria-label="Open navigation"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-ink lg:hidden"
          >
            <IconMenu width={20} height={20} />
          </button>
        )}
        {left}
      </div>
      <div className="flex items-center gap-1">
        <NotificationBell load={loadNotifications} viewAllTo={notificationsLink} />
        <UserMenu />
      </div>
    </header>
  );
}
