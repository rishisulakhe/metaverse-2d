import React, { useEffect, useState } from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TextField from '@mui/material/TextField'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardActions from '@mui/material/CardActions'
import Typography from '@mui/material/Typography'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import LockIcon from '@mui/icons-material/Lock'
import AddIcon from '@mui/icons-material/Add'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import { useAppSelector } from '../hooks'
import { getPublicSpaces, createSpace, type SpaceInfo } from '../services/Api'
import phaserGame from '../PhaserGame'
import type Bootstrap from '../scenes/Bootstrap'

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`

const Wrapper = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 36px 48px;
  min-width: 480px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 20px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  h2 { margin: 0; color: #eee; flex: 1; text-align: center; }
`

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`

const RoomCard = styled(Card)`
  && {
    background: #2e3250;
    color: #eee;
  }
`

export default function RoomSelectionDialog() {
  const username = useAppSelector((s) => s.user.username)
  const token = useAppSelector((s) => s.user.token)
  const [spaces, setSpaces] = useState<SpaceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDims, setCreateDims] = useState('200x200')
  const [createPassword, setCreatePassword] = useState('')
  const [createLoading, setCreateLoading] = useState(false)
  const [joinPasswordId, setJoinPasswordId] = useState<string | null>(null)
  const [joinPasswordInput, setJoinPasswordInput] = useState('')
  const [joinError, setJoinError] = useState('')

  useEffect(() => {
    getPublicSpaces()
      .then(setSpaces)
      .catch(() => setError('Failed to load spaces'))
      .finally(() => setLoading(false))
  }, [])

  const joinSpace = (spaceId: string, password?: string) => {
    const bootstrap = phaserGame.scene.keys.bootstrap as Bootstrap
    const anim = 'adam_idle_down'
    bootstrap.launchGame(spaceId, token, username, anim, password)
  }

  const handleJoin = (space: SpaceInfo) => {
    if (space.hasPassword) {
      setJoinPasswordId(space.id)
      setJoinPasswordInput('')
      setJoinError('')
    } else {
      joinSpace(space.id)
    }
  }

  const handleJoinWithPassword = () => {
    if (!joinPasswordId) return
    if (!joinPasswordInput) {
      setJoinError('Password required')
      return
    }
    setJoinPasswordId(null)
    joinSpace(joinPasswordId, joinPasswordInput)
  }

  const handleCreate = async () => {
    if (!createName.trim()) return
    setCreateLoading(true)
    try {
      const { spaceId } = await createSpace({
        name: createName,
        dimensions: createDims,
        ...(createPassword ? { password: createPassword } : {}),
      })
      setShowCreate(false)
      joinSpace(spaceId)
    } catch {
      setError('Failed to create space')
    } finally {
      setCreateLoading(false)
    }
  }

  return (
    <Overlay>
      <Wrapper>
        {showCreate ? (
          <>
            <Header>
              <IconButton onClick={() => setShowCreate(false)} size="small">
                <ArrowBackIcon />
              </IconButton>
              <h2>Create Space</h2>
            </Header>
            <TextField label="Name" variant="outlined" color="secondary" value={createName}
              onChange={(e) => setCreateName(e.target.value)} fullWidth />
            <TextField label="Dimensions (e.g. 200x200)" variant="outlined" color="secondary"
              value={createDims} onChange={(e) => setCreateDims(e.target.value)} fullWidth />
            <TextField label="Password (optional)" variant="outlined" color="secondary"
              type="password" value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} fullWidth />
            <Button variant="contained" color="secondary" onClick={handleCreate} disabled={createLoading} fullWidth>
              {createLoading ? <CircularProgress size={22} color="inherit" /> : 'Create & Join'}
            </Button>
          </>
        ) : (
          <>
            <Header>
              <h2>Join a Space</h2>
            </Header>
            {error && <Alert severity="error">{error}</Alert>}
            <Button
              variant="outlined" color="secondary" startIcon={<AddIcon />}
              onClick={() => setShowCreate(true)}
            >
              Create new space
            </Button>
            {loading ? (
              <CircularProgress color="secondary" style={{ alignSelf: 'center' }} />
            ) : spaces.length === 0 ? (
              <Typography color="textSecondary" align="center">
                No public spaces yet. Create one!
              </Typography>
            ) : (
              <RoomGrid>
                {spaces.map((s) => (
                  <RoomCard key={s.id}>
                    <CardContent>
                      <Typography variant="h6" style={{ color: '#eee' }}>
                        {s.name}
                        {s.hasPassword && <LockIcon fontSize="small" style={{ marginLeft: 6, verticalAlign: 'middle' }} />}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {s.dimensions}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button size="small" color="secondary" onClick={() => handleJoin(s)}>
                        Join
                      </Button>
                    </CardActions>
                  </RoomCard>
                ))}
              </RoomGrid>
            )}
          </>
        )}
      </Wrapper>

      <Dialog open={!!joinPasswordId} onClose={() => setJoinPasswordId(null)}>
        <DialogTitle>Room Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus label="Password" type="password" variant="outlined" color="secondary"
            value={joinPasswordInput} onChange={(e) => setJoinPasswordInput(e.target.value)}
            error={!!joinError} helperText={joinError} fullWidth sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinPasswordId(null)}>Cancel</Button>
          <Button variant="contained" color="secondary" onClick={handleJoinWithPassword}>Join</Button>
        </DialogActions>
      </Dialog>
    </Overlay>
  )
}
