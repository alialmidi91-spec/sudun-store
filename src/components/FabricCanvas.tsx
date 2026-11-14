import { useEffect, useRef } from 'react';

const vertexSource = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const fragmentSource = `
precision mediump float;
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform float u_time;
uniform float u_motion;

float wave(vec2 p, float t) {
  float a = sin(p.x * 2.7 + t * 0.42 + sin(p.y * 3.2 - t * 0.22) * 0.8);
  float b = cos(p.y * 3.6 - t * 0.31 + sin(p.x * 2.0 + t * 0.18));
  float c = sin((p.x + p.y) * 2.1 + t * 0.24);
  return a * 0.48 + b * 0.34 + c * 0.18;
}

void main() {
  vec2 uv = v_uv;
  vec2 p = uv - 0.5;
  p.x *= u_resolution.x / max(u_resolution.y, 1.0);
  vec2 pointer = (u_pointer - 0.5) * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0);
  float t = u_time * u_motion;

  float pull = exp(-length(p - pointer) * 2.4) * 0.18;
  float drift = wave(p + vec2(pull, -pull), t);
  float foldA = sin((p.x * 2.4 + p.y * 1.1 + drift * 0.58) * 5.2 + t * 0.3);
  float foldB = cos((p.x * -1.5 + p.y * 2.8 + drift * 0.42) * 4.1 - t * 0.24);
  float folds = foldA * 0.58 + foldB * 0.42;
  float ridge = pow(max(0.0, 1.0 - abs(folds)), 7.0);
  float sheen = pow(max(0.0, 1.0 - abs(folds + drift * 0.24)), 18.0);

  vec3 deep = vec3(0.075, 0.052, 0.043);
  vec3 bronze = vec3(0.34, 0.235, 0.17);
  vec3 silk = vec3(0.78, 0.66, 0.53);
  float light = 0.12 + 0.13 * drift + ridge * 0.2 + sheen * 0.46;
  vec3 color = mix(deep, bronze, smoothstep(-0.75, 0.85, folds + drift * 0.35));
  color = mix(color, silk, sheen * 0.32 + ridge * 0.12);
  color *= light + 0.68;
  float vignette = 1.0 - smoothstep(0.18, 0.92, length((uv - 0.5) * vec2(1.0, 0.78)));
  color *= 0.68 + vignette * 0.32;
  gl_FragColor = vec4(color, 0.58);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Procedural silk surface: GPU shader, pointer-responsive folds, and reduced-motion support. */
export function FabricCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) {
      canvas.dataset.fallback = 'true';
      return;
    }

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) {
      canvas.dataset.fallback = 'true';
      return;
    }
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      canvas.dataset.fallback = 'true';
      return;
    }

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const pointer = gl.getUniformLocation(program, 'u_pointer');
    const time = gl.getUniformLocation(program, 'u_time');
    const motion = gl.getUniformLocation(program, 'u_motion');
    const cursor = { x: 0.72, y: 0.46 };
    let frame = 0;
    let elapsed = 0;
    let previous = 0;
    let visible = true;
    let disposed = false;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, window.matchMedia('(max-width: 599px)').matches ? 1 : 1.35);
      const width = Math.max(1, Math.round(rect.width * dpr));
      const height = Math.max(1, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.uniform2f(resolution, width, height);
      }
    };
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      cursor.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      cursor.y = 1 - Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    };
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame && !disposed) frame = requestAnimationFrame(render);
      if (!visible && frame) { cancelAnimationFrame(frame); frame = 0; }
    }, { threshold: 0.02 });
    observer.observe(canvas);
    canvas.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('resize', resize, { passive: true });
    resize();

    function render(now: number) {
      if (disposed || !visible) { frame = 0; return; }
      // Cap GPU draws at ~30 FPS: keeps the silk motion smooth while reducing
      // fragment-shader work on mid-range phones and battery-powered devices.
      if (previous && now - previous < 1000 / 30) {
        frame = requestAnimationFrame(render);
        return;
      }
      if (previous) elapsed += Math.min((now - previous) / 1000, 0.05);
      previous = now;
      gl.useProgram(program);
      gl.uniform2f(pointer, cursor.x, cursor.y);
      gl.uniform1f(time, elapsed);
      gl.uniform1f(motion, reduced.matches ? 0.0 : 1.0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (reduced.matches) { frame = 0; return; }
      frame = requestAnimationFrame(render);
    }
    frame = requestAnimationFrame(render);

    const onMotionChange = () => {
      if (!reduced.matches && visible && !frame) frame = requestAnimationFrame(render);
      if (reduced.matches && frame) { cancelAnimationFrame(frame); frame = 0; render(performance.now()); }
    };
    reduced.addEventListener?.('change', onMotionChange);

    return () => {
      disposed = true;
      if (frame) cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener('pointermove', onPointer);
      window.removeEventListener('resize', resize);
      reduced.removeEventListener?.('change', onMotionChange);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
    };
  }, []);

  return <canvas ref={canvasRef} className="fabric-canvas" aria-hidden="true" />;
}
