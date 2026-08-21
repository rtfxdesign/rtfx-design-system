/*{
	"DESCRIPTION": "Creation V2 - REVd audio-reactive rework of Danilo Guanabara's 'Creation'. Radial plasma cells. Bass drives the centre displacement wave, mid separates the R/G/B phases so the three layers ripple in sequence, high raises the cell frequency at the rim only, and the wave phase is locked to the Wire transport beat.",
	"CREDIT": "Original 'Creation' by Danilo Guanabara (Silexars) - shadertoy.com/view/XsXXDn. ISF import by Old Salt. REVd V2 audio rework by REVd Cycling.",
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
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (centre wave)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (RGB split)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (rim cells)" },
		{ "NAME": "beatPunch", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Beat Punch" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "cellFreq", "TYPE": "float", "DEFAULT": 9.0, "MIN": 1.0, "MAX": 30.0, "LABEL": "Cell Frequency" },
		{ "NAME": "waveRate", "TYPE": "float", "DEFAULT": 1.0, "MIN": -5.0, "MAX": 5.0, "LABEL": "Wave Rate" },
		{ "NAME": "uIntensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 4.0, "LABEL": "Output Gain" },
		{ "NAME": "tint", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Palette Tint (0 = original RGB)" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0, 1, 2, 3, 4, 5], "LABELS": ["Custom", "Recovery", "Endurance", "Tempo", "Threshold", "Sprint"], "LABEL": "Palette" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Custom Primary" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Custom Secondary" },
		{ "NAME": "uOffset", "TYPE": "point2D", "DEFAULT": [0.0, 0.0], "MIN": [-1.0, -1.0], "MAX": [1.0, 1.0], "LABEL": "Offset" }
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
	float rd    = length(bandP) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rd);
	float wMid  = smoothstep(0.08, 0.42, rd) * (1.0 - smoothstep(0.58, 1.05, rd));
	float wHigh = smoothstep(0.30, 0.80, rd);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	// BASS -> amplitude of the radial displacement wave at the centre.
	float pulse = 1.0 + (bAmp * bassWarp * wBass + kick * 0.50) * 0.85;

	// MID -> phase separation between the R, G and B layers. The three plasma
	// sheets ripple in sequence, which reads as chromatic depth rather than
	// the whole frame flashing on the transient.
	float split = mAmp * midRipple * wMid * 0.22;

	// HIGH -> ring frequency at the rim only: finer cells, no extra brightness.
	float freq = cellFreq + hAmp * highSparkle * wHigh * 14.0;

	// ---- core (Silexars) ---------------------------------------------------
	vec3 c;
	float l = 1.0;
	float z = r * waveRate * mix(0.7, 1.3, si) + bar * 0.25;

	for (int i = 0; i < 3; i++) {
		vec2 p = (gl_FragCoord.xy / RENDERSIZE.xy) - ((uOffset + 1.0) / 2.0 - 0.5);
		vec2 uv = p;

		p -= 0.5;
		p.x *= RENDERSIZE.x / RENDERSIZE.y;

		z += 0.07 + split * float(i);

		l = length(p);
		uv += p / max(l, 1e-5) * (sin(z) + 1.0) * pulse * abs(sin(l * freq - z * 2.0));

		c[i] = 0.01 / length(abs(mod(uv, 1.0) - 0.5));
	}

	vec3 col = c / max(l, 1e-5);

	// Optional REVd palette remap: luminance drives the ramp.
	float lum    = clamp(dot(col, vec3(0.333)), 0.0, 1.0);
	vec3  tinted = mix(pA, pB, lum) * clamp(length(col) * 0.8, 0.0, 1.6);
	col = mix(col, tinted, clamp(tint, 0.0, 1.0));

	col *= uIntensity * mix(0.85, 1.20, si);
	col = clamp(col, vec3(0.0), vec3(4.0));

	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(col, prev), 1.0);
}
