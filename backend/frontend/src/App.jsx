function App() {
  return (
    <div className="app">
      <div className="chat-header">
        🤖 AI Student Support Assistant
      </div>

      <div className="chat-box">
        <div className="welcome">
          <h2>Hello! 👋</h2>
          <p>How can I help you today?</p>
        </div>
      </div>

      <div className="input-area">
        <input
          type="text"
          placeholder="Ask me anything..."
        />
        <button>Send</button>
      </div>
    </div>
  )
}

export default App