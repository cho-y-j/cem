import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function AdminUsers() {
  const utils = trpc.useUtils();
  const { data: users } = trpc.users.list.useQuery();

  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => { toast.success("역할이 변경되었습니다."); utils.users.list.invalidate(); },
  });

  const getRoleLabel = (role: string) => ({ admin: "관리자", owner: "임대사업자", bp: "협력사", ep: "운영사", worker: "운전자", inspector: "안전점검원" }[role] || role);

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">사용자 관리</h1><p className="text-muted-foreground">시스템 사용자 및 권한을 관리합니다.</p></div>
      <Card>
        <CardHeader><CardTitle>사용자 목록</CardTitle></CardHeader>
        <CardContent>
          {users && users.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>이름</TableHead><TableHead>이메일</TableHead><TableHead>역할</TableHead><TableHead>가입일</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.name || "-"}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(value) => updateRoleMutation.mutate({ userId: user.id, role: value as "admin" | "owner" | "bp" | "ep" | "worker" | "inspector" })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">관리자</SelectItem>
                          <SelectItem value="owner">임대사업자</SelectItem>
                          <SelectItem value="bp">협력사</SelectItem>
                          <SelectItem value="ep">운영사</SelectItem>
                          <SelectItem value="worker">운전자</SelectItem>
                          <SelectItem value="inspector">안전점검원</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{user.createdAt ? new Date(user.createdAt).toLocaleDateString("ko-KR") : "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : <div className="text-center py-8 text-muted-foreground">사용자가 없습니다.</div>}
        </CardContent>
      </Card>
    </div>
  );
}
