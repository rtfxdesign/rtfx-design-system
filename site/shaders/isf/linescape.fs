/*{
	"DESCRIPTION": "Linescape V2 - REVd audio-reactive rework. Retro wireframe terrain drawn as stacked horizon scanlines. Bass lifts the ridge amplitude and drops the camera at frame centre, mid offsets each depth slice so ridges roll away from the viewer in sequence, high thins the scanlines at the rim, and the terrain scroll is beat-locked.",
	"CREDIT": "Original 'XBE' retro terrain by an unnamed Shadertoy author - https://www.shadertoy.com/view/4dfSDj, ISF conversion by Imimot, noise by Inigo Quilez. REVd V2 audio rework by REVd Cycling.",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"PASSES": [
		{ "TARGET": "bufA", "PERSISTENT": true, "FLOAT": true },
		{ }
	],
	"INPUTS": [
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Speed / BPM Mult" },
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (ridge height)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (depth roll)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (line detail)" },
		{ "NAME": "beatPunch", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Beat Punch" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "travel", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Travel Rate" },
		{ "NAME": "relief", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 2.0, "LABEL": "Relief" },
		{ "NAME": "slices", "TYPE": "float", "DEFAULT": 20.0, "MIN": 4.0, "MAX": 40.0, "LABEL": "Depth Slices" },
		{ "NAME": "Offset_X", "TYPE": "float", "DEFAULT": 1.0, "MIN": -20.0, "MAX": 20.0, "LABEL": "Terrain Offset" },
		{ "NAME": "tint", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Palette Tint (0 = mono)" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0, 1, 2, 3, 4, 5], "LABELS": ["Custom", "Recovery", "Endurance", "Tempo", "Threshold", "Sprint"], "LABEL": "Palette" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Custom Primary" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Custom Secondary" }
	]
}*/

/////////////////////////////////////////////////////////////////////////////
// XBE - retro style terrain rendering. Noise from Inigo Quilez.

// ---- REVd studio palette: effort zones -------------------------------------
void revdPalette(int idx, out vec3 pA, out vec3 pB) {
	if      (idx == 1) { pA = vec3(0.04, 0.30, 1.00); pB = vec3(0.00, 0.80, 0.95); } // Recovery
	else if (idx == 2) { pA = vec3(0.00, 0.85, 0.70); pB = vec3(0.30, 1.00, 0.40); } // Endurance
	else if (idx == 3) { pA = vec3(1.00, 0.62, 0.05); pB = vec3(1.00, 0.26, 0.00); } // Tempo
	else if (idx == 4) { pA = vec3(1.00, 0.10, 0.04); pB = vec3(0.40, 0.00, 0.10); } // Threshold
	else if (idx == 5) { pA = vec3(1.00, 0.95, 0.88); pB = vec3(1.00, 0.16, 0.32); } // Sprint
	else               { pA = color1.rgb;             pB = color2.rgb;             } // Custom
}

