import React from "react";

/** Profile picture, or the person's initials on the accent colour when they haven't uploaded one. */
export default function Avatar({ user, size = 36, className = "" }) {
  const initials = (user?.name || "?")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };

  if (user?.avatar) {
    return <img src={user.avatar} alt="" style={style} className={`flex-shrink-0 rounded-full object-cover ${className}`} />;
  }
  return (
    <span style={style} className={`flex flex-shrink-0 items-center justify-center rounded-full bg-accent font-semibold text-white ${className}`}>
      {initials}
    </span>
  );
}
