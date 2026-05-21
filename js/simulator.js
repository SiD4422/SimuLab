/**
 * SimuLab Frontend Emulator Engine
 * Phase 2: avr8js CPU loop
 * Phase 3: Hardware bridge — GPIO (LED), USART (Serial monitor)
 *
 * Dependencies (add to your HTML or bundler):
 *   <script type="module"> ... </script>   ← ES module
 *   npm install avr8js   (or use CDN below)
 *
 * CDN (no bundler):
 *   import { ... } from 'https://esm.sh/avr8js@latest'
 */

import {
  CPU,
  AVRIOPort,
  AVRUSART,
  portBConfig,
  usart0Config,
  PinState,
  avrInstruction,
  AVRTimer,
  timer0Config,
  timer1Config,
  timer2Config,
} from "https://esm.sh/avr8js@latest";

import { loadHex } from "https://esm.sh/avr8js@latest/util/load-hex";

// ─── Constants ────────────────────────────────────────────────────────────────
const COMPILE_URL = window.location.origin + "/compile";
const CLOCK_HZ = 16_000_000; // ATmega328P @ 16 MHz
const CYCLES_PER_FRAME = Math.floor(CLOCK_HZ / 60); // ~266k cycles @ 60fps

// ─── Module state ─────────────────────────────────────────────────────────────
let cpu = null;
let portB = null;
let usart = null;
let rafHandle = null;
let isRunning = false;

// ─── Phase 2: startSimulation ─────────────────────────────────────────────────
/**
 * Drop-in replacement for your mock startSimulation().
 * Reads code from #code-editor, compiles, loads into avr8js, starts RAF loop.
 */
export async function startSimulation() {
  stopSimulation(); // clean up any prior run

  const codeEditor = document.getElementById("code-editor");
  if (!codeEditor) {
    console.error("[SimuLab] #code-editor not found.");
    return;
  }

  const code = codeEditor.innerText || codeEditor.value || "";

  // ── 1. Compile ──────────────────────────────────────────────────────────────
  let hex;
  try {
    setStatus("Compiling…");
    const resp = await fetch(COMPILE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      setStatus("Compile error — see console.");
      console.error("[SimuLab] Compile error:\n", data.details || data.error);
      return;
    }

    hex = data.hex;
  } catch (e) {
    setStatus("Backend unreachable.");
    console.error("[SimuLab] Backend error:", e);
    return;
  }

  // ── 2. Build CPU ────────────────────────────────────────────────────────────
  const programMemory = new Uint16Array(0x8000); // 32KB flash
  loadHex(hex, new Uint8Array(programMemory.buffer));

  cpu = new CPU(programMemory);

  // ── 3. Attach peripherals ────────────────────────────────────────────────────
  portB = new AVRIOPort(cpu, portBConfig);
  usart = new AVRUSART(cpu, usart0Config, CLOCK_HZ);

  // Timers — required for delay() and millis()
  new AVRTimer(cpu, timer0Config);
  new AVRTimer(cpu, timer1Config);
  new AVRTimer(cpu, timer2Config);

  // ── 4. Wire hardware bridge ──────────────────────────────────────────────────
  attachGPIOBridge(portB);
  attachUSARTBridge(usart);

  // ── 5. RAF execution loop ────────────────────────────────────────────────────
  isRunning = true;
  setStatus("Running");

  function tick() {
    if (!isRunning) return;

    for (let i = 0; i < CYCLES_PER_FRAME; i++) {
      avrInstruction(cpu);
      cpu.tick(); // advances timers, handles interrupts
    }

    rafHandle = requestAnimationFrame(tick);
  }

  rafHandle = requestAnimationFrame(tick);
}

// ─── Stop simulation ──────────────────────────────────────────────────────────
export function stopSimulation() {
  isRunning = false;
  if (rafHandle !== null) {
    cancelAnimationFrame(rafHandle);
    rafHandle = null;
  }
  cpu = null;
  portB = null;
  usart = null;
  setStatus("Stopped");
}