vec2 hash(vec2 p) {
	p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
	return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float noise(vec2 p) {
	const float K1 = 0.366025404;
	const float K2 = 0.211324865;

	vec2 i = floor(p + (p.x + p.y) * K1);
	vec2 a = p - i + (i.x + i.y) * K2;
	vec2 o = (a.x > a.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
	vec2 b = a - o + K2;
	vec2 c = a - 1.0 + 2.0 * K2;

	vec3 h = max(0.5 - vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
	vec3 n = h * h * h * h * vec3(dot(a, hash(i + 0.0)), dot(b, hash(i + o)), dot(c, hash(i + 1.0)));

	return dot(n, vec3(70.0));
}

float fbm4(vec2 p) {
	const mat2 m = mat2(0.80, 0.60, -0.60, 0.80);
	float f = 0.0;
	f += 0.5000 * noise(p); p = m * p * 2.02;
	f += 0.2500 * noise(p); p = m * p * 2.03;
	f += 0.1250 * noise(p); p = m * p * 2.01;
	f += 0.0625 * noise(p);
	return f;
}

mat4 CreatePerspectiveMatrix(float fov, float aspect, float near, float far) {
	mat4 pm = mat4(0.0);
	float angle = (fov / 180.0) * 3.141592654;
	float f = 1.0 / tan(angle * 0.5);
	pm[0][0] = f / aspect;
	pm[1][1] = f;
	pm[2][2] = (far + near) / (near - far);
	pm[2][3] = -1.0;
	pm[3][2] = (2.0 * far * near) / (near - far);
	return pm;
}

mat4 CamControl(vec3 eye, float pitch) {
	float cp = cos(pitch);
	float sp = sin(pitch);
	vec3 xaxis = vec3(1.0, 0.0, 0.0);
	vec3 yaxis = vec3(0.0, cp, sp);
	vec3 zaxis = vec3(0.0, -sp, cp);
	return mat4(
		vec4(xaxis.x, yaxis.x, zaxis.x, 0.0),
		vec4(xaxis.y, yaxis.y, zaxis.y, 0.0),
		vec4(xaxis.z, yaxis.z, zaxis.z, 0.0),
		vec4(-dot(xaxis, eye), -dot(yaxis, eye), -dot(zaxis, eye), 1.0)
	);
}

void main() {
	vec2 uvN = isf_FragNormCoord;

	// PASS 1: present the accumulated buffer.
	if (PASSINDEX == 1) {
		gl_FragColor = vec4(IMG_NORM_PIXEL(bufA, uvN).rgb, 1.0);
		return;
	}

	// ---- REVd audio core ---------------------------------------------------
	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	// Beat-locked time base. Wire's Transport Beat free-runs for the whole set, so
	// wrap it before use: this holds float precision and keeps motion identical at
	// hour three. 1024 is a multiple of 4, so per-beat and per-bar accents stay
	// phase-correct across the wrap. The 0.125 calibrates Speed = 1.0 to the REVd
	// house tempo; the TIME fallback is scaled to 2 beats/sec so a stopped
	// transport previews at 120 BPM.
	float bw    = mod(max(beat, 0.0), 1024.0);
	float bTime = (beat > 0.0) ? bw : TIME * 2.0;
	float r     = bTime * speed * 0.125;

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid,  0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float kick = (beat > 0.0) ? exp(-fract(bw)        * 6.0) * beatPunch : 0.0;
	float bar  = (beat > 0.0) ? exp(-fract(bw * 0.25) * 4.0) * beatPunch : 0.0;

	// Radial band windows - each band owns a region of the frame.
	vec2  bandP = (gl_FragCoord.xy + gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;
	float rdw   = length(bandP) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rdw);
	float wMid  = smoothstep(0.08, 0.42, rdw) * (1.0 - smoothstep(0.58, 1.05, rdw));
	float wHigh = smoothstep(0.30, 0.80, rdw);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	float bWarp = bAmp * bassWarp * wBass + kick * 0.35;
	float mSeq  = mAmp * midRipple * wMid;

	// ---- terrain -----------------------------------------------------------
	vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;
	vec2 p = 2.0 * uv - 1.0;
	p.x *= RENDERSIZE.x / RENDERSIZE.y;

	float aspect = RENDERSIZE.x / RENDERSIZE.y;

	// BASS -> the camera drops toward the ridgeline, which makes the terrain
	// rear up at the centre of frame. Geometry, not exposure.
	vec3 eye = vec3(Offset_X, 0.25 + 0.25 * cos(0.5 * r) - bWarp * 0.10, 0.0);

	mat4 projmat = CreatePerspectiveMatrix(50.0, aspect, 0.1, 10.0);
	mat4 viewmat = CamControl(eye, -5.0 * 3.141592654 / 180.0);
	mat4 vpmat = viewmat * projmat;

	vec3 col = vec3(0.0);
	vec3 acc = vec3(0.0);

	float lh = -RENDERSIZE.y;
	float off = 0.1 * r * travel * mix(0.7, 1.3, si) + bar * 0.05;
	float z = 0.1;
	float zi = 0.05;

	// BASS -> ridge amplitude.
	float amp = relief * (1.0 + bWarp * 0.55);

	// HIGH -> thinner scanlines at the rim read as finer detail.
	float lw = 0.005 * (1.0 - hAmp * highSparkle * wHigh * 0.5);

	float n = clamp(floor(slices), 4.0, 40.0);

	for (int i = 0; i < 40; i++) {
		float fi = float(i);
		if (fi >= n) { break; }

		// MID -> each depth slice carries its own phase, so ridges roll away
		// from the viewer in sequence instead of the whole field heaving.
		float seq = mSeq * 0.35 * sin(fi * 0.8 - r * 3.0);

		vec4 pos = vec4(p.x, amp * fbm4(0.5 * vec2(eye.x + p.x, z + off + seq)), eye.z + z, 1.0);
		float h = (vpmat * pos).y - p.y;

		if (h > lh) {
			float d = abs(h);
			col = vec3(d < lw ? smoothstep(1.0, 0.0, d / max(lw, 1e-6)) : 0.0);
			col *= exp(-0.1 * fi);
			acc += col;
			lh = h;
		}
		z += zi;
	}

	float cc = clamp(sqrt(clamp(acc.x, 0.0, 1.0)), 0.0, 1.0);

	vec3 mono   = vec3(cc);
	vec3 tinted = mix(pA, pB, cc) * cc;
	vec3 outC   = mix(mono, tinted, clamp(tint, 0.0, 1.0));

	outC += pB * hAmp * highSparkle * wHigh * cc * 0.30;
	outC *= mix(0.85, 1.15, si);

	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(outC, prev), 1.0);
}
