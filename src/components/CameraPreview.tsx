import { useEffect, useRef } from 'react';

interface CameraPreviewProps {
  stream: MediaStream | null;
}

export const CameraPreview = ({ stream }: CameraPreviewProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative w-64 h-48 rounded-lg overflow-hidden border-2 border-border bg-muted">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />
    </div>
  );
};
