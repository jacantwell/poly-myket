import React from "react";
import { Avatar } from "react-native-paper";
import type { User } from "poly-myket-shared";

const AVATAR_COLORS = [
  "#f44336", "#e91e63", "#9c27b0", "#673ab7",
  "#3f51b5", "#2196f3", "#03a9f4", "#00bcd4",
  "#009688", "#4caf50", "#8bc34a", "#cddc39",
  "#ffc107", "#ff9800", "#ff5722", "#795548",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function getInitials(name: string | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return (parts[0][0] ?? "?").toUpperCase();
}

interface UserAvatarProps {
  user?: Pick<User, "id" | "display_name" | "image_url"> | null;
  size?: number;
}

export function UserAvatar({ user, size = 40 }: UserAvatarProps) {
  if (user?.image_url) {
    return <Avatar.Image size={size} source={{ uri: user.image_url }} />;
  }

  const color = user?.id
    ? AVATAR_COLORS[hashCode(user.id) % AVATAR_COLORS.length]
    : "#9e9e9e";

  return (
    <Avatar.Text
      size={size}
      label={getInitials(user?.display_name)}
      style={{ backgroundColor: color }}
      labelStyle={{ fontSize: size * 0.4 }}
    />
  );
}
