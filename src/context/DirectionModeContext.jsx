import { createContext, useContext, useState } from 'react'
import { DIRECTIONS } from '../data/directions.js'

const DirectionModeContext = createContext({
  mode: 'dark', setMode: () => {},
  activeDirection: 1, setActiveDirection: () => {},
  pageBg: '#0A1A1E',
})

export function DirectionModeProvider({ children }) {
  const [mode, setMode] = useState('dark')
  const [activeDirection, setActiveDirectionState] = useState(() => {
    const saved = parseInt(localStorage.getItem('lantern_demo_direction') || '1', 10)
    return DIRECTIONS.find(d => d.id === saved) ? saved : 1
  })

  const setActiveDirection = (id) => {
    setActiveDirectionState(id)
    localStorage.setItem('lantern_demo_direction', id)
  }

  const dir = DIRECTIONS.find(d => d.id === activeDirection) ?? DIRECTIONS[0]
  const pageBg = mode === 'dark' ? dir.darkBg : dir.lightBg

  return (
    <DirectionModeContext.Provider value={{ mode, setMode, activeDirection, setActiveDirection, pageBg }}>
      {children}
    </DirectionModeContext.Provider>
  )
}

export function useDirectionMode() {
  return useContext(DirectionModeContext)
}
