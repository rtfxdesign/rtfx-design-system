/*{
	"DESCRIPTION": "Pulse Grid V2 — fractal repetition grid with spatial audio binding, trail feedback and REVd studio palettes (Transport Beat synced, Anti-Strobe)",
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
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Speed / BPM Mult" },
		{ "NAME": "gridDensity", "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 12.0, "LABEL": "Grid Density" },
		{ "NAME": "glowFalloff", "TYPE": "float", "DEFAULT": 5.0, "MIN": 1.0, "MAX": 15.0, "LABEL": "Glow" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0,1,2,3,4,5], "LABELS": ["Custom","Recovery","Endurance","Tempo","Threshold","Sprint"], "LABEL": "Palette" },
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (centre)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (cells)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (rim)" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.82, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
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

	// ---------------- PASS 1: present the accumulated buffer ----------------
	if (PASSINDEX == 1) {
		gl_FragColor = vec4(IMG_NORM_PIXEL(bufA, uvN).rgb, 1.0);
		return;
	}

	// ---------------- PASS 0: render the scene ------------------------------
	vec3 O = vec3(0.0);
	vec2 F = gl_FragCoord.xy;
	vec2 V = RENDERSIZE.xy;

	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	float bTime = (beat > 0.0) ? beat : TIME;
	float r = mod(bTime * speed * 0.2 * mix(0.4, 1.2, si), 628.3185);

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid,  0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	// Radial band windows — each band owns a region of the frame.
	vec2  p    = (F + F - V) / V.y;
	float rad  = length(p) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rad);
	float wMid  = smoothstep(0.08, 0.42, rad) * (1.0 - smoothstep(0.58, 1.05, rad));
	float wHigh = smoothstep(0.30, 0.80, rad);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	// Iteration count is now fixed — it is a cost knob, not a look knob.
	float maxI = mix(20.0, 60.0, si);

	float t = 0.1;
	float x = 0.0;

	for (int i = 0; i < 60; i++) {
		if (float(i) >= maxI) {
			break;
		}

		float aRot = r * 0.08;
		vec4 cRot = cos(vec4(0.0, 11.0, 33.0, 0.0) + aRot);
		mat2 mRot = mat2(cRot.x, cRot.y, cRot.z, cRot.w);

		vec2 uv = (F + F - V) * mRot;

		// BASS -> low-frequency domain warp at the centre. Moves geometry,
		// not brightness, so the core of the frame breathes with the kick.
		float warp = bAmp * bassWarp * wBass;
		uv += vec2(sin(uv.y * 0.0016 + r * 1.7),
		           cos(uv.x * 0.0016 - r * 1.3)) * warp * 90.0;

		vec3 o = t * normalize(vec3(uv, V.y));
		o.z += r;

		float seg = mix(0.3, 0.1, si);
		o.z = mod(o.z, seg) - seg * 0.5;

		// MID -> per-cell phase offset. Each cell carries its own index, so a
		// ripple travels across the grid instead of every cell pulsing at once.
		vec2  cellId    = floor(o.xy * gridDensity);
		float cellPhase = sin(dot(cellId, vec2(12.9898, 78.233)) * 0.35 + r * 2.6);
		float ripple    = mAmp * midRipple * wMid * cellPhase;

		vec2  g     = abs(fract(o.xy * gridDensity) - 0.5);
		float dGrid = min(g.x, g.y);

		x = abs(dGrid) - (0.02 + ripple * 0.012);
		t += max(x, 0.003);

		float fi  = float(i);
		float rW  = 1.0 + cos(t * 0.5 + r * 0.5 + fi * 0.02);
		float env = 0.35 + sin(3.0 * t + r * 0.5) * 0.28;
		float den = glowFalloff + abs(x) * 400.0;

		float blendFactor = 0.5 + 0.5 * cos(t * 0.4 + fi * 0.05);
		vec3  fire = rW * mix(pA, pB, blendFactor);

		O += fire * env / den;

		// HIGH -> edge-gated emission at the rim. Reads as detail, not flash.
		float edge  = exp(-abs(x) * 260.0);
		float spark = 0.5 + 0.5 * sin(dot(cellId, vec2(41.7, 289.1)) + r * 9.0);
		O += pB * edge * spark * hAmp * highSparkle * wHigh * 0.40;
	}

	// Trails: max-blend against the decayed previous frame. Using max() rather
	// than an additive accumulate means it cannot run away to white.
	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(O, prev), 1.0);
}
