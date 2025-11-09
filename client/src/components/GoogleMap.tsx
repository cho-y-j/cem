import { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

interface GoogleMapProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: string;
    position: { lat: number; lng: number };
    title: string;
    info?: string;
  }>;
  path?: Array<{ lat: number; lng: number; timestamp?: Date }>; // 이동 경로 (Polyline)
  onMapLoad?: (map: google.maps.Map) => void;
  className?: string;
}

export default function GoogleMap({
  center = { lat: 37.5665, lng: 126.9780 }, // 서울 기본 좌표
  zoom = 12,
  markers = [],
  path = [],
  onMapLoad,
  className = "w-full h-[500px]",
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [mapMarkers, setMapMarkers] = useState<google.maps.Marker[]>([]);
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);
  const [infoWindow, setInfoWindow] = useState<google.maps.InfoWindow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 구글맵 로드
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API 키가 설정되지 않았습니다.");
      setIsLoading(false);
      return;
    }

    const loader = new Loader({
      apiKey,
      version: "weekly",
      libraries: ["places", "marker"],
    });

    loader
      .load()
      .then(() => {
        if (!mapRef.current) return;

        const newMap = new google.maps.Map(mapRef.current, {
          center,
          zoom,
          mapTypeControl: true,
          streetViewControl: true,
          fullscreenControl: true,
          zoomControl: true,
        });

        const newInfoWindow = new google.maps.InfoWindow();
        
        setMap(newMap);
        setInfoWindow(newInfoWindow);
        setIsLoading(false);

        if (onMapLoad) {
          onMapLoad(newMap);
        }
      })
      .catch((err) => {
        console.error("Google Maps 로드 실패:", err);
        setError("지도를 로드할 수 없습니다.");
        setIsLoading(false);
      });
  }, []);

  // 마커 업데이트
  useEffect(() => {
    if (!map || !infoWindow) return;

    // 기존 마커 제거
    mapMarkers.forEach((marker) => marker.setMap(null));

    // 새 마커 생성
    const newMarkers = markers.map((markerData) => {
      const marker = new google.maps.Marker({
        position: markerData.position,
        map,
        title: markerData.title,
        animation: google.maps.Animation.DROP,
      });

      // 마커 클릭 이벤트
      marker.addListener("click", () => {
        const content = `
          <div style="padding: 8px;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${markerData.title}</h3>
            ${markerData.info ? `<p style="font-size: 14px; color: #666;">${markerData.info}</p>` : ""}
          </div>
        `;
        infoWindow.setContent(content);
        infoWindow.open(map, marker);
      });

      return marker;
    });

    setMapMarkers(newMarkers);

    // 마커가 있으면 지도 범위 조정
    if (newMarkers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      newMarkers.forEach((marker) => {
        const position = marker.getPosition();
        if (position) {
          bounds.extend(position);
        }
      });
      map.fitBounds(bounds);
      
      // 마커가 1개일 때는 줌 레벨 조정
      if (newMarkers.length === 1) {
        map.setZoom(15);
      }
    }
  }, [map, markers, infoWindow]);

  // 중심 좌표 변경
  useEffect(() => {
    if (map && center) {
      map.setCenter(center);
    }
  }, [map, center]);

  // 이동 경로 (Polyline) 업데이트
  useEffect(() => {
    if (!map) return;

    // 기존 Polyline 제거
    if (polyline) {
      polyline.setMap(null);
    }

    // 새로운 경로가 있으면 Polyline 생성
    if (path && path.length > 0) {
      const pathCoordinates = path.map((p) => ({
        lat: p.lat,
        lng: p.lng,
      }));

      const newPolyline = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: "#FF0000",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      });

      setPolyline(newPolyline);

      // 경로에 맞게 지도 범위 조정
      const bounds = new google.maps.LatLngBounds();
      pathCoordinates.forEach((coord) => {
        bounds.extend(coord);
      });
      map.fitBounds(bounds);
    }
  }, [map, path]);

  if (error) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <p className="text-red-600 font-medium">{error}</p>
          <p className="text-sm text-gray-600 mt-2">
            환경 변수에 VITE_GOOGLE_MAPS_API_KEY를 설정해주세요.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`${className} flex items-center justify-center bg-gray-100 rounded-lg`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">지도를 로드하는 중...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className={className} />;
}

