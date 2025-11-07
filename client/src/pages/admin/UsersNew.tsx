/**
 * Admin: 사용자 관리 페이지 (개선 버전)
 * - 회사 선택 기능 추가
 * - 사용자 등록 기능 추가
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Loader2, UserPlus, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminUsersNew() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("all"); // 역할별 필터 탭
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "owner" | "bp" | "ep" | "inspector">("owner");
  const [companyId, setCompanyId] = useState("");
  const [pin, setPin] = useState("0000"); // Inspector/Worker용 PIN

  // 사용자 목록 조회
  const { data: users, isLoading: loadingUsers } = trpc.users.list.useQuery();

  // 회사 목록 조회
  const { data: companies } = trpc.companies.list.useQuery();

  // 역할 변경 mutation
  const updateRoleMutation = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("역할이 변경되었습니다.");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "역할 변경에 실패했습니다.");
    },
  });

  // 사용자 생성 mutation
  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => {
      toast.success("사용자가 생성되었습니다.");
      utils.users.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "사용자 생성에 실패했습니다.");
    },
  });

  // 사용자 수정 mutation
  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => {
      toast.success("사용자 정보가 수정되었습니다.");
      utils.users.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "사용자 수정에 실패했습니다.");
    },
  });

  // 사용자 삭제 mutation
  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => {
      toast.success("사용자가 삭제되었습니다.");
      utils.users.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "사용자 삭제에 실패했습니다.");
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("owner");
    setCompanyId("");
    setPin("0000");
  };

  const handleEdit = (user: any) => {
    setEditingId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword(""); // 비밀번호는 비워둠
    setRole(user.role);
    setCompanyId(user.companyId || "");
    setPin(user.pin || "0000");
    setOpen(true);
  };

  const handleDelete = (userId: string, userName: string) => {
    if (confirm(`"${userName}" 사용자를 삭제하시겠습니까?`)) {
      deleteMutation.mutate({ id: userId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("이름을 입력해주세요.");
      return;
    }

    if (!email.trim()) {
      toast.error("이메일을 입력해주세요.");
      return;
    }

    // 수정 시에는 비밀번호 선택적
    if (!editingId && !password.trim()) {
      toast.error("비밀번호를 입력해주세요.");
      return;
    }

    if (!companyId && role !== "admin") {
      toast.error("회사를 선택해주세요.");
      return;
    }

    // Inspector는 PIN 필수
    if (role === "inspector" && !pin.trim()) {
      toast.error("PIN 번호를 입력해주세요.");
      return;
    }

    if (role === "inspector" && pin.length !== 4) {
      toast.error("PIN은 4자리 숫자여야 합니다.");
      return;
    }

    if (editingId) {
      // 수정
      updateMutation.mutate({
        id: editingId,
        name,
        email,
        password: password || undefined, // 비밀번호가 있으면 변경
        role,
        companyId: companyId || undefined,
        pin: role === "inspector" ? pin : undefined,
      });
    } else {
      // 생성
      createMutation.mutate({
        name,
        email,
        password,
        role,
        companyId: companyId || undefined,
        pin: role === "inspector" ? pin : undefined,
      });
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "관리자",
      owner: "장비임대사업자",
      bp: "협력사",
      ep: "시행사",
      worker: "운전자",
      inspector: "안전점검원",
    };
    return labels[role] || role;
  };

  const getRoleBadgeVariant = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      admin: "destructive",
      owner: "default",
      bp: "secondary",
      ep: "outline",
      worker: "secondary",
      inspector: "outline",
    };
    return variants[role] || "default";
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "-";
    const company = companies?.find((c: any) => c.id === companyId);
    return company?.name || "-";
  };

  // 역할별로 필터링된 회사 목록 (camelCase로 변환됨)
  const filteredCompanies = companies?.filter((company: any) => {
    if (role === "owner") return company.companyType === "owner";
    if (role === "bp") return company.companyType === "bp";
    if (role === "ep") return company.companyType === "ep";
    // worker, inspector도 각자의 회사 타입으로 필터링
    return true;
  });

  // 디버깅용: 회사 목록과 필터링 결과 확인
  console.log('[UsersNew] Companies:', companies);
  console.log('[UsersNew] Current role:', role);
  console.log('[UsersNew] Filtered companies:', filteredCompanies);

  // 역할별로 필터링된 사용자 목록
  const filteredUsers = selectedTab === "all"
    ? users
    : users?.filter((user: any) => user.role === selectedTab);

  // 역할별 카운트
  const getRoleCount = (roleFilter: string) => {
    if (roleFilter === "all") return users?.length || 0;
    return users?.filter((user: any) => user.role === roleFilter).length || 0;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">사용자 관리</h1>
          <p className="text-muted-foreground mt-2">
            시스템 사용자 및 권한을 관리합니다.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              사용자 등록
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "사용자 수정" : "사용자 등록"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="이름을 입력하세요"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="email">이메일 *</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="role">역할 *</Label>
                <Select value={role} onValueChange={(value: any) => {
                  setRole(value);
                  setCompanyId(""); // 역할 변경 시 회사 선택 초기화
                }}>
                  <SelectTrigger id="role" className="mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">시스템 관리자 (Admin)</SelectItem>
                    <SelectItem value="owner">장비임대사업자 (Owner)</SelectItem>
                    <SelectItem value="bp">협력사 (BP)</SelectItem>
                    <SelectItem value="ep">시행사 (EP)</SelectItem>
                    <SelectItem value="inspector">안전점검원 (Inspector)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  ℹ️ 운전자(Worker)는 Owner의 "인력 관리"에서 등록하세요.
                </p>
              </div>

              {role === "inspector" && (
                <div>
                  <Label htmlFor="pin">PIN 번호 (4자리) *</Label>
                  <Input
                    id="pin"
                    type="text"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/[^0-9]/g, "");
                      setPin(value);
                    }}
                    placeholder="0000"
                    className="mt-2"
                  />
                  <p className="text-sm text-muted-foreground mt-2">
                    모바일 로그인 시 사용할 4자리 PIN 번호입니다. (기본값: 0000)
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="password">
                  비밀번호 {editingId ? "(변경 시에만 입력)" : "*"}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingId ? "변경하지 않으려면 비워두세요" : "최소 6자 이상"}
                  className="mt-2"
                />
              </div>

              {role !== "admin" && (
                <div>
                  <Label htmlFor="company">소속 회사 *</Label>
                  <Select value={companyId} onValueChange={setCompanyId}>
                    <SelectTrigger id="company" className="mt-2">
                      <SelectValue placeholder="회사를 선택하세요" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCompanies?.map((company: any) => (
                        <SelectItem key={company.id} value={company.id}>
                          {company.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {role === "owner" && "Owner 회사만 표시됩니다."}
                    {role === "bp" && "BP 회사만 표시됩니다."}
                    {role === "ep" && "EP 회사만 표시됩니다."}
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpen(false)}
                  className="flex-1"
                >
                  취소
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1"
                >
                  {(createMutation.isPending || updateMutation.isPending) ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {editingId ? "수정 중..." : "등록 중..."}
                    </>
                  ) : (
                    editingId ? "수정" : "등록"
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 사용자 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>사용자 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="all">
                전체 ({getRoleCount("all")})
              </TabsTrigger>
              <TabsTrigger value="admin">
                관리자 ({getRoleCount("admin")})
              </TabsTrigger>
              <TabsTrigger value="owner">
                Owner ({getRoleCount("owner")})
              </TabsTrigger>
              <TabsTrigger value="bp">
                BP ({getRoleCount("bp")})
              </TabsTrigger>
              <TabsTrigger value="ep">
                EP ({getRoleCount("ep")})
              </TabsTrigger>
              <TabsTrigger value="worker">
                운전자 ({getRoleCount("worker")})
              </TabsTrigger>
              <TabsTrigger value="inspector">
                점검원 ({getRoleCount("inspector")})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={selectedTab} className="mt-6">
              {loadingUsers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : filteredUsers && filteredUsers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead>이메일</TableHead>
                      <TableHead>역할</TableHead>
                      <TableHead>소속 회사</TableHead>
                      <TableHead>가입일</TableHead>
                      <TableHead className="text-right">작업</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user: any) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name || "-"}</TableCell>
                        <TableCell>{user.email || "-"}</TableCell>
                        <TableCell>
                          <Select
                            value={user.role}
                            onValueChange={(value) =>
                              updateRoleMutation.mutate({
                                userId: user.id,
                                role: value as any,
                              })
                            }
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue>
                                <Badge variant={getRoleBadgeVariant(user.role)}>
                                  {getRoleLabel(user.role)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">관리자</SelectItem>
                              <SelectItem value="owner">장비임대사업자</SelectItem>
                              <SelectItem value="bp">협력사</SelectItem>
                              <SelectItem value="ep">시행사</SelectItem>
                              <SelectItem value="worker">운전자</SelectItem>
                              <SelectItem value="inspector">안전점검원</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>{getCompanyName(user.companyId)}</TableCell>
                        <TableCell>
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString("ko-KR")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(user)}
                              title="수정"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(user.id, user.name)}
                              disabled={deleteMutation.isPending}
                              title="삭제"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {selectedTab === "all"
                    ? "사용자가 없습니다."
                    : `${getRoleLabel(selectedTab)} 역할의 사용자가 없습니다.`}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* 안내 메시지 */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <p className="text-sm text-blue-900">
            <strong>사용자 등록 방법:</strong> 먼저 <strong>회사 관리</strong>에서 Owner/BP/EP 회사를 등록한 후,
            Supabase Auth를 통해 사용자를 초대하고 여기서 역할과 회사를 할당하세요.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

