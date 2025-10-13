import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera } from '@mediapipe/camera_utils';

interface FaceTrackingState {
  isTracking: boolean;
  focusLevel: number;
  isFaceDetected: boolean;
  stream: MediaStream | null;
}

export const useFaceTracking = () => {
  const [state, setState] = useState<FaceTrackingState>({
    isTracking: false,
    focusLevel: 100,
    isFaceDetected: false,
    stream: null,
  });

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMesh | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const focusHistoryRef = useRef<number[]>([]);
  const lastDetectionTimeRef = useRef<number>(Date.now());

  const startTracking = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });

      if (!videoRef.current) {
        videoRef.current = document.createElement('video');
        videoRef.current.autoplay = true;
        videoRef.current.playsInline = true;
      }

      videoRef.current.srcObject = stream;
      streamRef.current = stream;

      await videoRef.current.play();

      // Initialize MediaPipe Face Mesh
      const faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results) => {
        const faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
        
        // Calculate focus level based on face detection and facial metrics
        let currentFocus = 30; // Default low focus when no face
        
        if (faceDetected) {
          const landmarks = results.multiFaceLandmarks[0];
          
          // Calculate face size (distance between eyes) for normalization
          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const eyeDistance = Math.sqrt(
            Math.pow(rightEye.x - leftEye.x, 2) + 
            Math.pow(rightEye.y - leftEye.y, 2)
          );
          
          // Calculate eye openness normalized by face size
          const leftEyeOpenness = Math.abs(landmarks[159].y - landmarks[145].y) / eyeDistance;
          const rightEyeOpenness = Math.abs(landmarks[386].y - landmarks[374].y) / eyeDistance;
          const avgEyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
          
          // Calculate head pose normalized by face size
          const noseTip = landmarks[1];
          const faceCenter = landmarks[168];
          // 3D head pose using depth (z) for yaw/pitch
          const leftEyeCorner = landmarks[33];
          const rightEyeCorner = landmarks[263];
          const yaw = Math.abs(leftEyeCorner.z - rightEyeCorner.z) / eyeDistance; // left/right turn
          const pitch = Math.abs(noseTip.z - faceCenter.z) / eyeDistance; // up/down nod

          const totalHeadMotion = Math.hypot(yaw, pitch);

          // Debug logging
          console.log('Face metrics:', {
            avgEyeOpenness: avgEyeOpenness.toFixed(3),
            yaw: yaw.toFixed(3),
            pitch: pitch.toFixed(3),
            totalHeadMotion: totalHeadMotion.toFixed(3)
          });
          
          // Eyes open and facing camera = high focus
          if (avgEyeOpenness > 0.08 && totalHeadMotion < 0.15) {
            currentFocus = 95;
          } else if (avgEyeOpenness > 0.08 && totalHeadMotion < 0.28) {
            currentFocus = 75; // Eyes open but slight head motion
          } else if (avgEyeOpenness > 0.05 && totalHeadMotion < 0.28) {
            currentFocus = 55; // Eyes open but moderate head motion
          } else if (totalHeadMotion >= 0.28) {
            currentFocus = 30; // Head significantly turned or nodded away
          } else {
            currentFocus = 35; // Eyes closed or looking away
          }
          
          console.log('Focus calculated:', currentFocus);
        }
        
        focusHistoryRef.current.push(currentFocus);

        // Keep last 5 seconds of history (assuming ~30fps = ~150 samples for 5s)
        if (focusHistoryRef.current.length > 150) {
          focusHistoryRef.current.shift();
        }

        // Calculate average focus level
        const avgFocus = Math.round(
          focusHistoryRef.current.reduce((a, b) => a + b, 0) / focusHistoryRef.current.length
        );

        lastDetectionTimeRef.current = Date.now();

        setState((prev) => ({
          ...prev,
          focusLevel: avgFocus,
          isFaceDetected: faceDetected,
        }));
      });

      faceMeshRef.current = faceMesh;

      // Initialize camera
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current && videoRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      await camera.start();
      cameraRef.current = camera;

      setState((prev) => ({ ...prev, isTracking: true, stream }));

      toast.success('Focus tracking started', {
        description: 'Maintaining your attention...',
      });
    } catch (error) {
      console.error('Error starting tracking:', error);
      toast.error('Camera access denied', {
        description: 'Please allow camera access to use focus tracking.',
      });
    }
  };


  const stopTracking = () => {
    // Stop camera
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }

    // Close face mesh
    if (faceMeshRef.current) {
      faceMeshRef.current.close();
      faceMeshRef.current = null;
    }

    // Stop media stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    focusHistoryRef.current = [];

    setState({
      isTracking: false,
      focusLevel: 100,
      isFaceDetected: false,
      stream: null,
    });

    toast.info('Focus tracking stopped');
  };

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return {
    ...state,
    startTracking,
    stopTracking,
  };
};
