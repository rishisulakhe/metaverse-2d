import React, { useEffect, useState } from "react";
import styled from "styled-components";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import LockIcon from "@mui/icons-material/Lock";
import AddIcon from "@mui/icons-material/Add";
import PeopleIcon from "@mui/icons-material/People";
import LogoutIcon from "@mui/icons-material/Logout";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import { useAppSelector, useAppDispatch } from "../hooks";
import { getPublicSpaces, createSpace, type SpaceInfo } from "../services/Api";
import { setLoggedIn, setAuth } from "../stores/UserStore";
import phaserGame from "../PhaserGame";
import type Bootstrap from "../scenes/Bootstrap";

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
`;

const Wrapper = styled.div`
  background: #222639;
  border-radius: 16px;
  padding: 36px 48px;
  min-width: 520px;
  max-width: 640px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 0 24px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  h2 {
    margin: 0;
    color: #eee;
    flex: 1;
    text-align: center;
  }
`;

const RoomGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const RoomCard = styled(Card)`
  && {
    background: #2e3250;
    color: #eee;
  }
`;

const LobbyCard = styled(Card)`
  && {
    background: linear-gradient(135deg, #1a6b5e, #0d4a40);
    color: #eee;
    border: 1px solid #42eacb44;
    grid-column: 1 / -1;
  }
`;

const CharPickerRow = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
  flex-wrap: wrap;
`;

const CharButton = styled.button<{ selected: boolean }>`
  background: ${(p) => (p.selected ? "#42eacb22" : "#1a1d2e")};
  border: 2px solid ${(p) => (p.selected ? "#42eacb" : "#444")};
  border-radius: 10px;
  color: #eee;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 13px;
  font-weight: ${(p) => (p.selected ? 700 : 400)};
  transition: all 0.15s;
  text-transform: capitalize;
  &:hover {
    border-color: #42eacb88;
    background: #42eacb11;
  }
`;

const SectionLabel = styled.div`
  color: #aaa;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: -12px;
`;

const CHARACTERS = ["adam", "ash", "lucy", "nancy"] as const;

export default function RoomSelectionDialog() {
  const dispatch = useAppDispatch();
  const username = useAppSelector((s) => s.user.username);
  const token = useAppSelector((s) => s.user.token);
  const [spaces, setSpaces] = useState<SpaceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDims, setCreateDims] = useState("200x200");
  const [createPassword, setCreatePassword] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [joinPasswordId, setJoinPasswordId] = useState<string | null>(null);
  const [joinPasswordInput, setJoinPasswordInput] = useState("");
  const [joinError, setJoinError] = useState("");
  const [selectedChar, setSelectedChar] = useState<string>("adam");
  const [wsError, setWsError] = useState("");

  const handleSignOut = () => {
    localStorage.removeItem("token");
    dispatch(setLoggedIn(false));
    dispatch(setAuth({ token: "", username: "" }));
  };

  useEffect(() => {
    getPublicSpaces()
      .then(setSpaces)
      .catch(() => setError("Failed to load spaces"))
      .finally(() => setLoading(false));
  }, []);

  const joinSpace = (spaceId: string, password?: string) => {
    setWsError("");
    const bootstrap = phaserGame.scene.keys.bootstrap as Bootstrap;
    const anim = `${selectedChar}_idle_down`;
    bootstrap.launchGame(spaceId, token, username, anim, password);
  };

  const handleJoin = (space: SpaceInfo) => {
    if (space.hasPassword) {
      setJoinPasswordId(space.id);
      setJoinPasswordInput("");
      setJoinError("");
    } else {
      joinSpace(space.id);
    }
  };

  const handleJoinWithPassword = () => {
    if (!joinPasswordId) return;
    if (!joinPasswordInput) {
      setJoinError("Password required");
      return;
    }
    setJoinPasswordId(null);
    joinSpace(joinPasswordId, joinPasswordInput);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    setCreateLoading(true);
    try {
      const { spaceId } = await createSpace({
        name: createName,
        dimensions: createDims,
        ...(createPassword ? { password: createPassword } : {}),
      });
      setShowCreate(false);
      joinSpace(spaceId);
    } catch {
      setError("Failed to create space");
    } finally {
      setCreateLoading(false);
    }
  };

  const CharPicker = () => (
    <>
      <SectionLabel>Choose your character</SectionLabel>
      <CharPickerRow>
        {CHARACTERS.map((c) => (
          <CharButton
            key={c}
            selected={selectedChar === c}
            onClick={() => setSelectedChar(c)}
          >
            {c}
          </CharButton>
        ))}
      </CharPickerRow>
    </>
  );

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
            <CharPicker />
            <TextField
              label="Name"
              variant="outlined"
              color="secondary"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              fullWidth
            />
            <TextField
              label="Dimensions (e.g. 200x200)"
              variant="outlined"
              color="secondary"
              value={createDims}
              onChange={(e) => setCreateDims(e.target.value)}
              fullWidth
            />
            <TextField
              label="Password (optional)"
              variant="outlined"
              color="secondary"
              type="password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              color="secondary"
              onClick={handleCreate}
              disabled={createLoading || !createName.trim()}
              fullWidth
            >
              {createLoading ? (
                <CircularProgress size={22} color="inherit" />
              ) : (
                "Create & Join"
              )}
            </Button>
          </>
        ) : (
          <>
            <Header>
              <h2>Join a Space — {username}</h2>
              <IconButton
                onClick={handleSignOut}
                size="small"
                title="Sign out"
                style={{ color: "#aaa" }}
              >
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Header>
            <CharPicker />
            {error && <Alert severity="error">{error}</Alert>}
            {wsError && <Alert severity="error">{wsError}</Alert>}
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => setShowCreate(true)}
            >
              Create new space
            </Button>
            {loading ? (
              <CircularProgress
                color="secondary"
                style={{ alignSelf: "center" }}
              />
            ) : (
              <RoomGrid>
                {/* Public Lobby — always first */}
                <LobbyCard>
                  <CardContent>
                    <Typography
                      variant="h6"
                      style={{
                        color: "#42eacb",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <PeopleIcon /> Public Lobby
                    </Typography>
                    <Typography
                      variant="body2"
                      style={{ color: "#aaa", marginTop: 4 }}
                    >
                      Open to everyone — join and explore together
                    </Typography>
                  </CardContent>
                  <CardActions>
                    <Button
                      size="small"
                      style={{ color: "#42eacb" }}
                      onClick={() => joinSpace("lobby")}
                    >
                      Join Lobby
                    </Button>
                  </CardActions>
                </LobbyCard>

                {spaces.length === 0 ? (
                  <Typography
                    color="textSecondary"
                    style={{ gridColumn: "1/-1", textAlign: "center" }}
                  >
                    No custom spaces yet. Create one!
                  </Typography>
                ) : (
                  spaces.map((s) => (
                    <RoomCard key={s.id}>
                      <CardContent>
                        <Typography variant="h6" style={{ color: "#eee" }}>
                          {s.name}
                          {s.hasPassword && (
                            <LockIcon
                              fontSize="small"
                              style={{ marginLeft: 6, verticalAlign: "middle" }}
                            />
                          )}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {s.dimensions}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          color="secondary"
                          onClick={() => handleJoin(s)}
                        >
                          Join
                        </Button>
                      </CardActions>
                    </RoomCard>
                  ))
                )}
              </RoomGrid>
            )}
          </>
        )}
      </Wrapper>

      <Dialog open={!!joinPasswordId} onClose={() => setJoinPasswordId(null)}>
        <DialogTitle>Room Password</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Password"
            type="password"
            variant="outlined"
            color="secondary"
            value={joinPasswordInput}
            onChange={(e) => setJoinPasswordInput(e.target.value)}
            error={!!joinError}
            helperText={joinError}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setJoinPasswordId(null)}>Cancel</Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleJoinWithPassword}
          >
            Join
          </Button>
        </DialogActions>
      </Dialog>
    </Overlay>
  );
}
