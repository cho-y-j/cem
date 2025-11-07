/**
 * Admin: 회사 관리 페이지
 * Owner/BP/EP 회사 등록 및 관리
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
import { toast } from "sonner";
import { Plus, Building2, Loader2, Edit, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminCompanies() {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [companyType, setCompanyType] = useState<"owner" | "bp" | "ep">("owner");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");

  // 회사 목록 조회
  const { data: companies, isLoading } = trpc.companies.list.useQuery();

  // 회사 생성 mutation
  const createMutation = trpc.companies.create.useMutation({
    onSuccess: () => {
      toast.success("회사가 등록되었습니다.");
      utils.companies.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "회사 등록에 실패했습니다.");
    },
  });

  // 회사 수정 mutation
  const updateMutation = trpc.companies.update.useMutation({
    onSuccess: () => {
      toast.success("회사 정보가 수정되었습니다.");
      utils.companies.list.invalidate();
      setOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "회사 수정에 실패했습니다.");
    },
  });

  // 회사 삭제 mutation
  const deleteMutation = trpc.companies.delete.useMutation({
    onSuccess: () => {
      toast.success("회사가 삭제되었습니다.");
      utils.companies.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "회사 삭제에 실패했습니다.");
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setBusinessNumber("");
    setCompanyType("owner");
    setAddress("");
    setPhone("");
    setEmail("");
    setContactPerson("");
  };

  const handleEdit = (company: any) => {
    setEditingId(company.id);
    setName(company.name);
    setBusinessNumber(company.businessNumber || "");
    setCompanyType(company.companyType);
    setAddress(company.address || "");
    setPhone(company.phone || "");
    setEmail(company.email || "");
    setContactPerson(company.contactPerson || "");
    setOpen(true);
  };

  const handleDelete = (companyId: string, companyName: string) => {
    if (confirm(`"${companyName}" 회사를 삭제하시겠습니까?\n\n⚠️ 이 회사에 속한 사용자, 장비, 인력 데이터도 영향을 받을 수 있습니다.`)) {
      deleteMutation.mutate({ id: companyId });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("회사명을 입력해주세요.");
      return;
    }

    if (editingId) {
      // 수정
      updateMutation.mutate({
        id: editingId,
        name,
        businessNumber: businessNumber || undefined,
        companyType,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        contactPerson: contactPerson || undefined,
      });
    } else {
      // 생성
      createMutation.mutate({
        name,
        businessNumber: businessNumber || undefined,
        companyType,
        address: address || undefined,
        phone: phone || undefined,
        email: email || undefined,
        contactPerson: contactPerson || undefined,
      });
    }
  };

  const getCompanyTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      owner: "장비임대사업자",
      bp: "협력사 (BP)",
      ep: "시행사 (EP)",
    };
    return labels[type] || type;
  };

  const getCompanyTypeBadgeVariant = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      owner: "default",
      bp: "secondary",
      ep: "outline",
    };
    return variants[type] || "default";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">회사 관리</h1>
          <p className="text-muted-foreground mt-2">
            Owner/BP/EP 회사를 등록하고 관리합니다.
          </p>
        </div>
        <Dialog open={open} onOpenChange={(isOpen) => {
          setOpen(isOpen);
          if (!isOpen) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              회사 등록
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingId ? "회사 수정" : "회사 등록"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label htmlFor="name">회사명 *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="회사명을 입력하세요"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="company-type">회사 유형 *</Label>
                  <Select value={companyType} onValueChange={(value: any) => setCompanyType(value)}>
                    <SelectTrigger id="company-type" className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner">장비임대사업자 (Owner)</SelectItem>
                      <SelectItem value="bp">협력사 (BP)</SelectItem>
                      <SelectItem value="ep">시행사 (EP)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="business-number">사업자등록번호</Label>
                  <Input
                    id="business-number"
                    value={businessNumber}
                    onChange={(e) => setBusinessNumber(e.target.value)}
                    placeholder="123-45-67890"
                    className="mt-2"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="address">주소</Label>
                  <Input
                    id="address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="회사 주소를 입력하세요"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="phone">전화번호</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="02-1234-5678"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="email">이메일</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="company@example.com"
                    className="mt-2"
                  />
                </div>

                <div className="col-span-2">
                  <Label htmlFor="contact-person">담당자</Label>
                  <Input
                    id="contact-person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="담당자 이름"
                    className="mt-2"
                  />
                </div>
              </div>

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

      {/* 회사 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>등록된 회사 목록</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : companies && companies.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>회사명</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>사업자번호</TableHead>
                  <TableHead>전화번호</TableHead>
                  <TableHead>담당자</TableHead>
                  <TableHead>등록일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company: any) => (
                  <TableRow key={company.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {company.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getCompanyTypeBadgeVariant(company.companyType)}>
                        {getCompanyTypeLabel(company.companyType)}
                      </Badge>
                    </TableCell>
                    <TableCell>{company.businessNumber || "-"}</TableCell>
                    <TableCell>{company.phone || "-"}</TableCell>
                    <TableCell>{company.contactPerson || "-"}</TableCell>
                    <TableCell>
                      {company.createdAt
                        ? new Date(company.createdAt).toLocaleDateString("ko-KR")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(company)}
                          title="수정"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(company.id, company.name)}
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
              등록된 회사가 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

