/*{
	"DESCRIPTION": "Cardiac Core — Biometric heart-rate core emitting 3D vascular shockwaves for REVd cycling (Transport Beat synced, Anti-Strobe)",
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
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Heart Rate BPM Mult" },
		{ "NAME": "filaments", "TYPE": "float", "DEFAULT": 6.0, "MIN": 2.0, "MAX": 12.0, "LABEL": "Vascular Filaments" },
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

		// Pulsing vascular center core
		float cPulse = sin(r * 2.0) * 0.05 + bAmp * 0.1;
		o.z = mod(o.z + r, mix(0.25, 0.1, si)) - mix(0.12, 0.05, si);

		float theta = atan(o.y, o.x);
		float radius = length(o.xy);

		// Vascular branch folding
		float arms = floor(filaments + mAmp * 3.0 + 0.5);
		float sym = 6.28318 / max(arms, 2.0);
		theta = mod(theta, sym) - sym * 0.5;

		// Arterial electrical noise
		theta += sin(radius * 10.0 + r * 2.0) * hAmp * 0.04;
		o.xy = vec2(cos(theta), sin(theta)) * radius;

		// Cardiac filament distance
		x = abs(length(o.xy) - (0.35 + cPulse)) - (0.008 + bAmp * 0.006);
		t += max(x, 0.003);

		float fi = float(i);
		float rW = 1.0 + cos(t * 0.5 + r * 0.5 + radius * 2.0);
		float env = 0.35 + sin(3.0 * t + r * 0.5) * 0.28;
		float den = glow + abs(x) * 380.0;
		vec3 fire = vec3(
			rW,
			rW * (0.2 + 0.1 * cos(t * 0.4)),
			rW * (0.05 + 0.03 * cos(t * 0.3 + 0.7))
		);
		O += fire * env / den;
	}

	gl_FragColor = vec4(O, 1.0);
}
