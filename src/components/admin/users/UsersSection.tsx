"use client";

import UserDetails from "./UserDetails";
import UsersList from "./UsersList";

type Props = {
  users: any[];
  user: any | null;
  openUser: (uid: string) => void;
};


export default function UsersSection({ users , user, openUser }: Props) {
  return (
    <section className="rounded-xl border p-4">
      <h2 className="text-sm font-semibold mb-3">Users</h2>
      <div className="max-w-full flex no-wrap gap-2">
        <UsersList users={users} openUser={openUser} />
        <UserDetails user={user} />
      </div>
    </section>
  );
}
