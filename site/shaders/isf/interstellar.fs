/*{
	"DESCRIPTION": "Interstellar V2 - REVd audio-reactive rework. A star tunnel marched along a screen-space ray with chromatic separation. Bass widens the streak spread and pushes the ray at frame centre, mid offsets each depth step so stars ripple through the tunnel in sequence, high tightens the star points at the rim, and the scroll is beat-locked.",
	"CREDIT": "Original 'Interstellar' by Hazel Quantock, CC0 public domain. REVd V2 audio rework by REVd Cycling.",
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
		{ "NAME": "bassWarp", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Bass Warp (streak spread)" },
		{ "NAME": "midRipple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Mid Ripple (depth sequence)" },
		{ "NAME": "highSparkle", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "High Sparkle (star points)" },
		{ "NAME": "beatPunch", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0, "LABEL": "Beat Punch" },
		{ "NAME": "trail", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 0.97, "LABEL": "Trail Decay" },
		{ "NAME": "scrollRate", "TYPE": "float", "DEFAULT": 1.0, "MIN": -5.0, "MAX": 5.0, "LABEL": "Scroll Rate" },
		{ "NAME": "stellar", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0, "LABEL": "Streak Length" },
		{ "NAME": "amount", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.05, "MAX": 1.0, "LABEL": "Depth Steps" },
		{ "NAME": "tint", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Palette Tint (0 = original RGB)" },
		{ "NAME": "palette", "TYPE": "long", "DEFAULT": 4, "VALUES": [0, 1, 2, 3, 4, 5], "LABELS": ["Custom", "Recovery", "Endurance", "Tempo", "Threshold", "Sprint"], "LABEL": "Palette" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 0.05, 0.02, 1.0], "LABEL": "Custom Primary" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.3, 0.02, 0.0, 1.0], "LABEL": "Custom Secondary" }
	]
}*/

// Interstellar - Hazel Quantock
// CC0 public domain: http://creativecommons.org/publicdomain/zero/1.0/

#define GAMMA (2.2)

// ---- REVd studio palette: effort zones -------------------------------------
void revdPalette(int idx, out vec3 pA, out vec3 pB) {
	if      (idx == 1) { pA = vec3(0.04, 0.30, 1.00); pB = vec3(0.00, 0.80, 0.95); } // Recovery
	else if (idx == 2) { pA = vec3(0.00, 0.85, 0.70); pB = vec3(0.30, 1.00, 0.40); } // Endurance
	else if (idx == 3) { pA = vec3(1.00, 0.62, 0.05); pB = vec3(1.00, 0.26, 0.00); } // Tempo
	else if (idx == 4) { pA = vec3(1.00, 0.10, 0.04); pB = vec3(0.40, 0.00, 0.10); } // Threshold
	else if (idx == 5) { pA = vec3(1.00, 0.95, 0.88); pB = vec3(1.00, 0.16, 0.32); } // Sprint
	else               { pA = color1.rgb;             pB = color2.rgb;             } // Custom
}

vec4 noiseGen(vec2 x) {
	vec4 v = vec4(x.x, x.y, 0.0, 0.0);
	v = fract(v) + fract(v * 1e4) + fract(v * 1e-4);
	v += vec4(0.12345, 0.6789, 0.314159, 0.271828);
	v = fract(v * dot(v, v) * 123.456);
	v = fract(v * dot(v, v) * 123.456);
	return v;
}

vec3 ToGamma(vec3 col) {
	return pow(max(col, vec3(0.0)), vec3(1.0 / GAMMA));
}

vec4 Noise(ivec2 x) {
	return noiseGen((vec2(x) + 0.5) / 256.0);
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

	// Radial band windows - each band owns a region of the frame. Down a star
	// tunnel these read as: centre = vanishing point, rim = stars passing.
	vec2  bandP = (gl_FragCoord.xy + gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;
	float rd    = length(bandP) * 0.5;
	float wBass = 1.0 - smoothstep(0.0, 0.55, rd);
	float wMid  = smoothstep(0.08, 0.42, rd) * (1.0 - smoothstep(0.58, 1.05, rd));
	float wHigh = smoothstep(0.30, 0.80, rd);

	vec3 pA, pB;
	revdPalette(int(palette), pA, pB);

	float bWarp = bAmp * bassWarp * wBass + kick * 0.35;
	float mSeq  = mAmp * midRipple * wMid;

	// ---- tunnel ------------------------------------------------------------
	vec3 ray;
	ray.xy = 2.0 * (gl_FragCoord.xy - RENDERSIZE.xy * 0.5) / RENDERSIZE.x;
	ray.z = 1.0;

	// BASS -> longer chromatic streaks and a wider spread at the centre. This
	// stretches the stars rather than lifting the exposure.
	float stel   = clamp(stellar * (1.0 + bWarp * 0.45), 0.0, 2.0);
	float offset = stel * 0.5;
	float speed2 = (stel * 2.0) * 2.0;
	float spd    = speed2 + 0.1;
	offset += sin(offset) * 0.96;
	offset *= 2.0;

	// The scroll was a manual slider; it is now beat-locked.
	float tPos = fract(r * scrollRate * 0.25 * mix(0.7, 1.3, si) + bar * 0.05);

	vec3 col = vec3(0.0);
	vec3 stp = ray / max(max(abs(ray.x), abs(ray.y)), 1e-5);
	vec3 pos = 2.0 * stp + 0.5;

	// HIGH -> tighter star points at the rim: detail, not a full-frame flash.
	float pointTight = 8.0 * (1.0 + hAmp * highSparkle * wHigh * 1.4);

	float times = floor(amount * 20.0);

	for (int i = 0; i < 20; i++) {
		float fi = float(i);
		if (fi > times) { break; }

		// MID -> each depth step carries its own phase, so the star field
		// ripples through the tunnel rather than the whole shaft pulsing.
		float seq = mSeq * 0.12 * sin(fi * 1.5 - r * 3.0);

		float z = Noise(ivec2(pos.xy)).x;
		z = fract(z - tPos + seq);

		float d = 50.0 * z - pos.z;
		float w = pow(max(0.0, 1.0 - pointTight * length(fract(pos.xy) - 0.5)), 2.0);

		vec3 c = max(vec3(0.0), vec3(1.0 - abs(d + speed2 * 0.5) / spd,
		                             1.0 - abs(d) / spd,
		                             1.0 - abs(d - speed2 * 0.5) / spd));

		col += 1.5 * (1.0 - z) * c * w;
		pos += stp;
	}

	vec3 outC = ToGamma(col);

	// Optional REVd palette remap over the original chromatic separation.
	float lum    = clamp(dot(outC, vec3(0.333)), 0.0, 1.0);
	vec3  tinted = mix(pA, pB, lum) * clamp(length(outC) * 0.9, 0.0, 1.6);
	outC = mix(outC, tinted, clamp(tint, 0.0, 1.0));

	outC *= mix(0.85, 1.20, si);

	vec3 prev = IMG_NORM_PIXEL(bufA, uvN).rgb * clamp(trail, 0.0, 0.97);
	gl_FragColor = vec4(max(outC, prev), 1.0);
}
