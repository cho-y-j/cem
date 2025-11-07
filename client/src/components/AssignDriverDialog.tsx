import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Loader2, User, X } from "lucide-react";
import { toast } from "sonner";

interface AssignDriverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: {
    id: string;
    regNum: string;
    equipTypeName?: string;
    assignedWorkerId?: string | null;
  };
  onSuccess?: () => void;
}

export default function AssignDriverDialog({
  open,
  onOpenChange,
  equipment,
  onSuccess,
}: AssignDriverDialogProps) {
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(
    equipment.assignedWorkerId || null
  );

  const utils = trpc.useUtils();

  // 운전자 목록 조회
  const { data: workers, isLoading: loadingWorkers } = trpc.workers.list.useQuery();

  // 현재 배정된 운전자 정보
  const currentWorker = workers?.find((w) => w.id === equipment.assignedWorkerId);

  // 운전자 배정 mutation
  const assignMutation = trpc.equipment.assignDriver.useMutation({
    onSuccess: () => {
      toast.success("운전자 배정이 완료되었습니다.");
      utils.equipment.list.invalidate();
      onOpenChange(false);
      onSuccess?.();
    },
    onError: (error) => {
      toast.error("배정 실패: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    assignMutation.mutate({
      equipmentId: equipment.id,
      workerId: selectedWorkerId,
    });
  };

  const handleRemoveDriver = () => {
    if (confirm("현재 배정된 운전자를 해제하시겠습니까?")) {
      assignMutation.mutate({
        equipmentId: equipment.id,
        workerId: null,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>운전자 배정</DialogTitle>
          <DialogDescription>
            {equipment.equipTypeName} ({equipment.regNum})에 운전자를 배정합니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 현재 배정된 운전자 */}
          {currentWorker && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      현재 배정된 운전자
                    </p>
                    <p className="text-sm text-blue-700">
                      {currentWorker.name}
                      {currentWorker.phone && ` (${currentWorker.phone})`}
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveDriver}
                  disabled={assignMutation.isPending}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* 운전자 선택 */}
          <div className="space-y-2">
            <Label htmlFor="worker">
              {currentWorker ? "새 운전자 선택" : "운전자 선택"}
            </Label>
            {loadingWorkers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedWorkerId || ""}
                onValueChange={(value) => setSelectedWorkerId(value || null)}
              >
                <SelectTrigger id="worker">
                  <SelectValue placeholder="운전자를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {workers
                    ?.filter((w) => w.phone && w.pinCode) // 핸드폰과 PIN이 있는 운전자만
                    .map((worker) => (
                      <SelectItem key={worker.id} value={worker.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{worker.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {worker.phone}
                            {worker.pinCode && ` • PIN: ${worker.pinCode}`}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">
              핸드폰 번호와 PIN 코드가 등록된 운전자만 표시됩니다.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={assignMutation.isPending}
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!selectedWorkerId || assignMutation.isPending}
            >
              {assignMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  배정 중...
                </>
              ) : (
                "배정"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

