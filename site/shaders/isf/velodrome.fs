/*{
	"DESCRIPTION": "Velodrome Horizon — Low-perspective futuristic speed track vanishing into horizon for REVd cycling (Transport Beat synced, Anti-Strobe)",
	"CREDIT": "REVd Cycling",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"INPUTS": [
		{ "NAME": "beat", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 100000.0, "LABEL": "Transport Beat" },
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Track Speed / BPM Mult" },
		{ "NAME": "trackWidth", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.5, "MAX": 2.5, "LABEL": "Track Width" },
		{ "NAME": "glowFalloff", "TYPE": "float", "DEFAULT": 5.0, "MIN": 1.0, "MAX": 15.0, "LABEL": "Glow" }
	]
}*/

void main() {
	vec3 O = vec3(0.0);
	vec2 F = gl_FragCoord.xy;
	vec2 V = RENDERSIZE.xy;

	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));

	float bTime = (beat > 0.0) ? beat : TIME;
	float r = mod(bTime * speed * 0.2 * mix(0.4, 1.3, si), 628.3185);

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0),  0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float glow = glowFalloff / (1.0 + bAmp * 3.0);
	float maxI = mix(20.0, 60.0, si) + mAmp * 15.0;

	float t = 0.1;
	float x = 0.0;

	for (int i = 0; i < 60; i++) {
		if (float(i) >= maxI) {
			break;
		}

		vec2 uv = (F + F - V);
		vec3 o = t * normalize(vec3(uv, V.y));

		// Low-slung camera tilt looking down the track
		o.y += 0.4 * t;

		// Track segment repetition
		float seg = mix(0.25, 0.1, si);
		o.z = mod(o.z + r, seg) - seg * 0.5;

		// Velodrome track elevation hills on bass hit
		float hill = sin(o.z * 2.0 + r * 0.5) * bAmp * 0.2;
		o.y -= hill;

		// Track boundary lines and grid ribs
		float trackLines = abs(abs(o.x) - (0.8 * trackWidth)) - 0.02;
		float crossRibs = abs(o.z) - 0.01;

		x = min(trackLines, crossRibs);
		t += max(x, 0.003);

		// Track boundary markers flash on high frequency
		float markerFlash = step(0.7, sin(o.z * 10.0 + r * 2.0)) * hAmp * 0.5;

		float fi = float(i);
		float rW = 1.0 + cos(t * 0.5 + r * 0.5 + fi * 0.02 + markerFlash);
		float env = 0.35 + sin(3.0 * t + r * 0.5) * 0.28;
		float den = glow + abs(x) * 400.0;
		vec3 fire = vec3(
			rW,
			rW * (0.22 + 0.1 * cos(t * 0.4)),
			rW * (0.06 + 0.03 * cos(t * 0.3 + 0.6))
		);
		O += fire * env / den;
	}

	gl_FragColor = vec4(O, 1.0);
}
