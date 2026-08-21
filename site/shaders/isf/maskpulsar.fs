/*{
	"DESCRIPTION": "MaskPulsar — Rotating energy beams radiating from center like a pulsar. Bass drives beam brightness/width, mid adds secondary beams, high sends radial shockwave rings along beams. Stage controls beam taper. REVd Cycling.",
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

void main() {
	vec2 V = RENDERSIZE.xy;
	vec2 uv = (gl_FragCoord.xy * 2.0 - V) / V.y;

	float bTime = (beat > 0.0) ? beat : TIME;
	float t = bTime * speed * 0.2;

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float r = length(uv);
	float angle = atan(uv.y, uv.x);

	// --- Primary beams: two opposing beams (like a pulsar) ---
	float beamAngle = t * 2.0;
	float diff1 = abs(mod(angle - beamAngle + 3.14159, 6.28318) - 3.14159);
	float diff2 = abs(mod(angle - beamAngle - 3.14159 + 3.14159, 6.28318) - 3.14159);
	float beamDiff = min(diff1, diff2);

	// Bass widens the beams
	float beamWidth = 0.03 + bAmp * 0.25;

	// Stage controls taper: 0 = uniform width, 1 = strong outward taper (wider at edges)
	float taper = 1.0 + stage * r * 2.0;
	float adjustedWidth = beamWidth * taper;

	float beam = exp(-beamDiff * beamDiff / (adjustedWidth * adjustedWidth * 0.5));
	beam *= (0.2 + bAmp * 0.8); // Bass controls overall brightness

	// Fade intensity with distance for a natural falloff
	beam *= exp(-r * 0.5);

	float mask = beam;

	// --- Mid adds secondary cross-beams at 90 degrees ---
	if (mAmp > 0.1) {
		float crossAngle = beamAngle + 1.5708;
		float cdiff1 = abs(mod(angle - crossAngle + 3.14159, 6.28318) - 3.14159);
		float cdiff2 = abs(mod(angle - crossAngle - 3.14159 + 3.14159, 6.28318) - 3.14159);
		float crossDiff = min(cdiff1, cdiff2);

		float crossWidth = 0.02 + mAmp * 0.12;
		float crossTaper = 1.0 + stage * r * 1.5;
		float crossBeam = exp(-crossDiff * crossDiff / (crossWidth * crossTaper * crossWidth * crossTaper * 0.5));
		crossBeam *= mAmp * 0.6;
		crossBeam *= exp(-r * 0.8);

		mask = max(mask, crossBeam);
	}

	// --- High sends radial shockwave pulses outward along the beams ---
	if (hAmp > 0.1) {
		float pulseR = fract(t * 4.0) * 1.5;
		float pulseDist = abs(r - pulseR);
		float pulse = aaSmooth(0.08, 0.0, pulseDist, softness);

		// Only along the beam directions
		float beamProximity = aaSmooth(0.3, 0.0, beamDiff, softness);
		pulse *= beamProximity * hAmp;

		mask = max(mask, pulse);

		// Also a center throb
		float throb = aaSmooth(0.15, 0.0, r, softness) * hAmp * 0.5 * (0.5 + 0.5 * sin(t * 20.0));
		mask = max(mask, throb);
	}

	// Subtle center core glow always present
	float core = aaSmooth(0.1, 0.0, r, softness) * 0.2;
	mask = max(mask, core);

	vec3 col = mix(color2.rgb, color1.rgb, clamp(mask, 0.0, 1.0));
	gl_FragColor = vec4(col, 1.0);
}
