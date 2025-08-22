import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

export default function AnalysisScreen() {
  const analysisData = [
    {
      id: 1,
      date: '2024-01-15',
      time: '14:30',
      result: 'Good Technique',
      confidence: 92,
      status: 'success',
    },
    {
      id: 2,
      date: '2024-01-14',
      time: '16:45',
      result: 'Low Arm',
      confidence: 85,
      status: 'warning',
    },
    {
      id: 3,
      date: '2024-01-13',
      time: '10:20',
      result: 'Poor Left Leg Block',
      confidence: 78,
      status: 'error',
    },
    {
      id: 4,
      date: '2024-01-12',
      time: '15:15',
      result: 'Both Errors',
      confidence: 88,
      status: 'error',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle size={24} color="#059669" />;
      case 'warning':
        return <AlertCircle size={24} color="#d97706" />;
      case 'error':
        return <XCircle size={24} color="#dc2626" />;
      default:
        return <Clock size={24} color="#64748b" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return '#059669';
      case 'warning':
        return '#d97706';
      case 'error':
        return '#dc2626';
      default:
        return '#64748b';
    }
  };

  return (
    <LinearGradient
      colors={['#1a365d', '#2d5a87']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>Analysis History</Text>
          <Text style={styles.subtitle}>Track your progress over time</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.summaryContainer}>
            <View style={styles.summaryCard}>
              <BarChart3 size={32} color="#3182ce" />
              <Text style={styles.summaryNumber}>12</Text>
              <Text style={styles.summaryLabel}>Total Throws</Text>
            </View>
            <View style={styles.summaryCard}>
              <CheckCircle size={32} color="#059669" />
              <Text style={styles.summaryNumber}>67%</Text>
              <Text style={styles.summaryLabel}>Success Rate</Text>
            </View>
          </View>

          <View style={styles.historyContainer}>
            <Text style={styles.historyTitle}>Recent Analysis</Text>
            {analysisData.map((item) => (
              <TouchableOpacity key={item.id} style={styles.historyItem}>
                <View style={styles.historyLeft}>
                  {getStatusIcon(item.status)}
                  <View style={styles.historyContent}>
                    <Text style={styles.historyResult}>{item.result}</Text>
                    <Text style={styles.historyDate}>{item.date} at {item.time}</Text>
                  </View>
                </View>
                <View style={styles.historyRight}>
                  <Text style={[styles.confidenceText, { color: getStatusColor(item.status) }]}>
                    {item.confidence}%
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
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
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#e2e8f0',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  summaryCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  summaryNumber: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1a202c',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748b',
    textAlign: 'center',
  },
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#ffffff',
    marginBottom: 16,
  },
  historyItem: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  historyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  historyContent: {
    marginLeft: 12,
    flex: 1,
  },
  historyResult: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1a202c',
  },
  historyDate: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#64748b',
    marginTop: 2,
  },
  historyRight: {
    alignItems: 'flex-end',
  },
  confidenceText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});