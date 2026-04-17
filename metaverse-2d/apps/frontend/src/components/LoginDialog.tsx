import React, { useState } from 'react'
import styled from 'styled-components'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import CircularProgress from '@mui/material/CircularProgress'
import { useAppDispatch } from '../hooks'
import { setAuth, setLoggedIn } from '../stores/UserStore'
import { signin, signup } from '../services/Api'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`

const Box = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 36px 48px;
  width: 360px;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Title = styled.h2`
  margin: 0;
  color: #eee;
  text-align: center;
  font-size: 22px;
`

export default function LoginDialog() {
  const dispatch = useAppDispatch()
  const [tab, setTab] = useState(0)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) {
      setError('Username and password are required')
      return
    }
    setLoading(true)
    setError('')
    try {
      if (tab === 0) {
        const { token } = await signin({ username, password })
        localStorage.setItem('token', token)
        dispatch(setAuth({ token, username }))
        dispatch(setLoggedIn(true))
      } else {
        await signup({ username, password, type: 'user' })
        const { token } = await signin({ username, password })
        localStorage.setItem('token', token)
        dispatch(setAuth({ token, username }))
        dispatch(setLoggedIn(true))
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Overlay>
      <Box>
        <Title>Metaverse 2D</Title>
        <Tabs
          value={tab}
          onChange={(_, v) => { setTab(v); setError('') }}
          textColor="secondary"
          indicatorColor="secondary"
          centered
        >
          <Tab label="Sign In" />
          <Tab label="Sign Up" />
        </Tabs>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <TextField
            label="Username"
            variant="outlined"
            color="secondary"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            fullWidth
          />
          <TextField
            label="Password"
            variant="outlined"
            color="secondary"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
          />
          {error && <Alert severity="error">{error}</Alert>}
          <Button
            type="submit"
            variant="contained"
            color="secondary"
            size="large"
            disabled={loading}
            fullWidth
          >
            {loading ? <CircularProgress size={22} color="inherit" /> : tab === 0 ? 'Sign In' : 'Sign Up'}
          </Button>
        </form>
      </Box>
    </Overlay>
  )
}
