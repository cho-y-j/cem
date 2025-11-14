import { Home, ClipboardCheck, FileText, History, Settings } from "lucide-react";
import { useLocation } from "wouter";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  exact?: boolean;
  matchPaths?: string[];
}

interface MobileBottomNavProps {
  items: NavItem[];
}

export default function MobileBottomNav({ items }: MobileBottomNavProps) {
  const [location, setLocation] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg safe-area-inset-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {items.map((item) => {
          const Icon = item.icon;
          const matches =
            item.matchPaths && item.matchPaths.length > 0
              ? item.matchPaths.some((matchPath) => location.startsWith(matchPath))
              : item.exact
              ? location === item.path
              : location.startsWith(item.path);
          const isActive = matches;

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center flex-1 py-2 px-1 rounded-lg transition-colors ${
                isActive
                  ? "text-blue-600 bg-blue-50"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "stroke-[2.5]" : "stroke-[2]"}`} />
              <span className={`text-xs mt-1 ${isActive ? "font-semibold" : "font-normal"}`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// 장비 운전자용 네비게이션 아이템 (동적 생성)
export const getWorkerNavItems = (workerTypeName?: string): NavItem[] => {
  const items: NavItem[] = [
    { icon: Home, label: "메인", path: "/mobile/worker" },
  ];

  // 운전원만 차량점검 메뉴 표시
  if (workerTypeName === "운전원") {
    items.push(
      { icon: ClipboardCheck, label: "점검표", path: "/mobile/driver-inspection" },
      { icon: History, label: "점검이력", path: "/mobile/driver-inspection/history" }
    );
  }

  // 작업일지는 모두 표시 (운전원, 유도원 등)
  items.push(
    { icon: FileText, label: "작업일지", path: "/mobile/work-journal-list" }
  );

  return items;
};

// 기본 워커 네비게이션 (호환성 유지)
export const workerNavItems: NavItem[] = getWorkerNavItems();

// 현장 안전점검원용 네비게이션 아이템
export const inspectorNavItems: NavItem[] = [
  { icon: Home, label: "홈", path: "/mobile/inspector", exact: true },
  {
    icon: ClipboardCheck,
    label: "점검 작성",
    path: "/mobile/inspector",
    matchPaths: ["/mobile/inspector/inspection"],
  },
  { icon: History, label: "점검 내역", path: "/mobile/inspector/history" },
];

