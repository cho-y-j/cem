import { useState, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import MobileLayout from "@/components/mobile/MobileLayout";
import MobileBottomNav, { workerNavItems } from "@/components/mobile/MobileBottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  ClipboardCheck,
  ChevronRight,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

/**
 * 운전자 점검표 - 이력 페이지
 */
export default function DriverInspectionHistory() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  // 로그인 체크
  useEffect(() => {
    if (!user || user.role !== "worker") {
      setLocation("/mobile/login");
    }
  }, [user, setLocation]);

  // 배정된 장비 조회
  const { data: assignedEquipment } = trpc.mobile.worker.getMyAssignedEquipment.useQuery();

  // 점검 이력 조회
  const { data: records, isLoading } = trpc.driverInspection.getRecordsByEquipment.useQuery(
    { equipmentId: assignedEquipment?.id! },
    { enabled: !!assignedEquipment?.id }
  );

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      completed: { label: "완료", className: "bg-green-500" },
      pending: { label: "대기", className: "bg-yellow-500" },
      approved: { label: "승인", className: "bg-blue-500" },
      rejected: { label: "반려", className: "bg-red-500" },
    };
    const statusInfo = statusMap[status] || { label: status, className: "bg-gray-500" };
    return (
      <Badge className={`${statusInfo.className} text-white text-xs`}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getFrequencyBadge = (frequency: string) => {
    const frequencyMap: Record<string, { label: string; color: string }> = {
      daily: { label: "일일", color: "bg-blue-100 text-blue-800" },
      weekly: { label: "주간", color: "bg-purple-100 text-purple-800" },
      monthly: { label: "월간", color: "bg-orange-100 text-orange-800" },
    };
    const info = frequencyMap[frequency] || { label: frequency, color: "bg-gray-100 text-gray-800" };
    return (
      <Badge variant="secondary" className={`${info.color} text-xs`}>
        {info.label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <MobileLayout title="점검 이력" showMenu={false}>
        <div className="flex items-center justify-center h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="점검 이력" showMenu={false}>
      <div className="pb-24">
        {/* 헤더 */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white p-4">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 mb-2"
            onClick={() => setLocation("/mobile/driver-inspection")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
          <div className="text-2xl font-bold">점검 이력</div>
          {assignedEquipment && (
            <div className="text-sm opacity-90 mt-1">{assignedEquipment.regNum}</div>
          )}
        </div>

        {/* 이력 목록 */}
        <div className="p-4">
          {!records || records.length === 0 ? (
            <Card className="border-2 border-gray-200">
              <CardContent className="p-8 text-center">
                <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <div className="text-gray-600 mb-2">점검 이력이 없습니다</div>
                <div className="text-sm text-gray-500">
                  첫 점검을 시작해보세요
                </div>
                <Button
                  className="mt-4"
                  onClick={() => setLocation("/mobile/driver-inspection")}
                >
                  점검 시작하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {records.map((record: any) => (
                <Card
                  key={record.id}
                  className="border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/mobile/driver-inspection/history/${record.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-bold text-lg text-gray-900 mb-1">
                          {record.template?.name || "점검표"}
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {getFrequencyBadge(record.checkFrequency)}
                          {getStatusBadge(record.status)}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>

                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(record.inspectionDate), "PPP", { locale: ko })}
                      </div>
                      {record.accumulatedHours && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          누적시간: {record.accumulatedHours}h
                        </div>
                      )}
                      {record.accumulatedMileage && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          누적거리: {record.accumulatedMileage}km
                        </div>
                      )}
                    </div>

                    {record.notes && (
                      <div className="mt-2 p-2 bg-yellow-50 rounded text-sm text-gray-700">
                        <strong>특이사항:</strong> {record.notes.substring(0, 50)}
                        {record.notes.length > 50 && "..."}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <MobileBottomNav items={workerNavItems} />
    </MobileLayout>
  );
}























