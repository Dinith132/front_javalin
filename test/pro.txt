import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Brain, Target, Zap, CircleCheck as CheckCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ProcessingScreen() {
  const { videoUri } = useLocalSearchParams();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress] = useState(new Animated.Value(0));
  const [scaleValue] = useState(new Animated.Value(1));

  const steps = [
    { 
      icon: Target, 
      title: 'Detecting Athlete', 
      subtitle: 'Using YOLOv8 object detection',
      duration: 2000 
    },
    { 
      icon: Brain, 
      title: 'Analyzing Pose', 
      subtitle: 'MediaPipe pose estimation',
      duration: 3000 
    },
    { 
      icon: Zap, 
      title: 'AI Processing', 
      subtitle: 'Neural network analysis',
      duration: 2500 
    },
    { 
      icon: CheckCircle, 
      title: 'Generating Feedback', 
      subtitle: 'Creating visual overlay',
      duration: 1500 
    }
  ];

  useEffect(() => {
    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        
        // Animate progress
        Animated.timing(progress, {
          toValue: (i + 1) / steps.length,
          duration: steps[i].duration,
          useNativeDriver: false,
        }).start();

        // Pulse animation for current step
        Animated.sequence([
          Animated.timing(scaleValue, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scaleValue, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();

        await new Promise(resolve => setTimeout(resolve, steps[i].duration));
      }

      // Navigate to feedback screen with mock analysis results
      const mockResults = {
        prediction: 'Low Arm',
        confidence: 0.85,
        probabilities: {
          'Good Technique': 0.12,
          'Low Arm': 0.85,
          'Poor Left Leg Block': 0.02,
          'Both Errors': 0.01
        },
        poseData: generateMockPoseData(),
        analysisId: Date.now().toString()
      };

      router.push({
        pathname: '/feedback',
        params: { 
          videoUri: videoUri as string,
          results: JSON.stringify(mockResults)
        }
      });
    };

    processSteps();
  }, []);

  const generateMockPoseData = () => {
    // Mock pose landmarks for visualization
    return Array.from({ length: 20 }, (_, frame) => ({
      frame,
      landmarks: Array.from({ length: 33 }, (_, joint) => ({
        x: 0.3 + (Math.random() * 0.4),
        y: 0.2 + (Math.random() * 0.6),
        visibility: 0.8 + (Math.random() * 0.2),
        isCorrect: joint % 3 !== 0 // Mock some joints as incorrect
      }))
    }));
  };

  const CurrentIcon = steps[currentStep]?.icon || Target;

  return (
    <LinearGradient
      colors={['#1a365d', '#2d5a87']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <Text style={styles.title}>Analyzing Your Throw</Text>
          <Text style={styles.subtitle}>AI is processing your technique</Text>

          <View style={styles.progressContainer}>
            <Animated.View 
              style={[
                styles.iconContainer,
                {
                  transform: [{ scale: scaleValue }]
                }
              ]}
            >
              <CurrentIcon size={64} color="#ffffff" strokeWidth={1.5} />
            </Animated.View>

            <View style={styles.stepInfo}>
              <Text style={styles.stepTitle}>{steps[currentStep]?.title}</Text>
              <Text style={styles.stepSubtitle}>{steps[currentStep]?.subtitle}</Text>
            </View>

            <View style={styles.progressBar}>
              <Animated.View
                style={[
                  styles.progressFill,
                  {
                    width: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%'],
                    }),
                  },
                ]}
              />
            </View>

            <View style={styles.stepsIndicator}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: index <= currentStep ? '#3182ce' : 'rgba(255, 255, 255, 0.3)',
                    },
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.techInfo}>
            <View style={styles.techItem}>
              <View style={styles.techIcon}>
                <Target size={24} color="#3182ce" />
              </View>
              <Text style={styles.techText}>YOLOv8 Detection</Text>
            </View>
            <View style={styles.techItem}>
              <View style={styles.techIcon}>
                <Brain size={24} color="#10b981" />
              </View>
              <Text style={styles.techText}>MediaPipe Pose</Text>
            </View>
            <View style={styles.techItem}>
              <View style={styles.techIcon}>
                <Zap size={24} color="#f59e0b" />
              </View>
              <Text style={styles.techText}>TensorFlow Lite</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#e2e8f0',
    textAlign: 'center',
    marginBottom: 60,
  },
  progressContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(49, 130, 206, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: 'rgba(49, 130, 206, 0.3)',
  },
  stepInfo: {
    alignItems: 'center',
    marginBottom: 30,
  },
  stepTitle: {
    fontSize: 22,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#cbd5e0',
  },
  progressBar: {
    width: width - 80,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    marginBottom: 20,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3182ce',
    borderRadius: 3,
  },
  stepsIndicator: {
    flexDirection: 'row',
    gap: 12,
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  techInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  techItem: {
    alignItems: 'center',
  },
  techIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  techText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#e2e8f0',
    textAlign: 'center',
  },
});