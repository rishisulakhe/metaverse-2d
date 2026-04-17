import React from 'react'
import styled from 'styled-components'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'
import { useAppSelector, useAppDispatch } from '../hooks'
import { closeWhiteboardDialog } from '../stores/WhiteboardStore'

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

  .close { position: absolute; top: 0; right: 0; }
`

const BoardWrapper = styled.div`
  flex: 1;
  border-radius: 25px;
  overflow: hidden;
  margin-right: 25px;

  iframe {
    width: 100%;
    height: 100%;
    background: #fff;
    border: none;
  }
`

export default function WhiteboardDialog() {
  const whiteboardUrl = useAppSelector((s) => s.whiteboard.whiteboardUrl)
  const dispatch = useAppDispatch()

  return (
    <Backdrop>
      <Wrapper>
        <IconButton className="close" onClick={() => dispatch(closeWhiteboardDialog())}>
          <CloseIcon />
        </IconButton>
        {whiteboardUrl && (
          <BoardWrapper>
            <iframe title="whiteboard" src={whiteboardUrl} />
          </BoardWrapper>
        )}
      </Wrapper>
    </Backdrop>
  )
}
