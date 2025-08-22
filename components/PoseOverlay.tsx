import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Svg, Circle, Line } from 'react-native-svg';
import { PoseLandmark } from './AIAnalysisEngine';

interface PoseOverlayProps {
  landmarks: PoseLandmark[];
  width: number;
  height: number;
  showSkeleton?: boolean;
}

// MediaPipe Pose landmark indices
const POSE_CONNECTIONS = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  
  // Torso
  [9, 10], [11, 12], [11, 13], [13, 15],
  [15, 17], [15, 19], [15, 21], [17, 19],
  [12, 14], [14, 16], [16, 18], [16, 20],
  [16, 22], [18, 20], [11, 23], [12, 24],
  [23, 24],
  
  // Left leg
  [23, 25], [25, 27], [27, 29], [29, 31],
  [27, 31],
  
  // Right leg
  [24, 26], [26, 28], [28, 30], [30, 32],
  [28, 32]
];

const LANDMARK_NAMES = [
  'nose', 'left_eye_inner', 'left_eye', 'left_eye_outer',
  'right_eye_inner', 'right_eye', 'right_eye_outer', 'left_ear',
  'right_ear', 'mouth_left', 'mouth_right', 'left_shoulder',
  'right_shoulder', 'left_elbow', 'right_elbow', 'left_wrist',
  'right_wrist', 'left_pinky', 'right_pinky', 'left_index',
  'right_index', 'left_thumb', 'right_thumb', 'left_hip',
  'right_hip', 'left_knee', 'right_knee', 'left_ankle',
  'right_ankle', 'left_heel', 'right_heel', 'left_foot_index',
  'right_foot_index'
];

export const PoseOverlay: React.FC<PoseOverlayProps> = ({
  landmarks,
  width,
  height,
  showSkeleton = true
}) => {
  if (!landmarks || landmarks.length < 33) {
    return null;
  }

  const getJointColor = (landmark: PoseLandmark, index: number): string => {
    // Color coding based on correctness
    if (landmark.isCorrect === false) {
      return '#ef4444'; // Red for incorrect joints
    } else if (landmark.isCorrect === true) {
      return '#10b981'; // Green for correct joints
    } else {
      return '#3b82f6'; // Blue for neutral/unanalyzed joints
    }
  };

  const getJointRadius = (landmark: PoseLandmark): number => {
    // Vary joint size based on visibility
    const baseRadius = 4;
    return baseRadius * Math.max(0.5, landmark.visibility);
  };

  const getConnectionOpacity = (
    landmark1: PoseLandmark, 
    landmark2: PoseLandmark
  ): number => {
    // Connection opacity based on both landmarks' visibility
    return Math.min(landmark1.visibility, landmark2.visibility) * 0.8;
  };

  const renderConnections = () => {
    if (!showSkeleton) return null;

    return POSE_CONNECTIONS.map(([startIdx, endIdx], connectionIdx) => {
      const startLandmark = landmarks[startIdx];
      const endLandmark = landmarks[endIdx];

      if (!startLandmark || !endLandmark || 
          startLandmark.visibility < 0.5 || endLandmark.visibility < 0.5) {
        return null;
      }

      const x1 = startLandmark.x * width;
      const y1 = startLandmark.y * height;
      const x2 = endLandmark.x * width;
      const y2 = endLandmark.y * height;

      // Color connection based on joint correctness
      let strokeColor = '#64748b';
      if (startLandmark.isCorrect === false || endLandmark.isCorrect === false) {
        strokeColor = '#ef4444';
      } else if (startLandmark.isCorrect === true && endLandmark.isCorrect === true) {
        strokeColor = '#10b981';
      }

      return (
        <Line
          key={`connection-${connectionIdx}`}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={strokeColor}
          strokeWidth="2"
          strokeOpacity={getConnectionOpacity(startLandmark, endLandmark)}
        />
      );
    });
  };

  const renderLandmarks = () => {
    return landmarks.map((landmark, index) => {
      if (landmark.visibility < 0.5) return null;

      const x = landmark.x * width;
      const y = landmark.y * height;
      const radius = getJointRadius(landmark);
      const color = getJointColor(landmark, index);

      return (
        <Circle
          key={`landmark-${index}`}
          cx={x}
          cy={y}
          r={radius}
          fill={color}
          stroke="#ffffff"
          strokeWidth="1"
          opacity={landmark.visibility}
        />
      );
    });
  };

  return (
    <View style={[styles.container, { width, height }]} pointerEvents="none">
      <Svg width={width} height={height} style={styles.svg}>
        {renderConnections()}
        {renderLandmarks()}
      </Svg>
    </View>
  );
};

export default PoseOverlay;

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  svg: {
    position: 'absolute',
  },
});