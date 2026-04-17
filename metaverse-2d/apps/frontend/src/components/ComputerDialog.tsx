import React from 'react'
import styled from 'styled-components'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useAppSelector, useAppDispatch } from '../hooks'
import { closeComputerDialog } from '../stores/ComputerStore'
import Video from './Video'

const Backdrop = styled.div`
  position: fixed;
  inset: 0;
  padding: 16px 180px 16px 16px;
  z-index: 300;
`

const Wrapper = styled.div`
  width: 100%;
  height: 100%;
  background: #222639;
  border-radius: 16px;
  padding: 16px;
  color: #eee;
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 0 5px #0000006f;

  .close { position: absolute; top: 0; right: 0; }
`

const VideoGrid = styled.div`
  flex: 1;
  min-height: 0;
  display: grid;
  grid-gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(40%, 1fr));

  .video-container {
    position: relative;
    background: #000;
    border-radius: 8px;
    overflow: hidden;

    video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .player-name {
      position: absolute;
      bottom: 16px;
      left: 16px;
      color: #fff;
      text-shadow: 0 1px 2px rgba(0,0,0,.6);
      white-space: nowrap;
    }
  }
`

function VideoContainer({ stream, playerName }: { stream: MediaStream; playerName?: string }) {
  return (
    <div className="video-container">
      <Video srcObject={stream} autoPlay playsInline />
      {playerName && <div className="player-name">{playerName}</div>}
    </div>
  )
}

export default function ComputerDialog() {
  const dispatch = useAppDispatch()
  const playerNameMap = useAppSelector((s) => s.user.playerNameMap)
  const shareScreenManager = useAppSelector((s) => s.computer.shareScreenManager)
  const myStream = useAppSelector((s) => s.computer.myStream)
  const peerStreams = useAppSelector((s) => s.computer.peerStreams)

  return (
    <Backdrop>
      <Wrapper>
        <IconButton className="close" onClick={() => dispatch(closeComputerDialog())}>
          <CloseIcon />
        </IconButton>
        <div>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              if (shareScreenManager?.myStream) {
                shareScreenManager.stopScreenShare()
              } else {
                shareScreenManager?.startScreenShare()
              }
            }}
          >
            {shareScreenManager?.myStream ? 'Stop sharing' : 'Share Screen'}
          </Button>
        </div>
        <VideoGrid>
          {myStream && <VideoContainer stream={myStream} playerName="You" />}
          {[...peerStreams.entries()].map(([id, { stream }]) => (
            <VideoContainer key={id} stream={stream} playerName={playerNameMap.get(id)} />
          ))}
        </VideoGrid>
      </Wrapper>
    </Backdrop>
  )
}
