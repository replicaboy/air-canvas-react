import React, { useRef, useEffect, useState } from 'react';

const Hands = window.Hands;
const Camera = window.Camera;

const calculateDistance = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  const potentialClickTargetRef = useRef([null, null]); 
  const pinchStartTimeRef = useRef([null, null]);
  const isDraggingInProgressRef = useRef([false, false]);
  
  const lastIndexPosRef = useRef([{ x: 0, y: 0 }, { x: 0, y: 0 }]);
  const indexPosHistoryRef = useRef([[], []]); 
  const pastPinchedRef = useRef([false, false]); 
  const lastActionTimeRef = useRef([0, 0]); 
  
  // Close buttons ki position track karne ke liye (Multiple windows ke liye)
  const closeButtonsRef = useRef({});
  
  const hologramsRef = useRef([
    { id: 1, x: 250, y: 200, r: 55, color: '#00FFFF', label: 'SYSTEM A', isOpen: false, draggedBy: null, description: 'SYSTEM A: CPU 12%, MEM 45%, DISK 8%, UPTIME: 12H' },
    { id: 2, x: 640, y: 150, r: 75, color: '#FF00FF', label: 'MAIN CORE', isOpen: false, draggedBy: null, description: 'MAIN CORE: TEMP 45°C, V_1.2V, LOAD 89%' },
    { id: 3, x: 1030, y: 200, r: 50, color: '#00FF00', label: 'MODULE 3', isOpen: false, draggedBy: null, description: 'MODULE 3: STATUS: UP, V_5V, UPTIME: 12H' },
    { id: 4, x: 200, y: 480, r: 65, color: '#FFA500', label: 'RADAR', isOpen: false, draggedBy: null, description: 'RADAR: SCANNING SECTOR 7..., NO THREATS DETECTED' },
    { id: 5, x: 1080, y: 480, r: 60, color: '#FF0000', label: 'WEAPONS', isOpen: false, draggedBy: null, description: 'WEAPONS: OFFLINE., AWAITING AUTHORIZATION CODE.' },
    { id: 6, x: 450, y: 600, r: 55, color: '#4169E1', label: 'SHIELDS', isOpen: false, draggedBy: null, description: 'SHIELDS: CAPACITY AT 94%., FLUX STEADY.' },
    { id: 7, x: 830, y: 600, r: 50, color: '#FFFF00', label: 'COMMS', isOpen: false, draggedBy: null, description: 'COMMS: ENCRYPTED CHANNEL OPEN., SIGNAL STRENGTH 100%' }
  ]);
  
  useEffect(() => {
    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    const canvasCtx = canvasElement.getContext('2d');
    const startTime = Date.now();

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915/${file}`
    });

    hands.setOptions({
      maxNumHands: 2, 
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    const drawHexagon = (ctx, x, y, r, color) => {
        ctx.save();
        ctx.lineWidth = 4;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(x + r * Math.cos(i * 2 * Math.PI / 6 + Math.PI / 6), y + r * Math.sin(i * 2 * Math.PI / 6 + Math.PI / 6));
        }
        ctx.closePath();
        ctx.stroke();

        ctx.shadowBlur = 0; 
        ctx.fillStyle = `${color}44`; 
        ctx.fill();
        ctx.restore();
    }

    const drawScrollingCode = (ctx, x, y, r, currentTime) => {
        ctx.save();
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 12px Orbitron, sans-serif'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const binaryStrings = ["01101", "10010", "11011", "00100", "11100", "CODE:", "RUN:", "SYS:"];
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            ctx.lineTo(x + r * Math.cos(i * 2 * Math.PI / 6 + Math.PI / 6), y + r * Math.sin(i * 2 * Math.PI / 6 + Math.PI / 6));
        }
        ctx.closePath();
        ctx.clip();

        const lineHeight = 16;
        const numLines = Math.floor(r * 2 / lineHeight);
        const yOffset = (currentTime / 100) % lineHeight; 
        
        for (let i = 0; i < numLines; i++) {
            const textIdx = Math.floor(((currentTime / 100) + (i * 10)) % binaryStrings.length);
            const text = binaryStrings[textIdx];
            const textY = y - r + i * lineHeight + yOffset;
            ctx.fillText(text, x, textY);
        }
        ctx.restore();
    }
    
    // NAYA: Ab Open Panel apne Hologram ke center (x,y) par draw hoga, chhota size.
    const drawOpenPanel = (ctx, hologram) => {
        const width = 360;
        const height = 220;
        ctx.save();
        ctx.fillStyle = 'rgba(5, 5, 20, 0.85)'; 
        ctx.strokeStyle = hologram.color;
        ctx.lineWidth = 2;
        ctx.shadowBlur = 15;
        ctx.shadowColor = hologram.color;

        let x = hologram.x - width / 2;
        let y = hologram.y - height / 2;
        
        // Screen ke bahar na jaye isliye clamp kar diya
        x = Math.max(10, Math.min(x, 1280 - width - 10));
        y = Math.max(10, Math.min(y, 720 - height - 10));

        ctx.strokeRect(x, y, width, height);
        ctx.fill();
        
        ctx.fillStyle = hologram.color;
        ctx.font = 'bold 20px Orbitron, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(hologram.label, x + 15, y + 30);

        ctx.fillStyle = '#FFF';
        ctx.font = '14px Orbitron, sans-serif';
        
        const lines = hologram.description.split(', ');
        lines.forEach((line, idx) => {
            ctx.fillText(line, x + 15, y + 65 + (idx * 22));
        });
        
        ctx.lineWidth = 1;
        ctx.strokeStyle = hologram.color;
        ctx.beginPath();
        ctx.moveTo(x + 15, y + 140);
        ctx.lineTo(x + width - 15, y + 140);
        ctx.stroke();
        
        const mockGraphY = y + 175;
        ctx.strokeStyle = `${hologram.color}aa`;
        ctx.beginPath();
        ctx.moveTo(x + 15, mockGraphY);
        for (let i = 0; i < (width - 30) / 10; i++) {
            ctx.lineTo(x + 15 + i * 10, mockGraphY + Math.random() * 20 - 10);
        }
        ctx.stroke();

        const closeBtnX = x + width - 25;
        const closeBtnY = y + 25;
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FF4444'; 
        ctx.shadowBlur = 0; 
        ctx.textAlign = 'center';
        ctx.strokeText('X', closeBtnX, closeBtnY);
        
        // Is specific panel ke close button ki position save karo
        closeButtonsRef.current[hologram.id] = { x: closeBtnX, y: closeBtnY, r: 25 };
        
        ctx.restore();
    }

    hands.onResults((results) => {
      if (!isLoaded) setIsLoaded(true);

      const currentTime = Date.now() - startTime;
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      const holograms = hologramsRef.current;
      
      closeButtonsRef.current = {}; // Har frame par reset karna zaroori hai

      // SABHI MODULES KO DRAW KARO (Jo open hain unhe panel, jo band hain unhe hexagon)
      holograms.forEach(h => {
        if (h.isOpen) {
            drawOpenPanel(canvasCtx, h);
        } else {
            drawHexagon(canvasCtx, h.x, h.y, h.r, h.color);
            drawScrollingCode(canvasCtx, h.x, h.y, h.r, currentTime + h.id * 100); 
            
            canvasCtx.fillStyle = '#FFF';
            canvasCtx.font = 'bold 16px Orbitron, sans-serif';
            canvasCtx.textAlign = 'center';
            canvasCtx.textBaseline = 'top';
            canvasCtx.fillText(h.label, h.x, h.y + h.r + 10);
        }
      });

      const numHands = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

      for (let i = numHands; i < 2; i++) {
          pastPinchedRef.current[i] = false;
          holograms.forEach(h => {
              if (h.draggedBy === i) {
                  h.isDragging = false;
                  h.draggedBy = null;
              }
          });
          potentialClickTargetRef.current[i] = null;
          isDraggingInProgressRef.current[i] = false;
          indexPosHistoryRef.current[i] = [];
      }

      for (let i = 0; i < numHands; i++) {
        if (i >= 2) break; 

        const landmarks = results.multiHandLandmarks[i];
        
        const indexTip = { x: (1 - landmarks[8].x) * canvasElement.width, y: landmarks[8].y * canvasElement.height };
        const thumbTip = { x: (1 - landmarks[4].x) * canvasElement.width, y: landmarks[4].y * canvasElement.height };

        const midX = (indexTip.x + thumbTip.x) / 2;
        const midY = (indexTip.y + thumbTip.y) / 2;
        
        indexPosHistoryRef.current[i].push(indexTip);
        if (indexPosHistoryRef.current[i].length > 10) indexPosHistoryRef.current[i].shift();

        const pinchDistance = calculateDistance(indexTip.x, indexTip.y, thumbTip.x, thumbTip.y);
        const isPinched = pinchDistance < 40;
        
        canvasCtx.save();
        canvasCtx.beginPath();
        canvasCtx.arc(indexTip.x, indexTip.y, isPinched ? 15 : 10, 0, 2 * Math.PI);
        canvasCtx.shadowBlur = 20;
        canvasCtx.shadowColor = i === 0 ? '#00FFFF' : '#FF00FF'; 
        canvasCtx.fillStyle = isPinched ? '#FFFFFF' : 'rgba(255, 255, 255, 0.5)';
        canvasCtx.fill();
        canvasCtx.restore();

        // ---- SINGLE CLICK LOGIC (Index Dwell) ----
        const canTriggerClick = (currentTime - lastActionTimeRef.current[i]) > 500;
        const history = indexPosHistoryRef.current[i];
        
        if (history.length >= 5 && Math.hypot(indexTip.x - thumbTip.x, indexTip.y - thumbTip.y) > 70 && canTriggerClick) {
            const dwellingframes = history.slice(-5);
            let totalVariation = 0;
            for (let j = 1; j < dwellingframes.length; j++) {
                totalVariation += Math.hypot(dwellingframes[j].x - dwellingframes[j-1].x, dwellingframes[j].y - dwellingframes[j-1].y);
            }
            const swiftMovement = Math.hypot(indexTip.x - lastIndexPosRef.current[i].x, indexTip.y - lastIndexPosRef.current[i].y);
            
            if (totalVariation < 20 && swiftMovement > 25) {
                lastActionTimeRef.current[i] = currentTime; 
                
                // 1. Check if user clicked any 'X' close button
                let closedViaX = false;
                for (let id in closeButtonsRef.current) {
                    const cb = closeButtonsRef.current[id];
                    if (calculateDistance(indexTip.x, indexTip.y, cb.x, cb.y) < cb.r) {
                        const h = holograms.find(ho => ho.id === parseInt(id));
                        if (h) h.isOpen = false;
                        closedViaX = true;
                        break;
                    }
                }
                
                // 2. Otherwise, check if user clicked a module to toggle it
                if (!closedViaX) {
                    for (let j = holograms.length - 1; j >= 0; j--) {
                        const h = holograms[j];
                        const clickArea = h.isOpen ? 150 : h.r; // Open panels have bigger click area
                        if (calculateDistance(indexTip.x, indexTip.y, h.x, h.y) < clickArea) {
                            h.isOpen = !h.isOpen; // TOGGLE OPEN/CLOSE (Sirf ek ko, dusre band nahi honge)
                            break;
                        }
                    }
                }
            }
        }
        lastIndexPosRef.current[i] = { x: indexTip.x, y: indexTip.y };

        // ---- PINCH TO DRAG LOGIC ----
        const justPinched = !pastPinchedRef.current[i] && isPinched;
        const justReleased = pastPinchedRef.current[i] && !isPinched;
        pastPinchedRef.current[i] = isPinched;

        if (justPinched) {
            pinchStartTimeRef.current[i] = currentTime; 
            
            let target = null;
            for (let j = holograms.length - 1; j >= 0; j--) {
                const h = holograms[j];
                const grabRadius = h.isOpen ? 160 : h.r; // NAYA: Open panel ko pakadne ke liye bada radius
                
                if (calculateDistance(midX, midY, h.x, h.y) < grabRadius && h.draggedBy !== (1 - i)) {
                    target = h;
                    break;
                }
            }
            if (target) {
                potentialClickTargetRef.current[i] = target;
                isDraggingInProgressRef.current[i] = false;
            }
        }

        if (isPinched && potentialClickTargetRef.current[i]) {
            const holdTime = currentTime - pinchStartTimeRef.current[i];
            if (holdTime > 300) {
              potentialClickTargetRef.current[i].isDragging = true;
              potentialClickTargetRef.current[i].draggedBy = i; 
              isDraggingInProgressRef.current[i] = true;
              potentialClickTargetRef.current[i] = null; 
            }
        }

        holograms.forEach(h => {
            if (h.isDragging && h.draggedBy === i) {
              h.x = midX;
              h.y = midY;
            }
        });
        
        // QUICK PINCH TO TOGGLE (Release)
        if (justReleased) {
            const holdTime = currentTime - pinchStartTimeRef.current[i];
            
            if (holdTime < 300 && canTriggerClick) {
                lastActionTimeRef.current[i] = currentTime; 
                
                if (potentialClickTargetRef.current[i]) {
                   const h = potentialClickTargetRef.current[i];
                   h.isOpen = !h.isOpen; // TOGGLE OPEN/CLOSE
                }
            }
            
            holograms.forEach(h => {
                if (h.draggedBy === i) {
                    h.isDragging = false;
                    h.draggedBy = null;
                }
            });
            potentialClickTargetRef.current[i] = null;
            isDraggingInProgressRef.current[i] = false;
        }
      }
    });

    if (videoElement) {
      const camera = new Camera(videoElement, {
        onFrame: async () => {
          await hands.send({ image: videoElement });
        },
        width: 1280,
        height: 720
      });
      camera.start();
    }
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', backgroundColor: '#050510', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      
      <h2 style={{ color: isLoaded ? '#00FFFF' : '#FFD700', marginBottom: '20px', fontFamily: 'Orbitron, sans-serif', textTransform: 'uppercase', letterSpacing: '2px', textAlign: 'center' }}>
        {isLoaded ? "J.A.R.V.I.S: Multi-Window Interface. Open Multiple Panels. Drag even while Open." : "Booting Iron Man UI..."}
      </h2>

      <div style={{ position: 'relative', width: '900px', maxWidth: '95vw', aspectRatio: '16/9', backgroundColor: '#000', borderRadius: '15px', border: '2px solid #00FFFF', overflow: 'hidden', boxShadow: '0px 0px 30px rgba(0,255,255,0.2)' }}>
        
        <video 
          ref={videoRef} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', transform: 'scaleX(-1)', objectFit: 'cover', opacity: 0.2 }} 
          autoPlay 
          playsInline
        ></video>
        
        <canvas 
          ref={canvasRef} 
          width={1280} 
          height={720}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 10, objectFit: 'cover' }}
        ></canvas>

      </div>
    </div>
  );
}

export default App;