// ─── Phase 3a: GPIO / LED bridge ─────────────────────────────────────────────
/**
 * Listens to Port B pin changes.
 * Arduino Pin 13 = PB5 (bit 5 of Port B).
 *
 * When emulator drives PB5 HIGH/LOW, finds led-bulb-cXXXX DOM element
 * and toggles LED appearance.
 *
 * Convention: your LED component element has id="led-bulb-cXXXX"
 * AND a data attribute:  data-pin="13"
 * (or we fall back to finding any LED wired to D13 via your circuit map)
 */
function attachGPIOBridge(portB) {
  portB.addListener((pin, state) => {
    const arduinoPin = portBPinToArduino(pin);
    notifyPinChange(arduinoPin, state === PinState.High);
  });
}

/** Map Port B bit index → Arduino digital pin number */
function portBPinToArduino(bit) {
  // PB0=D8, PB1=D9, PB2=D10, PB3=D11, PB4=D12, PB5=D13
  return 8 + bit;
}

/**
 * Toggles the LED DOM element for a given Arduino pin.
 * Finds elements matching:  [data-pin="<pin>"]  inside .led-bulb containers.
 * Adjust selector to match your actual DOM structure.
 */
function notifyPinChange(arduinoPin, isHigh) {
  // Try data-pin attribute first (recommended approach)
  const ledByPin = document.querySelector(
    `.led-bulb[data-pin="${arduinoPin}"], [id^="led-bulb-"][data-pin="${arduinoPin}"]`
  );

  if (ledByPin) {
    setLEDState(ledByPin, isHigh);
    return;
  }

  // Fallback: scan circuit component map if you maintain one
  // e.g. window.SimuLab.componentPinMap is a Map<componentId, {pin, type}>
  if (window.SimuLab && window.SimuLab.componentPinMap) {
    for (const [compId, info] of window.SimuLab.componentPinMap.entries()) {
      if (info.type === "led" && info.pin === arduinoPin) {
        const el = document.getElementById(`led-bulb-${compId}`);
        if (el) setLEDState(el, isHigh);
      }
    }
  }
}

/**
 * Visual LED toggle.
 * ON:  bright yellow glow
 * OFF: dark, no glow
 */
function setLEDState(el, isHigh) {
  if (isHigh) {
    el.style.background =
      "radial-gradient(circle at 40% 35%, #fff9c4, #ffeb3b 60%, #f9a825)";
    el.style.boxShadow =
      "0 0 8px 3px rgba(255, 235, 59, 0.85), 0 0 20px 6px rgba(255, 193, 7, 0.5)";
    el.classList.add("led-on");
    el.classList.remove("led-off");
  } else {
    el.style.background =
      "radial-gradient(circle at 40% 35%, #616161, #424242 70%, #212121)";
    el.style.boxShadow = "none";
    el.classList.add("led-off");
    el.classList.remove("led-on");
  }
}

// ─── Phase 3b: USART / Serial bridge ─────────────────────────────────────────
/**
 * Pipes avr8js USART0 TX bytes → your addSerialLine() function.
 * Buffers partial lines; flushes on '\n'.
 */
function attachUSARTBridge(usart) {
  let lineBuffer = "";

  usart.onByteTransmit = (byte) => {
    const char = String.fromCharCode(byte);

    if (char === "\n") {
      const line = lineBuffer.trimEnd(); // strip trailing \r
      if (line.length > 0) {
        // addSerialLine(type, message) — your existing function
        if (typeof window.addSerialLine === "function") {
          window.addSerialLine("val", line);
        } else {
          console.log("[Serial]", line);
        }
      }
      lineBuffer = "";
    } else if (char !== "\r") {
      lineBuffer += char;

      // Safety: flush very long lines without newline
      if (lineBuffer.length > 512) {
        if (typeof window.addSerialLine === "function") {
          window.addSerialLine("val", lineBuffer);
        }
        lineBuffer = "";
      }
    }
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function setStatus(msg) {
  // Update your status bar if you have one
  const statusEl = document.getElementById("sim-status");
  if (statusEl) statusEl.textContent = msg;
  console.log(`[SimuLab] ${msg}`);
}

// ─── Expose to window for non-module callers ──────────────────────────────────
window.startSimulation = startSimulation;
window.stopSimulation = stopSimulation;
