"use client";

import dynamic from "next/dynamic";

interface Props {
  userEmail: string;
  userId: string;
  userName: string;
}

// Disable SSR — App uses localStorage for theme persistence.
const App = dynamic(() => import("../App"), { ssr: false });

export default function AppClient({ userEmail, userId, userName }: Props) {
  return <App userEmail={userEmail} userId={userId} userName={userName} />;
}
