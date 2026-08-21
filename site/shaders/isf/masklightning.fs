/*{
	"DESCRIPTION": "MaskLightning — Branching electric discharge arcs. Bass fires main bolt intensity, mid spreads the branch field, high triggers full-screen white flicker. Stage controls branch complexity. REVd Cycling.",
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

float noise(float x) {
	float i = floor(x);
	float f = fract(x);
	f = f * f * (3.0 - 2.0 * f);
	return mix(hash(i), hash(i + 1.0), f);
}

// Generate a single jagged lightning bolt path
// Returns distance from point p to the bolt
float bolt(vec2 p, float seed, float jag, float t) {
	// Bolt runs top to bottom, with horizontal jitter
	float y = p.y;
	float segments = 20.0 + jag * 30.0;

	// Walk down the bolt and compute horizontal offset at each segment
	float segY = floor(y * segments);
	float segFrac = fract(y * segments);

	// Current and next segment horizontal positions
	float x0 = 0.0;
	float x1 = 0.0;

	// Accumulate random walk for bolt path
	for (float i = 0.0; i < 50.0; i++) {
		if (i > segments) break;
		float step = (hash(i * 13.7 + seed + floor(t * 12.0)) - 0.5) * 0.15;
		if (i <= segY) x0 += step;
		if (i <= segY + 1.0) x1 += step;
	}

	// Interpolate between segments
	float boltX = mix(x0, x1, segFrac);

	// Distance from point to bolt center line
	float d = abs(p.x - boltX);
	return d;
}

void main() {
	vec2 V = RENDERSIZE.xy;
	vec2 uv = (gl_FragCoord.xy * 2.0 - V) / V.y;

	float bTime = (beat > 0.0) ? beat : TIME;
	float t = bTime * speed * 0.2;

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0), 0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	// Stage controls branch complexity
	float complexity = stage;

	float mask = 0.0;

	// Main central bolt — always present, bass controls brightness/width
	float mainDist = bolt(uv, 0.0, 0.5 + complexity * 0.5, t);
	float boltWidth = 0.005 + bAmp * 0.025;
	float mainBolt = aaSmooth(boltWidth * 3.0, 0.0, mainDist, softness) * (0.3 + bAmp * 0.7);

	// Glow around the bolt
	float glow = exp(-mainDist * (15.0 - bAmp * 10.0)) * bAmp * 0.5;
	mask = max(mainBolt, glow);

	// Mid spreads additional branch bolts outward from center
	float branchCount = 1.0 + mAmp * 5.0 + complexity * 3.0;
	for (float i = 1.0; i < 8.0; i++) {
		if (i > branchCount) break;

		float offsetX = (hash(i * 7.7) - 0.5) * (0.5 + mAmp);
		float offsetY = (hash(i * 3.3) - 0.5) * 0.5;
		vec2 branchUv = uv - vec2(offsetX, offsetY);

		// Rotate branch slightly
		float bAngle = (hash(i * 5.5) - 0.5) * 1.5;
		float bc = cos(bAngle), bs = sin(bAngle);
		branchUv = vec2(branchUv.x * bc - branchUv.y * bs,
		                branchUv.x * bs + branchUv.y * bc);

		float bDist = bolt(branchUv, i * 100.0, complexity, t);
		float bWidth = 0.003 + bAmp * 0.012;
		float branch = aaSmooth(bWidth * 3.0, 0.0, bDist, softness) * (0.2 + bAmp * 0.4);
		float bGlow = exp(-bDist * 25.0) * mAmp * 0.2;

		mask = max(mask, max(branch, bGlow));
	}

	// High triggers full-screen white flicker (strobe-like)
	if (hAmp > 0.4) {
		float flicker = step(0.7, hash(floor(bTime * 1.0))) * hAmp * 0.6; // 1 draw/beat, Speed-independent (flicker safety)
		mask = max(mask, flicker);
	}

	vec3 col = mix(color2.rgb, color1.rgb, clamp(mask, 0.0, 1.0));
	gl_FragColor = vec4(col, 1.0);
}
