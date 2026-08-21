/*{
	"DESCRIPTION": "Kinetic Velocity — 3D vector speed streaks rushing past the screen for REVd cycling",
	"CREDIT": "REVd Cycling",
	"ISFVSN": "2",
	"CATEGORIES": [
		"Generator"
	],
	"INPUTS": [
		{ "NAME": "stage", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Stage" },
		{ "NAME": "bass", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Bass" },
		{ "NAME": "mid", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Mid" },
		{ "NAME": "high", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "High" },
		{ "NAME": "intensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 1.0, "LABEL": "Reactivity" },
		{ "NAME": "speed", "TYPE": "float", "DEFAULT": 2.0, "MIN": 0.0, "MAX": 5.0, "LABEL": "Sprint Speed" },
		{ "NAME": "streakDensity", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.1, "MAX": 1.5, "LABEL": "Streak Density" },
		{ "NAME": "glowFalloff", "TYPE": "float", "DEFAULT": 4.5, "MIN": 1.0, "MAX": 15.0, "LABEL": "Glow" }
	]
}*/

void main() {
	vec3 O = vec3(0.0);
	vec2 F = gl_FragCoord.xy;
	vec2 V = RENDERSIZE.xy;

	float si = smoothstep(0.0, 0.5, stage) * (1.0 - smoothstep(0.75, 1.0, stage));
	float r = TIME * speed * mix(0.4, 1.4, si);

	float bAmp = pow(max(bass, 0.0), 0.7) * intensity;
	float mAmp = pow(max(mid, 0.0),  0.7) * intensity;
	float hAmp = pow(max(high, 0.0), 0.7) * intensity;

	float glow = glowFalloff / (1.0 + bAmp * 3.0);
	float maxI = mix(25.0, 65.0, si) + mAmp * 15.0;

	float t = 0.1;
	float x = 0.0;

	for (int i = 0; i < 60; i++) {
		if (float(i) >= maxI) {
			break;
		}

		vec2 uv = (F + F - V);
		vec3 o = t * normalize(vec3(uv, V.y));

		// Wind turbulence drift
		o.x += sin(o.z * 3.0 + r) * mAmp * 0.15;

		// Z-repetition creating velocity streaks
		float seg = streakDensity * mix(0.25, 0.08, si);
		seg = max(seg, 0.03);
		o.z = mod(o.z + r * 2.0, seg) - seg * 0.5;

		// Elongated speed vector streaks (bass stretches length)
		float streakLen = 0.08 + bAmp * 0.12;
		x = length(max(abs(o.xy) - vec2(0.005, streakLen), 0.0)) - 0.002;
		t += max(x, 0.003);

		// High frequency spark trail
		float spark = sin(o.z * 40.0 + r * 15.0) * hAmp * 0.4;

		float fi = float(i);
		float rW = 1.0 + cos(t * 0.6 + r + fi * 0.04 + spark);
		float env = 0.35 + sin(3.0 * t + r * 5.0) * 0.28;
		float den = glow + abs(x) * 450.0;
		vec3 fire = vec3(
			rW,
			rW * (0.2 + 0.1 * cos(t * 0.4)),
			rW * (0.05 + 0.03 * cos(t * 0.3 + 0.6))
		);
		O += fire * env / den;
	}

	gl_FragColor = vec4(O, 1.0);
}
