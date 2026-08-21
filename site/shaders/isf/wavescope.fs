/*{
	"DESCRIPTION": "Wave Scope V2 — layered parallax oscilloscope with depth traces, scan grid, spatial audio binding, trail feedback and REVd studio palettes (Transport Beat synced, Anti-Strobe)",
	"CREDIT": "REVd Cycling",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"PASSES": [
		{ "TARGET": "bufA", "PERSISTENT": true, "FLOAT": true },
		{ }
	],
	"INPUTS": [
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 1024.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Speed" },
		{ "NAME": "traces", "TYPE": "float", "DEFAULT": 7.0, "MIN": 1.0, "MAX": 14.0, "LABEL": "Depth Traces" },
		{ "NAME": "spread", "TYPE": "float", "DEFAULT": 0.55, "MIN": 0.05, "MAX": 1.2, "LABEL": "Depth Spread" },
		{ "NAME": "gridAmount", "TYPE": "float", "DEFAULT": 0.35, "MIN": 0.0, "MAX": 1.0, "LABEL": "Scan Grid" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0,1,2,3,4,5], "LABELS": ["Custom","Recovery","Endurance","Tempo","Threshold","Sprint"], "LABEL": "Palette" },
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (centre)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (traces)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (rim)" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.86, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Custom Primary" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Custom Secondary" }
	]
}*/

// ---- REVd studio palette: effort zones -------------------------------------
void revdPalette(int idx, out vec3 pA, out vec3 pB) {
	if      (idx == 1) { pA = vec3(0.04, 0.30, 1.00); pB = vec3(0.00, 0.80, 0.95); } // Recovery
	else if (idx == 2) { pA = vec3(0.00, 0.85, 0.70); pB = vec3(0.30, 1.00, 0.40); } // Endurance
	else if (idx == 3) { pA = vec3(1.00, 0.62, 0.05); pB = vec3(1.00, 0.26, 0.00); } // Tempo
	else if (idx == 4) { pA = vec3(1.00, 0.10, 0.04); pB = vec3(0.40, 0.00, 0.10); } // Threshold
	else if (idx == 5) { pA = vec3(1.00, 0.95, 0.88); pB = vec3(1.00, 0.16, 0.32); } // Sprint
	else               { pA = color1.rgb;             pB = color2.rgb;             } // Custom
}

void main() {
	vec2 uvN = isf_FragNormCoord;

	// PASS 1: present the accumulated buffer.
	if (PASSINDEX == 1) {
		gl_FragColor = vec4(IMG_NORM_PIXEL(bufA, uvN).rgb, 1.0);
		return;
	}

	vec2 V  = RENDERSIZE.xy;
	vec2 uv = (gl_FragCoord.xy * 2.0 - V) / V.y;

	float bTime = (beat > 0.0) ? beat : TIME;
	float t = mod(bTime * speed * 0.2, 6.28318);

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid,  0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	// Radial band windows — each band owns a region of the frame.
	float rad   = length(uv) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rad);
	float wMid  = smoothstep(0.08, 0.42, rad) * (1.0 - smoothstep(0.58, 1.05, rad));
	float wHigh = smoothstep(0.30, 0.80, rad);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	vec3 col = vec3(0.0);

	// --- scan grid backdrop: gives the traces something to sit in -----------
	if (gridAmount > 0.0) {
		vec2  gq   = abs(fract(uv * 6.0) - 0.5);
		float gLine = min(gq.x, gq.y);
		float grid  = smoothstep(0.03, 0.0, gLine);
		col += pB * grid * gridAmount * 0.12 * (0.4 + wMid);
	}

	float nTrace = floor(clamp(traces, 1.0, 14.0) + 0.5);

	for (int i = 0; i < 14; i++) {
		float fi = float(i);
		if (fi >= nTrace) break;

		// Depth: 0 = nearest, 1 = furthest. Drives parallax, scale and fade.
		float depth = fi / max(nTrace - 1.0, 1.0);
		float persp = mix(1.0, 0.35, depth);          // further traces are flatter
		float fade  = mix(1.0, 0.18, depth);          // and dimmer

		// Stack the traces vertically around the centre line.
		float yOff   = (depth - 0.5) * spread;
		float localY = (uv.y - yOff) / persp;

		float x = uv.x;
		float wave = 0.0;

		// BASS -> large low-frequency displacement, strongest at the centre.
		wave += sin(x * 3.0 + t * 3.0 + fi) * bAmp * bassWarp * wBass * 0.18;

		// MID -> per-trace phase offset, so the stack shears with depth
		// instead of every trace moving as one.
		wave += sin(x * 7.0 - t * 5.0 + fi * 2.1) * mAmp * midRipple * wMid * 0.08;
		float traceShift = sin(fi * 1.9 + t * 2.8) * mAmp * midRipple * wMid * 0.05;
		wave += traceShift;

		// HIGH -> fine ripple, gated to the rim so it reads as detail.
		wave += sin(x * 22.0 + t * 8.0 + fi * 3.0) * hAmp * highSparkle * wHigh * 0.035;
		wave += sin(x * 41.0 - t * 12.0)           * hAmp * highSparkle * wHigh * 0.018;

		float dist = abs(localY - wave);

		float thickness = (0.003 + mAmp * 0.003) / persp;
		float line  = smoothstep(thickness + 0.010, thickness, dist);
		float halo  = smoothstep(thickness + 0.090, thickness, dist) * 0.30;

		vec3 traceCol = mix(pA, pB, depth);
		col += traceCol * (line + halo) * fade;
	}

	// Trails: max-blend against the decayed previous frame — cannot run away.
	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(col, prev), 1.0);
}
