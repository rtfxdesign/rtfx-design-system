/*{
	"DESCRIPTION": "MaskRadar — Sweeping radar beam reveals in a circular wipe. Bass widens beam, mid controls sweep speed, high leaves persistent blip echoes. Stage controls beam count (1 to 4). REVd Cycling.",
	"CREDIT": "REVd Cycling",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator",
		"Mask"
	],
	"INPUTS": [
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 1024.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Speed" },
		{ "NAME": "color1", "TYPE": "color", "DEFAULT": [1.0, 1.0, 1.0, 1.0], "LABEL": "Reveal Color (White)" },
		{ "NAME": "color2", "TYPE": "color", "DEFAULT": [0.0, 0.0, 0.0, 1.0], "LABEL": "Hide Color (Black)" },
		{ "NAME": "softness", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 4.0, "LABEL": "Edge Softness (px)" }
	]
}*/

// ---- Resolution-independent edges ------------------------------------------
// aaStep / aaSmooth widen the transition to at least one pixel using screen-space
// derivatives, so an edge looks equally clean at 1080p and at 4K. aaSmooth keeps
// the authored width when that is already wider than a pixel.
float aaStep(float edge, float v, float soft) {
	float w = max(fwidth(v), 1e-6) * max(soft, 0.5);
	return smoothstep(edge - w, edge + w, v);
}
float aaSmooth(float e0, float e1, float v, float soft) {
	float d = e1 - e0;
	float s = (d >= 0.0) ? 1.0 : -1.0;
	float w = max(fwidth(v), 1e-6) * max(soft, 0.5);
	float c = (e0 + e1) * 0.5;
	float h = max(abs(d) * 0.5, w);
	return smoothstep(c - h * s, c + h * s, v);
}

float hash(float n) {
	return fract(sin(n) * 43758.5453123);
}

void main() {
	vec2 V = RENDERSIZE.xy;
	vec2 uv = (gl_FragCoord.xy * 2.0 - V) / V.y;

	float bTime = (beat > 0.0) ? beat : TIME;
	float t = bTime * speed * 0.2;

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float r = length(uv);
	float angle = atan(uv.y, uv.x); // -PI to PI

	// Stage controls number of beams: 1 to 4
	float beamCount = floor(1.0 + stage * 3.99);
	float beamSpacing = 6.28318 / beamCount;

	// Mid controls sweep speed
	float sweepSpeed = 1.0 + mAmp * 5.0;
	float sweepAngle = mod(t * sweepSpeed, 6.28318) - 3.14159;

	float mask = 0.0;

	// For each beam
	for (float i = 0.0; i < 4.0; i++) {
		if (i >= beamCount) break;

		float beamAngle = sweepAngle + i * beamSpacing;

		// Angle difference (wrapped)
		float diff = angle - beamAngle;
		diff = mod(diff + 3.14159, 6.28318) - 3.14159;

		// Bass widens the beam wedge
		float beamWidth = 0.08 + bAmp * 0.5;

		// Bright leading edge, fading trail behind
		float leading = aaSmooth(beamWidth, 0.0, diff, softness) * aaSmooth(-0.02, 0.0, diff, softness);
		float trail = smoothstep(0.0, -beamWidth * 3.0, diff) * 0.4;

		float beam = max(leading, trail);

		// Fade beam with distance from center
		beam *= smoothstep(1.3, 0.1, r);

		mask = max(mask, beam);
	}

	// Subtle concentric range rings
	float ringDist = abs(fract(r * 4.0) - 0.5) * 2.0;
	float rings = aaSmooth(0.95, 1.0, ringDist, softness) * 0.15;
	mask = max(mask, rings);

	// Center dot
	float centerDot = aaSmooth(0.06, 0.03, r, softness);
	mask = max(mask, centerDot * 0.5);

	// High leaves persistent blip echoes at random radii along the beam
	if (hAmp > 0.1) {
		for (float j = 0.0; j < 6.0; j++) {
			float blipR = hash(j * 11.1 + floor(t * 2.0)) * 0.9 + 0.1;
			float blipAngle = hash(j * 22.2 + floor(t * 2.0)) * 6.28318 - 3.14159;
			vec2 blipPos = vec2(cos(blipAngle), sin(blipAngle)) * blipR;
			float blipDist = length(uv - blipPos);
			float blip = aaSmooth(0.04, 0.01, blipDist, softness) * hAmp;
			mask = max(mask, blip);
		}
	}

	vec3 col = mix(color2.rgb, color1.rgb, clamp(mask, 0.0, 1.0));
	gl_FragColor = vec4(col, 1.0);
}
