<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Authentication</h2>
      <p class="description">Enter your access token to authenticate</p>
      
      <form @submit.prevent="authenticate">
        <div class="form-group">
          <label for="token">Access Token:</label>
          <input
            id="token"
            v-model="token"
            type="text"
            placeholder="Enter your token (e.g., demo-token-123)"
            required
          />
        </div>
        
        <button type="submit" :disabled="isLoading" class="auth-btn">
          {{ isLoading ? 'Authenticating...' : 'Authenticate' }}
        </button>
      </form>
      
      <div v-if="message" :class="['message', messageType]">
        {{ message }}
      </div>
      
      <div class="demo-tokens">
        <h4>Demo Tokens (for testing):</h4>
        <ul>
          <li><code>demo-token-123</code></li>
          <li><code>test-token-456</code></li>
          <li><code>poc-token-789</code></li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'LoginView',
  data() {
    return {
      token: '',
      isLoading: false,
      message: '',
      messageType: ''
    }
  },
  methods: {
    async authenticate() {
      if (!this.token.trim()) {
        this.showMessage('Please enter a token', 'error')
        return
      }
      
      this.isLoading = true
      this.message = ''
      
      try {
        const response = await fetch('http://localhost:3000/auth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            token: this.token
          })
        })
        
        const data = await response.json()
        
        if (response.ok) {
          this.showMessage('Authentication successful! Redirecting...', 'success')
          this.$emit('authenticated')
          
          // Redirect to traffic view after a short delay
          setTimeout(() => {
            this.$router.push('/traffic')
          }, 1500)
        } else {
          this.showMessage(data.error || 'Authentication failed', 'error')
        }
      } catch (error) {
        console.error('Authentication error:', error)
        this.showMessage('Network error. Please check if the backend server is running.', 'error')
      } finally {
        this.isLoading = false
      }
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
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 60vh;
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
  max-width: 400px;
  width: 100%;
}

.login-card h2 {
  text-align: center;
  margin-bottom: 0.5rem;
  color: #333;
}

.description {
  text-align: center;
  color: #666;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
}

.auth-btn {
  width: 100%;
  background: #667eea;
  color: white;
  border: none;
  padding: 0.75rem;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
}

.auth-btn:hover:not(:disabled) {
  background: #5a6fd8;
}

.auth-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.message {
  margin-top: 1rem;
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

.demo-tokens {
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #eee;
}

.demo-tokens h4 {
  margin-bottom: 1rem;
  color: #666;
  font-size: 0.9rem;
}

.demo-tokens ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.demo-tokens li {
  margin-bottom: 0.5rem;
}

.demo-tokens code {
  background: #f8f9fa;
  padding: 0.25rem 0.5rem;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  color: #667eea;
  border: 1px solid #e9ecef;
}
</style>
