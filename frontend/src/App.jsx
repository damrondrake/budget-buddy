import { useState, useEffect } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState(null)

  useEffect(() => {
    fetch('http://localhost:8000/api/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setHealth({ status: 'unreachable' }))
  }, [])

  return (
    <div className="app">
      <h1>BudgetBuddy</h1>
      <p>Your personal finance dashboard</p>
      <div className="health-status">
        <h3>API Status</h3>
        {health ? (
          <span className={health.status === 'healthy' ? 'healthy' : 'error'}>
            {health.status}
          </span>
        ) : (
          <span>Checking...</span>
        )}
      </div>
    </div>
  )
}

export default App
