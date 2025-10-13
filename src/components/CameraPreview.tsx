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
    <div className="relative w-full max-w-3xl h-[500px] rounded-lg overflow-hidden border-2 border-border bg-muted shadow-lg">
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
