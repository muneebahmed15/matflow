import { requireStaffSessionForPage } from '@/lib/auth/staff'
import { listMembers } from '@/services/members'
import MembersTable from '@/components/members/MembersTable'

export default async function MembersPage() {
  const auth = await requireStaffSessionForPage()
  const members = await listMembers(auth.gymId)

  return <MembersTable members={members} />
}
