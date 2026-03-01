import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User } from "@/lib/types";

// Google-style color palette — hand-picked for good contrast with white text
const AVATAR_COLORS = [
  "#1abc9c",
  "#2ecc71",
  "#3498db",
  "#9b59b6",
  "#e67e22",
  "#e74c3c",
  "#1e8bc3",
  "#2c3e50",
  "#f39c12",
  "#d35400",
  "#c0392b",
  "#16a085",
  "#27ae60",
  "#2980b9",
  "#8e44ad",
  "#f1c40f",
];

function getUserColor(userId: string): string {
  let hash = 0;
  for (const ch of userId) {
    hash = ch.charCodeAt(0) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (name.charAt(0) || "?").toUpperCase();
}

interface UserAvatarProps {
  user?: Pick<User, "id" | "display_name" | "image_url"> | null;
  size?: "sm" | "default" | "lg";
  className?: string;
}

export function UserAvatar({ user, size = "default", className }: UserAvatarProps) {
  const initials = user ? getInitials(user.display_name) : "?";
  const bgColor = user ? getUserColor(user.id) : "#94a3b8";

  return (
    <Avatar size={size} className={className}>
      {user?.image_url && (
        <AvatarImage src={user.image_url} alt={user.display_name} />
      )}
      <AvatarFallback style={{ backgroundColor: bgColor, color: "white" }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
