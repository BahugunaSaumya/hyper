import { Th, Td } from "@/components/ui/Table";
import { formatIST } from "@/lib/time";

type Props = {
  users: any[];
  openUser: (uid: string) => void;
}; 

export default function UsersList({ users, openUser }: Props) {
  return (
    <table className="w-1/2 text-sm rounded border">
      <thead className="bg-gray-50 rounded">
        <tr>
          <Th>Name</Th>
          <Th>Email</Th>
          <Th>Phone</Th>
          <Th>Joined</Th>
          <Th>Details</Th>
        </tr>
      </thead>
      <tbody>
        {users.map(u => (
          <tr key={u.id}>
            <Td>{u?.first_name + ' ' + u?.last_name || "—"}</Td>
            <Td>{u?.email || ''}</Td>
            <Td>{u?.mobile || "—"}</Td>
            <Td>{new Date(u?.created_at).toLocaleDateString()}</Td>
            <Td>
              <button
                onClick={() => openUser(u.id)} 
                className="text-xs px-3 py-1 rounded-full border hover:bg-black hover:text-white"
              >
                Open
            </button>
            </Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
