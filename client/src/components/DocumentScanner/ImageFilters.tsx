import { type FilterType } from '@/utils/documentScanner';
import { cn } from '@/lib/utils';
import { Image, FileText, Sun, Sparkles } from 'lucide-react';

interface ImageFiltersProps {
  selectedFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  disabled?: boolean;
}

const filters: { type: FilterType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'original',
    label: '원본',
    icon: <Image className="h-5 w-5" />,
    description: '원본 그대로'
  },
  {
    type: 'grayscale',
    label: '흑백',
    icon: <Sun className="h-5 w-5" />,
    description: '흑백 변환'
  },
  {
    type: 'document',
    label: '문서',
    icon: <FileText className="h-5 w-5" />,
    description: '문서 스캔 모드'
  },
  {
    type: 'enhanced',
    label: '선명',
    icon: <Sparkles className="h-5 w-5" />,
    description: '선명하게'
  }
];

export function ImageFilters({ selectedFilter, onFilterChange, disabled = false }: ImageFiltersProps) {
  return (
    <div className="flex gap-2 justify-center">
      {filters.map((filter) => (
        <button
          key={filter.type}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFilterChange(filter.type);
          }}
          disabled={disabled}
          className={cn(
            'flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all',
            'min-w-[60px]',
            selectedFilter === filter.type
              ? 'bg-blue-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {filter.icon}
          <span className="text-xs font-medium">{filter.label}</span>
        </button>
      ))}
    </div>
  );
}

export default ImageFilters;
