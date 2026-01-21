import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Button, Menu, MenuItem, Stack, Paper, Typography } from "@mui/material";

/**
 * Pannellum nạp từ /public/vendor/. nên truy cập qua window.pannellum
 */
function getPannellum() {
  return window?.pannellum;
}

export default function PanoramaViewer({
  scenes,
  artifacts,
  sceneId,
  onSceneChange,
  onSelectArtifact,
  onYawPitchChange,
  onRequestTogglePanel,
  onRequestOpenPanel,
}) {
  const viewerRef = useRef(null);
  const containerIdRef = useRef(`panorama-${Math.random().toString(16).slice(2)}`);

  // refs để tránh re-init / tránh closure cũ
  const sceneIdRef = useRef(sceneId);
  const callbacksRef = useRef({
    onSceneChange,
    onSelectArtifact,
    onYawPitchChange,
    onRequestOpenPanel,
  });
  const dataRef = useRef({ scenes, artifacts });

  useEffect(() => {
    sceneIdRef.current = sceneId;
  }, [sceneId]);

  useEffect(() => {
    callbacksRef.current = {
      onSceneChange,
      onSelectArtifact,
      onYawPitchChange,
      onRequestOpenPanel,
    };
  }, [onSceneChange, onSelectArtifact, onYawPitchChange, onRequestOpenPanel]);

  useEffect(() => {
    dataRef.current = { scenes, artifacts };
  }, [scenes, artifacts]);

  const [sceneMenuAnchor, setSceneMenuAnchor] = useState(null);

  // ===== DEBUG MODE (Level 3) =====
  const [debugOn, setDebugOn] = useState(false);
  const [debugBox, setDebugBox] = useState({
    open: false,
    x: 0,
    y: 0,
    yaw: 0,
    pitch: 0,
  });

  // Lưu các hotspot đã gắn để remove đúng: { [sceneId]: Set(hotspotId) }
  const appliedHotspotsRef = useRef({});

  // --- Build hotspot data (id rõ ràng để remove) ---
  const buildHotspotsForScene = useCallback((sid) => {
    const hs = [];
    const { artifacts: arts } = dataRef.current;
    const cb = callbacksRef.current;

    // ===== HOTSPOT CHUYỂN KHÔNG GIAN =====
    if (sid === "scene-01") {
      hs.push({
        id: "nav-1-2",
        type: "scene",
        text: "Về không gian 2",
        sceneId: "scene-02",
        pitch: 1.67,
        yaw: -62.01,
      });
    }

    if (sid === "scene-02") {
      hs.push({
        id: "nav-2-1",
        type: "scene",
        text: "Sang không gian 1",
        sceneId: "scene-01",
        pitch: 2.71,
        yaw: 129.85,
      });
      hs.push({
        id: "nav-2-3",
        type: "scene",
        text: "Sang không gian 3",
        sceneId: "scene-03",
        pitch: -3.29,
        yaw: -92.19,
      });
    }

    if (sid === "scene-03") {
      hs.push({
        id: "nav-3-2",
        type: "scene",
        text: "Về không gian 2",
        sceneId: "scene-02",
        pitch: 0.21,
        yaw: 109.41,
      });
    }

    // ===== HOTSPOT HIỆN VẬT =====
    arts
      .filter((a) => a.sceneId === sid)
      .forEach((a) => {
        const yaw = Number(a.yaw);
        const pitch = Number(a.pitch);
        if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;

        hs.push({
          id: `artifact-${a.id}`,
          pitch,
          yaw,
          cssClass: "artifact-hotspot",

          createTooltipFunc: (hotSpotDiv, args) => {
            hotSpotDiv.classList.add("artifact-hotspot");
            hotSpotDiv.style.position = "absolute"; // QUAN TRỌNG
            hotSpotDiv.style.cursor = "pointer";

            const tooltip = document.createElement("div");
            tooltip.className = "artifact-tooltip";
            tooltip.textContent = args.preview || "Xem chi tiết";
            hotSpotDiv.appendChild(tooltip);

            // tránh click lọt xuống viewer (kéo cam / bật debug box)
            hotSpotDiv.addEventListener(
              "click",
              (ev) => {
                ev.stopPropagation();
              },
              true
            );
          },
          createTooltipArgs: { preview: a.preview || a.name },

          clickHandlerFunc: (ev /*, args */) => {
            try {
              ev?.stopPropagation?.();
            } catch {
              // ignore
            }
            cb.onSelectArtifact?.(a.id);
            cb.onRequestOpenPanel?.();
          },
        });
      });

    return hs;
  }, []);

  // --- Apply hotspots (remove + add) đúng scene ---
  const applyHotspots = useCallback(
    (sid) => {
      const viewer = viewerRef.current;
      if (!viewer || !sid) return;

      const map = appliedHotspotsRef.current;
      const oldSet = map[sid];
      if (oldSet && oldSet.size) {
        for (const hid of oldSet) {
          try {
            viewer.removeHotSpot(hid, sid);
          } catch {
            // ignore
          }
        }
      }

      const hs = buildHotspotsForScene(sid);
      const newSet = new Set();

      for (const h of hs) {
        try {
          viewer.addHotSpot(h, sid);
          if (h.id) newSet.add(h.id);
        } catch {
          // ignore
        }
      }

      map[sid] = newSet;
    },
    [buildHotspotsForScene]
  );

  const applyInitialView = useCallback((sid) => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const { scenes: scs } = dataRef.current;
    const sc = scs?.[sid];
    if (!sc) return;

    if (typeof sc.hfov === "number") viewer.setHfov(sc.hfov);
    if (typeof sc.pitch === "number") viewer.setPitch(sc.pitch);
    if (typeof sc.yaw === "number") viewer.setYaw(sc.yaw);
  }, []);

  // helper: loadScene có kèm pitch/yaw/hfov để mobile không reset về (0,0)
  const loadSceneWithView = useCallback((sid) => {
    const viewer = viewerRef.current;
    if (!viewer || !sid) return;

    const sc = dataRef.current?.scenes?.[sid];
    if (sc) {
      viewer.loadScene(
        sid,
        typeof sc.pitch === "number" ? sc.pitch : 0,
        typeof sc.yaw === "number" ? sc.yaw : 0,
        typeof sc.hfov === "number" ? sc.hfov : 100
      );
    } else {
      viewer.loadScene(sid);
    }
  }, []);

  // ✅ FIX CHÍNH: hard-resize để tránh init lúc container chưa ổn định (mobile/reload hay bị)
  useEffect(() => {
    const el = document.getElementById(containerIdRef.current);

    const getCurrentSid = () => {
      const viewer = viewerRef.current;
      if (!viewer) return sceneIdRef.current;
      return typeof viewer.getScene === "function" ? viewer.getScene() : sceneIdRef.current;
    };

    const hardResize = () => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      try {
        viewer.resize(); // ✅ quan trọng
      } catch {
        // ignore
      }
      // chốt lại góc nhìn sau resize (tránh lật/trôi)
      applyInitialView(getCurrentSid());
    };

    // chạy ngay + chạy thêm 1 nhịp trễ cho mobile toolbar / layout settle
    requestAnimationFrame(hardResize);
    setTimeout(hardResize, 150);

    if (!el || typeof ResizeObserver === "undefined") {
      // fallback
      window.addEventListener("resize", hardResize);
      window.addEventListener("orientationchange", hardResize);
      return () => {
        window.removeEventListener("resize", hardResize);
        window.removeEventListener("orientationchange", hardResize);
      };
    }

    const ro = new ResizeObserver(() => hardResize());
    ro.observe(el);

    window.addEventListener("resize", hardResize);
    window.addEventListener("orientationchange", hardResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", hardResize);
      window.removeEventListener("orientationchange", hardResize);
    };
  }, [applyInitialView]);

  // ===== INIT VIEWER (CHỈ 1 LẦN) =====
  useEffect(() => {
    let cancelled = false;
    let tries = 0;

    const init = () => {
      if (cancelled) return;

      const pannellum = getPannellum();
      if (!pannellum) {
        tries += 1;
        if (tries <= 80) setTimeout(init, 50);
        return;
      }

      const { scenes: scs } = dataRef.current;

      const config = {
        default: {
          firstScene: "scene-02",
          sceneFadeDuration: 800,
          autoLoad: true,
          showZoomCtrl: false,
          showFullscreenCtrl: false,
          hotSpotDebug: false,
          // tránh iOS/gyro làm "ngửa" bất thường
          orientationOnByDefault: false,
        },
        scenes: Object.fromEntries(
          Object.entries(scs || {}).map(([sid, sc]) => {
            const baseYaw = typeof sc.yaw === "number" ? sc.yaw : 0;
            const basePitch = typeof sc.pitch === "number" ? sc.pitch : 0;
            const baseHfov = typeof sc.hfov === "number" ? sc.hfov : 100;

            return [
              sid,
              {
                title: sc.title,
                type: "equirectangular",
                panorama: sc.panorama,

                // ✅ đặt default view ngay trong config (mobile hay reset)
                yaw: baseYaw,
                pitch: basePitch,

                hfov: baseHfov,
                minHfov: 30,
                maxHfov: 120,

                hotSpots: [],
              },
            ];
          })
        ),
      };

      viewerRef.current = pannellum.viewer(containerIdRef.current, config);
      const viewer = viewerRef.current;

      let raf = 0;
      const updateCoords = () => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = 0;
          const cb = callbacksRef.current;
          cb.onYawPitchChange?.({ yaw: viewer.getYaw(), pitch: viewer.getPitch() });
        });
      };

      viewer.on("load", () => {
        const sid = typeof viewer.getScene === "function" ? viewer.getScene() : sceneIdRef.current;

        // chốt view + hotspots sau khi load texture
        applyInitialView(sid);
        applyHotspots(sid);
        updateCoords();

        setDebugBox((p) => ({ ...p, open: false }));

        // ✅ thêm 1 nhịp resize sau load để tránh mobile init sai size
        requestAnimationFrame(() => {
          try {
            viewer.resize();
          } catch {
            // ignore
          }
          applyInitialView(sid);
        });
      });

      viewer.on("scenechange", (newSid) => {
        if (!newSid) return;
        if (newSid === sceneIdRef.current) return;
        callbacksRef.current.onSceneChange?.(newSid);
      });

      viewer.on("animate", updateCoords);

      // loadScene kèm view ngay từ đầu
      loadSceneWithView(sceneIdRef.current);
    };

    init();

    return () => {
      cancelled = true;

      try {
        const el = document.getElementById(containerIdRef.current);
        if (el) el.innerHTML = "";
      } catch {
        // ignore
      }

      viewerRef.current = null;
      appliedHotspotsRef.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Khi đổi sceneId -> load scene (kèm view)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const currentSid = typeof viewer.getScene === "function" ? viewer.getScene() : null;
    if (currentSid === sceneId) return;

    loadSceneWithView(sceneId);
    setDebugBox((p) => ({ ...p, open: false }));

    // iOS/Safari: ép lại sau 1 frame cho chắc
    requestAnimationFrame(() => {
      applyInitialView(sceneId);
      applyHotspots(sceneId);
      try {
        viewer.resize(); // ✅ chốt lại projection sau đổi scene
      } catch {
        // ignore
      }
      applyInitialView(sceneId);
    });

    // ép thêm lần nữa sau 150ms để chắc ăn trên mobile
    setTimeout(() => {
      applyInitialView(sceneId);
      try {
        viewer.resize();
      } catch {
        // ignore
      }
    }, 150);
  }, [sceneId, loadSceneWithView, applyInitialView, applyHotspots]);

  // Khi artifacts đổi -> refresh hotspot ở scene hiện tại
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const currentSid =
      typeof viewer.getScene === "function" ? viewer.getScene() : sceneIdRef.current;

    applyHotspots(currentSid);
  }, [artifacts, applyHotspots]);

  // ===== CLICK-TO-COORDS (Level 3) =====
  useEffect(() => {
    const el = document.getElementById(containerIdRef.current);
    if (!el) return;

    const onClick = (e) => {
      if (!debugOn) return;

      const viewer = viewerRef.current;
      if (!viewer) return;

      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      let pitch = null;
      let yaw = null;

      try {
        if (typeof viewer.mouseEventToCoords === "function") {
          const coords = viewer.mouseEventToCoords(e); // [pitch, yaw]
          if (Array.isArray(coords) && coords.length >= 2) {
            pitch = coords[0];
            yaw = coords[1];
          }
        }
      } catch {
        // ignore
      }

      if (pitch == null || yaw == null) {
        pitch = viewer.getPitch();
        yaw = viewer.getYaw();
      }

      setDebugBox({
        open: true,
        x: Math.max(8, Math.min(x, rect.width - 8)),
        y: Math.max(8, Math.min(y, rect.height - 8)),
        yaw,
        pitch,
      });
    };

    el.addEventListener("click", onClick, true);
    return () => el.removeEventListener("click", onClick, true);
  }, [debugOn]);

  const handleResetView = () => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const sc = scenes?.[sceneId];
    if (sc && typeof sc.yaw === "number") viewer.setYaw(sc.yaw);
    else viewer.setYaw(0);

    if (sc && typeof sc.pitch === "number") viewer.setPitch(sc.pitch);
    else viewer.setPitch(0);

    if (sc && typeof sc.hfov === "number") viewer.setHfov(sc.hfov);
    else viewer.setHfov(100);

    // ✅ reset xong resize 1 nhịp để mobile ổn định
    try {
      viewer.resize();
    } catch {
      // ignore
    }
  };

  const copyDebugCoords = async () => {
    const text = `yaw: ${debugBox.yaw.toFixed(2)}, pitch: ${debugBox.pitch.toFixed(2)}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt("Copy tọa độ:", text);
    }
  };

  const sceneTitle = useMemo(() => scenes?.[sceneId]?.title ?? "", [scenes, sceneId]);

  return (
    // ✅ quan trọng: dùng 100vh thay vì 100% để tránh parent height=0 khi mobile/reload
    <Box className="viewer-wrap" sx={{ position: "relative", height: "100vh", width: "100%" }}>
      {/* Top controls */}
      <Box
        sx={{
          position: "absolute",
          top: { xs: 64, sm: 12 }, // mobile: đẩy xuống dưới title
          left: 12,
          right: 12,
          zIndex: 60,
          pointerEvents: "none",
        }}
      >
        <Stack
          direction="row"
          spacing={1}
          sx={{
            justifyContent: { xs: "center", sm: "flex-end" },
            flexWrap: { xs: "wrap", sm: "nowrap" },
            rowGap: 1,
            pointerEvents: "auto",
          }}
        >
          <Button
            variant="outlined"
            size="small"
            onClick={(e) => setSceneMenuAnchor(e.currentTarget)}
            sx={{
              borderRadius: 2,
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(233,238,252,1)",
              bgcolor: "rgba(15,27,51,0.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            Chọn không gian
          </Button>

          <Menu
            anchorEl={sceneMenuAnchor}
            open={Boolean(sceneMenuAnchor)}
            onClose={() => setSceneMenuAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            PaperProps={{
              sx: {
                mt: 1,
                bgcolor: "rgba(15,27,51,0.92)",
                border: "1px solid rgba(255,255,255,0.10)",
                backdropFilter: "blur(10px)",
                color: "rgba(233,238,252,1)",
                borderRadius: 2,
                minWidth: 220,
              },
            }}
          >
            {Object.entries(scenes || {}).map(([sid, sc]) => (
              <MenuItem
                key={sid}
                selected={sid === sceneId}
                onClick={() => {
                  setSceneMenuAnchor(null);
                  if (sid !== sceneId) callbacksRef.current.onSceneChange?.(sid);
                }}
              >
                {sc.title}
              </MenuItem>
            ))}
          </Menu>

          <Button
            variant="outlined"
            size="small"
            onClick={onRequestTogglePanel}
            sx={{
              borderRadius: 2,
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(233,238,252,1)",
              bgcolor: "rgba(15,27,51,0.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            Đóng/Mở thông tin
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={handleResetView}
            sx={{
              borderRadius: 2,
              borderColor: "rgba(255,255,255,0.15)",
              color: "rgba(233,238,252,1)",
              bgcolor: "rgba(15,27,51,0.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            Reset góc nhìn
          </Button>

          <Button
            variant="outlined"
            size="small"
            onClick={() => setDebugOn((v) => !v)}
            sx={{
              borderRadius: 2,
              borderColor: "rgba(255,255,255,0.15)",
              color: debugOn ? "rgba(15,27,51,1)" : "rgba(233,238,252,1)",
              bgcolor: debugOn ? "rgba(255,209,102,0.95)" : "rgba(15,27,51,0.55)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
            }}
          >
            Debug: {debugOn ? "ON" : "OFF"}
          </Button>
        </Stack>
      </Box>

      {/* Pannellum container */}
      <div id={containerIdRef.current} style={{ width: "100%", height: "100%" }} />

      {/* Debug box */}
      {debugOn && debugBox.open && (
        <Paper
          elevation={0}
          sx={{
            position: "absolute",
            left: debugBox.x,
            top: debugBox.y,
            transform: "translate(-50%, -110%)",
            zIndex: 80,
            p: 1.2,
            minWidth: 190,
            bgcolor: "rgba(15,27,51,0.92)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(10px)",
            borderRadius: 2,
            color: "rgba(233,238,252,1)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 13, mb: 0.6 }}>
            Tọa độ tại điểm click
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            yaw: {Number(debugBox.yaw).toFixed(2)}
          </Typography>
          <Typography sx={{ fontSize: 12, opacity: 0.9 }}>
            pitch: {Number(debugBox.pitch).toFixed(2)}
          </Typography>

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button size="small" variant="contained" onClick={copyDebugCoords}>
              COPY
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setDebugBox((p) => ({ ...p, open: false }))}
            >
              TẮT
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
}
