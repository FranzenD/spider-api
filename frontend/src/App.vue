<template>
  <div id="app">
    <nav class="navbar">
      <h1>Spider API - Traffic Data</h1>
      <div class="nav-links">
        <router-link to="/">Login</router-link>
        <router-link to="/traffic">Traffic</router-link>
        <button @click="logout" v-if="isAuthenticated" class="logout-btn">Logout</button>
      </div>
    </nav>
    <main class="main-content">
      <router-view @authenticated="handleAuthentication" />
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Reactive state
const isAuthenticated = ref(false)

// Methods
const handleAuthentication = () => {
  isAuthenticated.value = true
}

const logout = async () => {
  try {
    const response = await fetch('http://localhost:3000/auth/logout', {
      method: 'POST',
      credentials: 'include'
    })
    
    if (response.ok) {
      isAuthenticated.value = false
      router.push('/')
    }
  } catch (error) {
    console.error('Logout failed:', error)
  }
}
</script>

<style>
* {
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.navbar {
  background: rgba(255, 255, 255, 0.95);
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.navbar h1 {
  margin: 0;
  color: #333;
  font-size: 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.nav-links a {
  text-decoration: none;
  color: #667eea;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  transition: background-color 0.3s;
}

.nav-links a:hover,
.nav-links a.router-link-active {
  background-color: #667eea;
  color: white;
}

.logout-btn {
  background: #ff6b6b;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  transition: background-color 0.3s;
}

.logout-btn:hover {
  background: #ff5252;
}

.main-content {
  padding: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: calc(100vh - 80px);
}
</style>
