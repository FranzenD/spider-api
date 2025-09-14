<template>
  <div class="traffic-container">
    <div class="traffic-card">
      <h2>Traffic Data Dashboard</h2>
      <p class="description">Real-time traffic information from third-party API</p>
      
      <div class="actions">
        <button @click="fetchTrafficData" :disabled="isLoading" class="fetch-btn">
          {{ isLoading ? 'Loading...' : 'Fetch Traffic Data' }}
        </button>
      </div>
      
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
      
      <div v-if="trafficData" class="traffic-data">
        <div class="data-header">
          <h3>Traffic Information</h3>
          <span class="timestamp">{{ formatTimestamp(trafficData.timestamp) }}</span>
        </div>
        
        <div class="traffic-grid">
          <div
            v-for="(location, index) in trafficData.data"
            :key="index"
            :class="['traffic-item', `congestion-${location.congestion}`]"
          >
            <div class="location">
              <h4>{{ location.location }}</h4>
            </div>
            <div class="metrics">
              <div class="metric">
                <span class="label">Speed:</span>
                <span class="value">{{ location.speed }} mph</span>
              </div>
              <div class="metric">
                <span class="label">Congestion:</span>
                <span class="value">{{ location.congestion }}</span>
              </div>
              <div class="metric">
                <span class="label">Incidents:</span>
                <span class="value">{{ location.incidents }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div class="data-footer">
          <small>Source: {{ trafficData.source }}</small>
        </div>
      </div>
      
      <div v-else-if="!isLoading" class="no-data">
        <p>Click "Fetch Traffic Data" to load current traffic information</p>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TrafficView',
  data() {
    return {
      trafficData: null,
      isLoading: false,
      message: '',
      messageType: ''
    }
  },
  methods: {
    async fetchTrafficData() {
      this.isLoading = true
      this.message = ''
      
      try {
        const response = await fetch('http://localhost:3000/api/traffic', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        })
        
        if (response.ok) {
          this.trafficData = await response.json()
          this.showMessage('Traffic data loaded successfully', 'success')
        } else if (response.status === 401) {
          this.showMessage('Authentication required. Please login first.', 'error')
          // Redirect to login after a delay
          setTimeout(() => {
            this.$router.push('/')
          }, 2000)
        } else {
          const errorData = await response.json()
          this.showMessage(errorData.error || 'Failed to fetch traffic data', 'error')
        }
      } catch (error) {
        console.error('Fetch error:', error)
        this.showMessage('Network error. Please check if the backend server is running.', 'error')
      } finally {
        this.isLoading = false
      }
    },
    
    formatTimestamp(timestamp) {
      return new Date(timestamp).toLocaleString()
    },
    
    showMessage(text, type) {
      this.message = text
      this.messageType = type
      
      // Clear message after 5 seconds
      setTimeout(() => {
        this.message = ''
      }, 5000)
    }
  }
}
</script>

<style scoped>
.traffic-container {
  display: flex;
  justify-content: center;
  align-items: flex-start;
  min-height: 60vh;
  padding: 1rem;
}

.traffic-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 800px;
  width: 100%;
}

.traffic-card h2 {
  text-align: center;
  margin-bottom: 0.5rem;
  color: #333;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.actions {
  text-align: center;
  margin-bottom: 2rem;
}

.fetch-btn {
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.fetch-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.fetch-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.message {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: 4px;
  text-align: center;
}

.message.success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.message.error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.traffic-data {
  margin-top: 2rem;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #eee;
}

.data-header h3 {
  margin: 0;
  color: #333;
}

.timestamp {
  color: #666;
  font-size: 0.9rem;
}

.traffic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.traffic-item {
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s;
}

.traffic-item.congestion-light {
  border-color: #28a745;
  background: #f8fff9;
}

.traffic-item.congestion-moderate {
  border-color: #ffc107;
  background: #fffef8;
}

.traffic-item.congestion-heavy {
  border-color: #dc3545;
  background: #fff8f8;
}

.location h4 {
  margin: 0 0 1rem 0;
  color: #333;
  font-size: 1.1rem;
}

.metrics {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.metric {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric .label {
  font-weight: 500;
  color: #666;
}

.metric .value {
  font-weight: 600;
  color: #333;
}

.data-footer {
  text-align: center;
  padding-top: 1rem;
  border-top: 1px solid #eee;
  color: #666;
}

.no-data {
  text-align: center;
  padding: 3rem 1rem;
  color: #666;
}

.no-data p {
  margin: 0;
  font-size: 1.1rem;
}
</style>
