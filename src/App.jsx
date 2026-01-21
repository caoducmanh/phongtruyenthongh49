import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Drawer,
  Stack,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Divider,
} from "@mui/material";

import PanoramaViewer from "./components/PanoramaViewer.jsx";
import { SCENES } from "./data/scenes.js";
import { ARTIFACTS } from "./data/artifacts.js";

const DRAWER_W = 380;

export default function App() {
  const [sceneId, setSceneId] = useState("scene-02"); // mở mặc định không gian 2
  const [panelOpen, setPanelOpen] = useState(() => window.innerWidth >= 900);
  const [selectedArtifactId, setSelectedArtifactId] = useState(null);
  const [yawPitch, setYawPitch] = useState({ yaw: null, pitch: null });

  const selectedArtifact = useMemo(() => {
    return ARTIFACTS.find((a) => a.id === selectedArtifactId) ?? null;
  }, [selectedArtifactId]);

  const headerTitle = "Phòng Truyền Thống Lữ đoàn 249";
  const headerSub = "360 độ";

  return (
    <Box sx={{ height: "100%", position: "relative" }}>
      {/* Viewer */}
      <Box
        className="viewer-wrap"
        sx={{
          height: "100%",
          position: "relative",
          mr: panelOpen ? `${DRAWER_W}px` : 0,
          transition: "margin-right .22s ease",
        }}
      >
        {/* Top overlay bar */}
        <Box
          sx={{
            position: "absolute",
            left: 14,
            top: 14,
            right: 14,
            zIndex: 50,
            pointerEvents: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              pointerEvents: "auto",
              px: 1.5,
              py: 1.2,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(15,27,51,.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 40px rgba(0,0,0,.45)",
              display: "flex",
              alignItems: "baseline",
              gap: 1.2,
              minWidth: 0,
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
              {headerTitle}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.75 }}>
              {headerSub}
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} sx={{ pointerEvents: "auto" }} />
        </Box>

        <PanoramaViewer
          scenes={SCENES}
          artifacts={ARTIFACTS}
          sceneId={sceneId}
          onSceneChange={(id) => {
            if (id === sceneId) return;
            setSceneId(id);
            setSelectedArtifactId(null);
          }}
          onSelectArtifact={(artifactId) => {
            setSelectedArtifactId(artifactId);
            setPanelOpen(true);
          }}
          onYawPitchChange={(next) => setYawPitch(next)}
          onRequestTogglePanel={() => setPanelOpen((v) => !v)}
          onRequestOpenPanel={() => setPanelOpen(true)}
        />

        {/* Hint */}
        <Box
          sx={{
            position: "absolute",
            left: 14,
            right: 14,
            bottom: 14,
            zIndex: 50,
            pointerEvents: "none",
            display: "flex",
            justifyContent: "space-between",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              pointerEvents: "auto",
              maxWidth: "60ch",
              px: 1.5,
              py: 1.2,
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(15,27,51,.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 40px rgba(0,0,0,.45)",
              color: "rgba(233,238,252,.75)",
              fontSize: 12,
              lineHeight: 1.35,
            }}
          >
            Kéo chuột để xoay. Lăn chuột để zoom. Di chuột vào điểm để xem tên, nhấp để mở thông tin chi tiết bên phải.
          </Box>
        </Box>
      </Box>

      {/* Right info panel */}
      <Drawer
        variant="persistent"
        anchor="right"
        open={panelOpen}
        sx={{
          width: DRAWER_W,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_W,
            boxSizing: "border-box",
          },
        }}
        PaperProps={{
          sx: {
            bgcolor: "rgba(15,27,51,0.98)",
            backgroundImage: "linear-gradient(180deg, rgba(255,255,255,.02), transparent 35%)",
            borderLeft: "1px solid rgba(255,255,255,.10)",
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.8,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "var(--hotspot)" }}>
              {selectedArtifact ? "Thông tin hiện vật" : "Chưa chọn hiện vật"}
            </Typography>
            <Typography variant="caption" sx={{ color: "var(--muted)", opacity: 0.75 }}>
              {selectedArtifact
                ? "Chi tiết hiển thị theo điểm bạn đã chọn."
                : "Nhấp vào một điểm trên ảnh 360° để xem chi tiết."}
            </Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setPanelOpen(false)}
            sx={{ borderColor: "rgba(255,255,255,.15)", color: "rgba(233,238,252,1)" }}
          >
            Đóng
          </Button>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />

        <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
          <Card
            sx={{
              borderRadius: 2,
              border: "1px solid rgba(255,255,255,.10)",
              bgcolor: "rgba(12,23,48,.65)",
              boxShadow: "0 12px 40px rgba(0,0,0,.45)",
              overflow: "hidden",
            }}
          >
            {selectedArtifact?.image ? (
              <CardMedia
                component="img"
                image={selectedArtifact.image}
                alt="Ảnh hiện vật"
                sx={{ aspectRatio: "16 / 10", objectFit: "cover" }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : (
              <Box
                sx={{
                  aspectRatio: "16 / 10",
                  display: "grid",
                  placeItems: "center",
                  bgcolor: "rgba(255,255,255,.04)",
                  color: "rgba(233,238,252,.75)",
                  fontSize: 12,
                  p: 2,
                  textAlign: "center",
                }}
              >
                Chưa có ảnh hiển thị.
              </Box>
            )}

            <CardContent>
              <Typography
                variant="h6"
                sx={{
                  color: "rgba(255, 255, 255, 0.75)",
                  fontSize: 22,
                  fontWeight: 800,
                  mb: 0.8,
                }}
              >
                {selectedArtifact?.name ?? "—"}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  whiteSpace: "pre-line",
                  color: "rgba(255, 255, 255, 0.75)",
                  lineHeight: 1.5,
                  fontSize: 13,
                }}
              >
                {selectedArtifact?.description ??
                  "Vui lòng chọn một điểm hiện vật để hiển thị nội dung."}
              </Typography>
            </CardContent>
          </Card>
        </Box>

        <Divider sx={{ borderColor: "rgba(255,255,255,.10)" }} />

        <Box
          sx={{
            px: 2,
            py: 1.4,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(233,238,252,.75)",
            fontSize: 12,
          }}
        >
          <span>© Phòng truyền thống Lữ đoàn 249</span>
        </Box>
      </Drawer>
    </Box>
  );
}
